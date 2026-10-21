import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';
import { withAuditLog } from '../../utils/auditLog';
import { sendSuccess, sendCreated, sendNotFound, sendError } from '../../utils/response';

const BANK_SELECT = {
  id: true,
  name: true,
  balance: true,
  isCash: true,
  createdAt: true,
  updatedAt: true,
};

export async function getBanks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const banks = await prisma.bankAccount.findMany({
      select: BANK_SELECT,
      orderBy: [{ isCash: 'asc' }, { name: 'asc' }],
    });
    sendSuccess(res, banks);
  } catch (err) { next(err); }
}

export async function getBankAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { date, action } = req.query;
    const { start, end } = date ?
      require('../../utils/time').getISTDayBounds(date as string) :
      { start: undefined, end: undefined };

    const banks = await prisma.bankAccount.findMany({
      select: {
        ...BANK_SELECT,
        expenses: {
          where: {
            status: 'APPROVED',
            bankId: { not: null },
            ...(start && { createdAt: { gte: start, lte: end } })
          },
          select: {
            id: true, amount: true, category: true, note: true, createdAt: true,
            user: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: date ? 50 : 10,
        },
        _count: {
          select: { expenses: { where: { status: 'APPROVED' } } }
        },
      },
      orderBy: [{ isCash: 'asc' }, { name: 'asc' }],
    });

    const analytics = await Promise.all(banks.map(async (bank) => {
      const [total, logs, autoTxs] = await Promise.all([
        prisma.expense.aggregate({
          where: { bankId: bank.id, status: 'APPROVED' },
          _sum: { amount: true },
        }),
        prisma.log.findMany({
          where: {
            tableName: 'bank_accounts',
            recordId: bank.id,
            ...(start && { createdAt: { gte: start, lte: end } }),
            ...(action && action !== 'EXPENSE' && { action: action as any }),
          },
          select: {
            id: true, action: true, newValue: true, oldValue: true, createdAt: true,
            user: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: date ? 50 : 10,
        }),
        prisma.autoTransaction.findMany({
          where: {
            bankName: bank.name,
            ...(start && { date: { gte: start, lte: end } })
          },
          select: {
            id: true, type: true, amount: true, createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: date ? 50 : 10,
        })
      ]);

      const formattedAutoTxs = autoTxs.map(tx => ({
        id: tx.id,
        action: 'AUTO_TRANS',
        newValue: { action: tx.type, amount: Number(tx.amount) },
        createdAt: tx.createdAt,
        user: { name: 'SYSTEM_AUTO' }
      }));

      const combinedLogs = [...logs, ...formattedAutoTxs]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, date ? 50 : 10);

      return {
        ...bank,
        totalDeducted: Number(total._sum.amount ?? 0),
        logs: combinedLogs,
      };
    }));

    sendSuccess(res, analytics);
  } catch (err) { next(err); }
}

export async function createBank(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, balance = 0, isCash = false } = req.body;

    const existing = await prisma.bankAccount.findUnique({ where: { name } });
    if (existing) { sendError(res, 'A bank account with this name already exists', 409); return; }

    const bank = await prisma.$transaction(async (tx) => {
      const created = await tx.bankAccount.create({
        data: { name, balance, isCash },
        select: BANK_SELECT,
      });
      await tx.log.create({
        data: {
          userId: req.user!.userId,
          action: 'CREATE',
          tableName: 'bank_accounts',
          recordId: created.id,
          oldValue: null as any,
          newValue: { name, balance, isCash } as any,
        },
      });
      return created;
    });

    sendCreated(res, bank, `${isCash ? 'Cash account' : 'Bank'} '${name}' created`);
  } catch (err) { next(err); }
}

export async function renameBank(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const bank = await prisma.bankAccount.findUnique({ where: { id } });
    if (!bank) { sendNotFound(res, 'Bank'); return; }

    const existing = await prisma.bankAccount.findFirst({ where: { name, NOT: { id } } });
    if (existing) { sendError(res, 'A bank account with this name already exists', 409); return; }

    const updated = await withAuditLog(
      prisma, req.user!.userId, 'UPDATE', 'bank_accounts',
      (b) => b.id,
      { name: bank.name, action: 'RENAME' },
      (b) => ({ name: b.name }),
      (tx) => tx.bankAccount.update({
        where: { id },
        data: { name },
        select: BANK_SELECT,
      })
    );

    sendSuccess(res, updated, 200, undefined, `Bank renamed to '${name}'`);
  } catch (err) { next(err); }
}

