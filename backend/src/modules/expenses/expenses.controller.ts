import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';
import { withAuditLog } from '../../utils/auditLog';
import { isAdminOrAbove } from '../../middleware/auth';
import { isToday, getISTDayBounds, toISTDateString } from '../../utils/time';
import {
  sendSuccess, sendCreated, sendNotFound, sendForbidden, sendConflict, sendError
} from '../../utils/response';

const EXP_SELECT = {
  id: true, amount: true, category: true, note: true,
  status: true, bankId: true, createdAt: true, updatedAt: true,
  user: { select: { id: true, name: true, username: true } },
  bank: { select: { id: true, name: true } },
};

export async function getExpenses(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { date, status, shop } = req.query;
    const isAdmin = isAdminOrAbove(req.user!, 'allRecords');
    const filterUserId = isAdmin ? (req.query.userId as string | undefined) : req.user!.userId;

    // Regular users can ONLY view today's expenses — ignore any date param they pass
    const targetDate = isAdmin
      ? ((date as string) || toISTDateString())
      : toISTDateString();
    const { start, end } = getISTDayBounds(targetDate);


    const expenses = await prisma.expense.findMany({
      where: {
        ...(filterUserId && { userId: filterUserId }),
        createdAt: { gte: start, lte: end },
        ...(status && { status: status as any }),
        shop: shop ? (shop as any) : { in: req.user!.shopAccess },
      },
      select: EXP_SELECT,
      orderBy: { createdAt: 'desc' },
    });

    sendSuccess(res, expenses, 200, { date: targetDate });
  } catch (err) { next(err); }
}

export async function createExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { amount, category, note, bankId, shop = 'SHOP_COMPUTER' } = req.body;
    const isAdmin = isAdminOrAbove(req.user!, 'allRecords');

    if (!req.user!.shopAccess.includes(shop as string)) {
      sendForbidden(res, 'You do not have access to this shop context');
      return;
    }

    // Admin/SuperAdmin expenses → APPROVED automatically, deduct from bank
    // User expenses → PENDING, no bank deduction yet
    const status = isAdmin ? 'APPROVED' : 'PENDING';

    // If admin is creating expense, bankId is required
    if (isAdmin && !bankId) {
      sendError(res, 'Please select which bank account to deduct this expense from', 400);
      return;
    }

    // Validate bank exists and has sufficient balance
    if (bankId) {
      const bank = await prisma.bankAccount.findUnique({ where: { id: bankId } });
      if (!bank) { sendError(res, 'Selected bank account not found', 400); return; }
      if (Number(bank.balance) < amount) {
        sendError(res, `Insufficient balance in ${bank.name}. Available: ₹${Number(bank.balance).toFixed(2)}`, 400);
        return;
      }
    }

    // Create expense and optionally deduct from bank in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: { userId: req.user!.userId, amount, category, note, status, bankId: isAdmin ? bankId : null, shop: shop as any },
        select: EXP_SELECT,
      });

      if (isAdmin && bankId) {
        await tx.bankAccount.update({
          where: { id: bankId },
          data: { balance: { decrement: amount } },
        });
      }

      return expense;
    });

    // Audit log for expense
    await prisma.log.create({
      data: {
        userId: req.user!.userId,
        action: 'CREATE',
        tableName: 'expenses',
        recordId: result.id,
        newValue: { amount, category, status, bankId: bankId || null } as any,
      },
    });

    // Additional audit log for bank deduction to show in Bank Activity
    if (isAdmin && bankId) {
      await prisma.log.create({
        data: {
          userId: req.user!.userId,
          action: 'UPDATE',
          tableName: 'bank_accounts',
          recordId: bankId,
          newValue: { action: 'EXPENSE_DEDUCTION', amount, category, expenseId: result.id } as any,
        }
      });
    }

    sendCreated(res, result, `Expense recorded (${status.toLowerCase()})`);
  } catch (err) { next(err); }
}

