import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { writeAuditLog } from '../../utils/auditLog';
import { isAdminOrAbove } from '../../middleware/auth';
import { isToday, getISTDayBounds, toISTDateString } from '../../utils/time';
import { canAccessShop, getShopFilter } from '../../utils/shop';
import {
  sendSuccess, sendCreated, sendNotFound, sendForbidden, sendConflict, sendError, HttpError
} from '../../utils/response';

const EXP_SELECT = {
  id: true, amount: true, category: true, note: true,
  status: true, bankId: true, createdAt: true, updatedAt: true, shop: true,
  user: { select: { id: true, name: true, username: true } },
  bank: { select: { id: true, name: true } },
};

const CONFLICT_MESSAGE = 'This record was modified by another user. Please refresh and try again.';

/** Rupee amounts as JS numbers: round to paise so 10.1 - 10 is 0.1, not 0.0999…. */
const toRupees = (n: number) => Math.round(n * 100) / 100;

/**
 * Deducts `amount` from a bank only if the balance covers it (single conditional UPDATE,
 * so two concurrent deductions can never overdraw). Writes the Bank Activity audit row.
 */
async function deductFromBank(
  tx: Prisma.TransactionClient, bankId: string, amount: number, actorId: string,
  meta: { category: string; expenseId: string }
): Promise<void> {
  const { count } = await tx.bankAccount.updateMany({
    where: { id: bankId, balance: { gte: amount } },
    data: { balance: { decrement: amount } },
  });
  if (count === 0) {
    const bank = await tx.bankAccount.findUnique({ where: { id: bankId } });
    if (!bank) throw new HttpError(400, 'Selected bank account not found');
    throw new HttpError(400, `Insufficient balance in ${bank.name}. Available: ₹${Number(bank.balance).toFixed(2)}`);
  }
  await writeAuditLog(tx, actorId, 'UPDATE', 'bank_accounts', bankId, null,
    { action: 'EXPENSE_DEDUCTION', amount, ...meta });
}

/** Puts money back into the bank an approved expense was deducted from. */
async function refundToBank(
  tx: Prisma.TransactionClient, bankId: string, amount: number, actorId: string,
  meta: { category: string; expenseId: string; reason: string }
): Promise<void> {
  const { count } = await tx.bankAccount.updateMany({
    where: { id: bankId },
    data: { balance: { increment: amount } },
  });
  if (count === 0) return; // bank account was deleted; nothing to refund into
  await writeAuditLog(tx, actorId, 'UPDATE', 'bank_accounts', bankId, null,
    { action: 'EXPENSE_REFUND', amount, ...meta });
}

export async function getExpenses(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { date, status, shop } = req.query;
    const shopFilter = getShopFilter(req.user!, shop);
    if (!shopFilter) { sendForbidden(res, 'You do not have access to this shop'); return; }

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
        shop: shopFilter,
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
    const actorId = req.user!.userId;

    if (!canAccessShop(req.user!, shop)) {
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

    if (isAdmin) {
      const bank = await prisma.bankAccount.findUnique({ where: { id: bankId } });
      if (!bank) { sendError(res, 'Selected bank account not found', 400); return; }
    }

    // Expense, bank deduction and both audit rows commit together or not at all
    const result = await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: { userId: actorId, amount, category, note, status, bankId: isAdmin ? bankId : null, shop },
        select: EXP_SELECT,
      });
      await writeAuditLog(tx, actorId, 'CREATE', 'expenses', expense.id, null,
        { amount, category, status, bankId: isAdmin ? bankId : null });

      if (isAdmin) {
        await deductFromBank(tx, bankId, amount, actorId, { category, expenseId: expense.id });
      }
      return expense;
    });

    sendCreated(res, result, `Expense recorded (${status.toLowerCase()})`);
  } catch (err) { next(err); }
}

