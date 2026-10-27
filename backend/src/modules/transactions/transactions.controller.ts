import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';
import { withAuditLog } from '../../utils/auditLog';
import { hasPermission, isAdminOrAbove, isSuperAdmin } from '../../middleware/auth';
import { isToday, getISTDayBounds } from '../../utils/time';
import { canAccessShop, getShopFilter } from '../../utils/shop';
import {
  sendSuccess, sendCreated, sendNotFound,
  sendForbidden, sendConflict, HttpError
} from '../../utils/response';

const TX_SELECT = {
  id: true, quantity: true, unitPrice: true, totalPrice: true,
  paymentMethod: true, notes: true, createdAt: true, updatedAt: true, shop: true,
  user: { select: { id: true, name: true, username: true } },
  service: { select: { id: true, name: true, category: true } },
};

/** The "Others" quick entry is the only service any user may create on the fly. */
const QUICK_ENTRY_SERVICE = 'Others';

const CONFLICT_MESSAGE = 'This record was modified by another user. Please refresh and try again.';

export async function getTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { date, userId: queryUserId, paymentMethod, shop, page = '1', limit = '50' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 50));
    const skip = (pageNum - 1) * limitNum;

    const shopFilter = getShopFilter(req.user!, shop);
    if (!shopFilter) { sendForbidden(res, 'You do not have access to this shop'); return; }

    // USERs can only see their own; ADMIN+ can see all or filter by userId
    const isAdmin = isAdminOrAbove(req.user!, 'allRecords');
    const filterUserId = isAdmin
      ? (queryUserId as string | undefined)
      : req.user!.userId;

    const targetDate = (date as string);
    let dateFilter = {};
    if (targetDate) {
      const { start, end } = getISTDayBounds(targetDate);
      dateFilter = { createdAt: { gte: start, lte: end } };
    }

    const where: any = {
      ...(filterUserId && { userId: filterUserId }),
      ...dateFilter,
      ...(paymentMethod && { paymentMethod }),
      shop: shopFilter,
    };

    const [transactions, total, sumAgg] = await Promise.all([
      prisma.transaction.findMany({
        where,
        select: TX_SELECT,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.transaction.count({ where }),
      prisma.transaction.aggregate({ where, _sum: { totalPrice: true } })
    ]);

    const totalSum = Number(sumAgg._sum.totalPrice ?? 0);
    sendSuccess(res, transactions, 200, { total, page: pageNum, limit: limitNum, date: targetDate, totalSum });
  } catch (err) { next(err); }
}

export async function createTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { serviceId, serviceName, quantity, notes, unitPrice: customUnitPrice, paymentMethod, shop = 'SHOP_COMPUTER' } = req.body as {
      serviceId?: string; serviceName?: string; quantity: number; notes?: string; unitPrice?: number; paymentMethod: 'CASH' | 'ONLINE' | 'OTHER' | 'SHOP_XEROX'; shop?: 'SHOP_COMPUTER' | 'SHOP_XEROX';
    };

    if (!canAccessShop(req.user!, shop)) {
      sendForbidden(res, 'You do not have access to this shop context');
      return;
    }

    let service;
    if (serviceId) {
      service = await prisma.service.findUnique({ where: { id: serviceId } });
    } else if (serviceName) {
      const name = serviceName.trim();
      const mayCreate = name === QUICK_ENTRY_SERVICE || hasPermission(req.user!, 'services', 'write');
      service = await prisma.service.findFirst({ where: { name } });
      if (!service && mayCreate) {
        service = await prisma.service.create({
          data: { name, category: 'OTHER', price: customUnitPrice || 0, isActive: true, shop }
        });
      } else if (service && !service.isActive && mayCreate) {
        // Auto-activate if it exists but is inactive, so Quick Entries don't fail
        service = await prisma.service.update({
          where: { id: service.id },
          data: { isActive: true }
        });
      }
    }

    if (!service || !service.isActive) {
      sendNotFound(res, 'Service');
      return;
    }

    const unitPrice = customUnitPrice !== undefined ? Number(customUnitPrice) : Number(service.price);
    const totalPrice = unitPrice * quantity;

    const transaction = await withAuditLog(
      prisma, req.user!.userId, 'CREATE', 'transactions',
      (t) => t.id, null,
      (t) => ({ serviceId: t.service?.id, quantity: t.quantity, totalPrice: t.totalPrice }),
      (tx) => tx.transaction.create({
        data: {
          userId: req.user!.userId,
          serviceId: service.id,
          quantity,
          unitPrice,
          totalPrice,
          paymentMethod,
          shop,
          notes,
        },
        select: TX_SELECT,
      })
    );

    sendCreated(res, transaction, 'Transaction recorded');
  } catch (err) { next(err); }
}