export async function updateExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { updatedAt, amount, category, note } = req.body;

    const existing = await prisma.expense.findUnique({ where: { id: req.params.id } });
    if (!existing) { sendNotFound(res, 'Expense'); return; }

    if (new Date(existing.updatedAt).toISOString() !== new Date(updatedAt).toISOString()) {
      sendConflict(res, 'This record was modified by another user. Please refresh and try again.');
      return;
    }

    if (!isToday(existing.createdAt) && req.user!.role !== 'SUPER_ADMIN') {
      sendForbidden(res, 'Only today\'s expenses can be edited');
      return;
    }

    if (req.user!.role !== 'SUPER_ADMIN' && existing.userId !== req.user!.userId) {
      sendForbidden(res, 'You can only edit your own expenses. Please contact a Super Admin to edit others.');
      return;
    }

    const updated = await withAuditLog(
      prisma, req.user!.userId, 'UPDATE', 'expenses',
      (e) => e.id,
      { amount: existing.amount, category: existing.category, note: existing.note },
      (e) => ({ amount: e.amount, category: e.category, note: e.note }),
      (tx) => tx.expense.update({
        where: { id: req.params.id },
        data: {
          ...req.body,
          ...(!isAdminOrAbove(req.user!, 'allRecords') && { status: 'PENDING' }),
        },
        select: EXP_SELECT,
      })
    );

    sendSuccess(res, updated, 200, undefined, 'Expense updated');
  } catch (err) { next(err); }
}

export async function approveExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, bankId } = req.body as { status: 'APPROVED' | 'REJECTED'; bankId?: string };
    const existing = await prisma.expense.findUnique({ where: { id: req.params.id } });
    if (!existing) { sendNotFound(res, 'Expense'); return; }

    // When approving, validate bank
    if (status === 'APPROVED') {
      if (!bankId) {
        sendError(res, 'Please select which bank account to deduct this expense from', 400);
        return;
      }
      const bank = await prisma.bankAccount.findUnique({ where: { id: bankId } });
      if (!bank) { sendError(res, 'Selected bank account not found', 400); return; }
      if (Number(bank.balance) < Number(existing.amount)) {
        sendError(res, `Insufficient balance in ${bank.name}. Available: ₹${Number(bank.balance).toFixed(2)}`, 400);
        return;
      }
    }

    // Update expense and deduct from bank in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.expense.update({
        where: { id: req.params.id },
        data: {
          status,
          ...(status === 'APPROVED' && bankId ? { bankId } : {}),
        },
        select: EXP_SELECT,
      });

      if (status === 'APPROVED' && bankId) {
        await tx.bankAccount.update({
          where: { id: bankId },
          data: { balance: { decrement: Number(existing.amount) } },
        });
      }

      return updated;
    });

    // Audit log for expense
    await prisma.log.create({
      data: {
        userId: req.user!.userId,
        action: 'UPDATE',
        tableName: 'expenses',
        recordId: result.id,
        oldValue: { status: existing.status } as any,
        newValue: { status, bankId: bankId || null } as any,
      },
    });

    // Additional audit log for bank deduction
    if (status === 'APPROVED' && bankId) {
      await prisma.log.create({
        data: {
          userId: req.user!.userId,
          action: 'UPDATE',
          tableName: 'bank_accounts',
          recordId: bankId,
          newValue: { action: 'EXPENSE_DEDUCTION', amount: existing.amount, category: existing.category, expenseId: result.id } as any,
        }
      });
    }

    sendSuccess(res, result, 200, undefined, `Expense ${status.toLowerCase()}`);
  } catch (err) { next(err); }
}

export async function deleteExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const existing = await prisma.expense.findUnique({ where: { id: req.params.id } });
    if (!existing) { sendNotFound(res, 'Expense'); return; }

    if (req.user!.role !== 'SUPER_ADMIN') {
      sendForbidden(res, 'Only Super Admins can delete expenses');
      return;
    }

    await withAuditLog(
      prisma, req.user!.userId, 'DELETE', 'expenses',
      () => req.params.id,
      { amount: existing.amount, category: existing.category, status: existing.status },
      () => null,
      (tx) => tx.expense.delete({ where: { id: req.params.id } })
    );

    sendSuccess(res, null, 200, undefined, 'Expense deleted');
  } catch (err) { next(err); }
}