export async function updateExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Only these fields are editable; anything else in the body (shop, status, bankId…) is ignored
    const { updatedAt, amount, category, note } = req.body as {
      updatedAt: string; amount?: number; category?: string; note?: string;
    };
    const actorId = req.user!.userId;

    const existing = await prisma.expense.findUnique({ where: { id: req.params.id } });
    if (!existing || !canAccessShop(req.user!, existing.shop)) { sendNotFound(res, 'Expense'); return; }

    if (new Date(existing.updatedAt).toISOString() !== new Date(updatedAt).toISOString()) {
      sendConflict(res, CONFLICT_MESSAGE);
      return;
    }

    if (!isToday(existing.createdAt) && req.user!.role !== 'SUPER_ADMIN') {
      sendForbidden(res, 'Only today\'s expenses can be edited');
      return;
    }

    if (req.user!.role !== 'SUPER_ADMIN' && existing.userId !== actorId) {
      sendForbidden(res, 'You can only edit your own expenses. Please contact a Super Admin to edit others.');
      return;
    }

    const isAdmin = isAdminOrAbove(req.user!, 'allRecords');
    const oldAmount = Number(existing.amount);
    const newAmount = amount ?? oldAmount;
    const deductedBankId = existing.status === 'APPROVED' ? existing.bankId : null;

    const updated = await prisma.$transaction(async (tx) => {
      const { count } = await tx.expense.updateMany({
        where: { id: existing.id, updatedAt: existing.updatedAt },
        data: {
          ...(amount !== undefined && { amount }),
          ...(category !== undefined && { category }),
          ...(note !== undefined && { note }),
          // Non-admin edits go back for approval, so any earlier deduction is returned
          ...(!isAdmin && { status: 'PENDING', bankId: null }),
        },
      });
      if (count === 0) throw new HttpError(409, CONFLICT_MESSAGE);

      if (deductedBankId) {
        const meta = { category: category ?? existing.category, expenseId: existing.id };
        if (!isAdmin) {
          await refundToBank(tx, deductedBankId, oldAmount, actorId, { ...meta, reason: 'EDITED_BACK_TO_PENDING' });
        } else {
          const delta = toRupees(newAmount - oldAmount);
          if (delta > 0) await deductFromBank(tx, deductedBankId, delta, actorId, meta);
          if (delta < 0) await refundToBank(tx, deductedBankId, -delta, actorId, { ...meta, reason: 'AMOUNT_REDUCED' });
        }
      }

      const after = await tx.expense.findUniqueOrThrow({ where: { id: existing.id }, select: EXP_SELECT });
      await writeAuditLog(tx, actorId, 'UPDATE', 'expenses', existing.id,
        { amount: existing.amount, category: existing.category, note: existing.note, status: existing.status },
        { amount: after.amount, category: after.category, note: after.note, status: after.status });
      return after;
    });

    sendSuccess(res, updated, 200, undefined, 'Expense updated');
  } catch (err) { next(err); }
}

export async function approveExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, bankId } = req.body as { status: 'APPROVED' | 'REJECTED'; bankId?: string };
    const actorId = req.user!.userId;

    const existing = await prisma.expense.findUnique({ where: { id: req.params.id } });
    if (!existing || !canAccessShop(req.user!, existing.shop)) { sendNotFound(res, 'Expense'); return; }

    if (existing.status === status) {
      sendConflict(res, `This expense is already ${status.toLowerCase()}.`);
      return;
    }

    if (status === 'APPROVED') {
      if (!bankId) {
        sendError(res, 'Please select which bank account to deduct this expense from', 400);
        return;
      }
      const bank = await prisma.bankAccount.findUnique({ where: { id: bankId } });
      if (!bank) { sendError(res, 'Selected bank account not found', 400); return; }
    }

    const amount = Number(existing.amount);
    const meta = { category: existing.category, expenseId: existing.id };

    const result = await prisma.$transaction(async (tx) => {
      // Status in the WHERE makes approval single-shot: a second, concurrent approve matches 0 rows
      const { count } = await tx.expense.updateMany({
        where: { id: existing.id, status: existing.status },
        data: { status, bankId: status === 'APPROVED' ? bankId : null },
      });
      if (count === 0) throw new HttpError(409, 'This expense was just reviewed by someone else. Please refresh.');

      if (status === 'APPROVED') {
        await deductFromBank(tx, bankId!, amount, actorId, meta);
      } else if (existing.status === 'APPROVED' && existing.bankId) {
        await refundToBank(tx, existing.bankId, amount, actorId, { ...meta, reason: 'REJECTED_AFTER_APPROVAL' });
      }

      await writeAuditLog(tx, actorId, 'UPDATE', 'expenses', existing.id,
        { status: existing.status, bankId: existing.bankId },
        { status, bankId: status === 'APPROVED' ? bankId : null });

      return tx.expense.findUniqueOrThrow({ where: { id: existing.id }, select: EXP_SELECT });
    });

    sendSuccess(res, result, 200, undefined, `Expense ${status.toLowerCase()}`);
  } catch (err) { next(err); }
}

export async function deleteExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const existing = await prisma.expense.findUnique({ where: { id: req.params.id } });
    if (!existing || !canAccessShop(req.user!, existing.shop)) { sendNotFound(res, 'Expense'); return; }

    if (req.user!.role !== 'SUPER_ADMIN') {
      sendForbidden(res, 'Only Super Admins can delete expenses');
      return;
    }

    const actorId = req.user!.userId;
    await prisma.$transaction(async (tx) => {
      const { count } = await tx.expense.deleteMany({ where: { id: existing.id, status: existing.status } });
      if (count === 0) throw new HttpError(409, CONFLICT_MESSAGE);

      if (existing.status === 'APPROVED' && existing.bankId) {
        await refundToBank(tx, existing.bankId, Number(existing.amount), actorId,
          { category: existing.category, expenseId: existing.id, reason: 'EXPENSE_DELETED' });
      }

      await writeAuditLog(tx, actorId, 'DELETE', 'expenses', existing.id,
        { amount: existing.amount, category: existing.category, status: existing.status, bankId: existing.bankId },
        null);
    });

    sendSuccess(res, null, 200, undefined, 'Expense deleted');
  } catch (err) { next(err); }
}