export async function updateTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { updatedAt, quantity, notes } = req.body as {
      updatedAt: string; quantity?: number; notes?: string;
    };

    const existing = await prisma.transaction.findUnique({
      where: { id: req.params.id },
      include: { service: true },
    });

    if (!existing || !canAccessShop(req.user!, existing.shop)) { sendNotFound(res, 'Transaction'); return; }

    // Fix #2: Optimistic locking — check updatedAt matches (fast path; the update below re-checks atomically)
    if (new Date(existing.updatedAt).toISOString() !== new Date(updatedAt).toISOString()) {
      sendConflict(res, CONFLICT_MESSAGE);
      return;
    }

    // Fix #4 (today-guard): Only allow edits to today's records (Super Admin can bypass)
    if (!isToday(existing.createdAt) && !isSuperAdmin(req.user!.role)) {
      sendForbidden(res, 'Only today\'s records can be edited (or use Super Admin override)');
      return;
    }

    if (existing.userId !== req.user!.userId && !hasPermission(req.user!, 'allRecords', 'write')) {
      sendForbidden(res, 'You can only edit your own transactions.');
      return;
    }

    const newQuantity = quantity ?? existing.quantity;
    const newTotal = Number(existing.unitPrice) * newQuantity;

    const updated = await withAuditLog(
      prisma, req.user!.userId, 'UPDATE', 'transactions',
      (t) => t.id,
      { quantity: existing.quantity, notes: existing.notes, totalPrice: existing.totalPrice },
      (t) => ({ quantity: t.quantity, notes: t.notes, totalPrice: t.totalPrice }),
      async (tx) => {
        const { count } = await tx.transaction.updateMany({
          where: { id: existing.id, updatedAt: existing.updatedAt },
          data: { quantity: newQuantity, totalPrice: newTotal, ...(notes !== undefined && { notes }) },
        });
        if (count === 0) throw new HttpError(409, CONFLICT_MESSAGE);
        return tx.transaction.findUniqueOrThrow({ where: { id: existing.id }, select: TX_SELECT });
      }
    );

    sendSuccess(res, updated, 200, undefined, 'Transaction updated');
  } catch (err) { next(err); }
}

export async function deleteTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const existing = await prisma.transaction.findUnique({ where: { id: req.params.id } });
    if (!existing || !canAccessShop(req.user!, existing.shop)) { sendNotFound(res, 'Transaction'); return; }

    if (!isToday(existing.createdAt) && !isSuperAdmin(req.user!.role)) {
      sendForbidden(res, 'Only today\'s records can be deleted (or use Super Admin override)');
      return;
    }

    if (existing.userId !== req.user!.userId && !hasPermission(req.user!, 'allRecords', 'write')) {
      sendForbidden(res, 'You can only delete your own transactions.');
      return;
    }

    await withAuditLog(
      prisma, req.user!.userId, 'DELETE', 'transactions',
      () => req.params.id,
      { userId: existing.userId, serviceId: existing.serviceId, totalPrice: existing.totalPrice },
      () => null,
      (tx) => tx.transaction.delete({ where: { id: req.params.id } })
    );

    sendSuccess(res, null, 200, undefined, 'Transaction deleted');
  } catch (err) { next(err); }
}