export async function depositToBank(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { amount, note } = req.body;

    const bank = await prisma.bankAccount.findUnique({ where: { id } });
    if (!bank) { sendNotFound(res, 'Bank'); return; }

    const updated = await withAuditLog(
      prisma, req.user!.userId, 'UPDATE', 'bank_accounts',
      (b) => b.id,
      { balance: Number(bank.balance), action: 'DEPOSIT', amount, note },
      (b) => ({ balance: Number(b.balance) }),
      (tx) => tx.bankAccount.update({
        where: { id },
        data: { balance: { increment: amount } },
        select: BANK_SELECT,
      })
    );

    sendSuccess(res, updated, 200, undefined, `₹${amount} deposited to ${bank.name}`);
  } catch (err) { next(err); }
}

export async function adjustBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { amount, note } = req.body; // amount can be positive or negative

    const bank = await prisma.bankAccount.findUnique({ where: { id } });
    if (!bank) { sendNotFound(res, 'Bank'); return; }

    const newBalance = Number(bank.balance) + amount;
    if (newBalance < 0) {
      sendError(res, `Cannot adjust: balance would become negative (₹${newBalance.toFixed(2)})`, 400);
      return;
    }

    const updated = await withAuditLog(
      prisma, req.user!.userId, 'UPDATE', 'bank_accounts',
      (b) => b.id,
      { balance: Number(bank.balance), action: amount >= 0 ? 'ADJUST_UP' : 'ADJUST_DOWN', amount, note },
      (b) => ({ balance: Number(b.balance) }),
      (tx) => tx.bankAccount.update({
        where: { id },
        data: { balance: newBalance },
        select: BANK_SELECT,
      })
    );

    sendSuccess(res, updated, 200, undefined, `${bank.name} balance adjusted by ₹${amount >= 0 ? '+' : ''}${amount}`);
  } catch (err) { next(err); }
}

export async function setBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { balance, note } = req.body;

    const bank = await prisma.bankAccount.findUnique({ where: { id } });
    if (!bank) { sendNotFound(res, 'Bank'); return; }

    if (balance < 0) {
      sendError(res, 'Balance cannot be negative', 400);
      return;
    }

    const updated = await withAuditLog(
      prisma, req.user!.userId, 'UPDATE', 'bank_accounts',
      (b) => b.id,
      { balance: Number(bank.balance), action: 'SET_BALANCE', note },
      (b) => ({ balance: Number(b.balance) }),
      (tx) => tx.bankAccount.update({
        where: { id },
        data: { balance },
        select: BANK_SELECT,
      })
    );

    sendSuccess(res, updated, 200, undefined, `${bank.name} balance set to ₹${balance}`);
  } catch (err) { next(err); }
}

export async function hardResetBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { note } = req.body;

    const bank = await prisma.bankAccount.findUnique({ where: { id } });
    if (!bank) { sendNotFound(res, 'Bank'); return; }

    const updated = await withAuditLog(
      prisma, req.user!.userId, 'UPDATE', 'bank_accounts',
      (b) => b.id,
      { balance: Number(bank.balance), action: 'HARD_RESET', note },
      (b) => ({ balance: Number(b.balance) }),
      (tx) => tx.bankAccount.update({
        where: { id },
        data: { balance: 0 },
        select: BANK_SELECT,
      })
    );

    sendSuccess(res, updated, 200, undefined, `${bank.name} balance hard reset to ₹0.00`);
  } catch (err) { next(err); }
}

export async function deleteBank(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const bank = await prisma.bankAccount.findUnique({
      where: { id },
      include: { _count: { select: { expenses: true } } },
    });
    if (!bank) { sendNotFound(res, 'Bank'); return; }

    if (bank._count.expenses > 0) {
      sendError(res, `Cannot delete: ${bank.name} has ${bank._count.expenses} expense records linked to it`, 409);
      return;
    }

    await withAuditLog(
      prisma, req.user!.userId, 'DELETE', 'bank_accounts',
      () => id,
      { name: bank.name, balance: Number(bank.balance), isCash: bank.isCash },
      () => null,
      (tx) => tx.bankAccount.delete({ where: { id } })
    );

    sendSuccess(res, null, 200, undefined, `${bank.name} deleted`);
  } catch (err) { next(err); }
}
