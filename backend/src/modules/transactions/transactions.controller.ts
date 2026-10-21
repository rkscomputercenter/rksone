import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';
import { withAuditLog } from '../../utils/auditLog';
import { isAdminOrAbove, isSuperAdmin } from '../../middleware/auth';
import { isToday, getISTDayBounds, toISTDateString } from '../../utils/time';
import {
  sendSuccess, sendCreated, sendNotFound, sendError,
  sendForbidden, sendConflict
} from '../../utils/response';

const TX_SELECT = {
  id: true, quantity: true, unitPrice: true, totalPrice: true,
  paymentMethod: true, notes: true, createdAt: true, updatedAt: true, shop: true,
  user: { select: { id: true, name: true, username: true } },
  service: { select: { id: true, name: true, category: true } },
};

export async function getTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { date, userId: queryUserId, paymentMethod, shop, page = '1', limit = '50' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

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
      shop: shop ? shop : { in: req.user!.shopAccess },
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

    let service;
    if (serviceId) {
      service = await prisma.service.findUnique({ where: { id: serviceId } });
    } else if (serviceName) {
      service = await prisma.service.findFirst({ where: { name: serviceName } });
      if (!service) {
        service = await prisma.service.create({
          data: { name: serviceName, category: 'OTHER', price: customUnitPrice || 0, isActive: true }
        });
      } else if (!service.isActive) {
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

    if (!req.user!.shopAccess.includes(shop as string)) {
      sendForbidden(res, 'You do not have access to this shop context');
      return;
    }

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

    if (!existing) { sendNotFound(res, 'Transaction'); return; }

    // Fix #2: Optimistic locking — check updatedAt matches
    if (new Date(existing.updatedAt).toISOString() !== new Date(updatedAt).toISOString()) {
      sendConflict(res, 'This record was modified by another user. Please refresh and try again.');
      return;
    }

    // Fix #4 (today-guard): Only allow edits to today's records (Super Admin can bypass)
    if (!isToday(existing.createdAt) && !isSuperAdmin(req.user!.role)) {
      sendForbidden(res, 'Only today\'s records can be edited (or use Super Admin override)');
      return;
    }

    if (existing.userId !== req.user!.userId && !isAdminOrAbove(req.user!, 'allRecords')) {
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
      (tx) => tx.transaction.update({
        where: { id: req.params.id },
        data: { quantity: newQuantity, totalPrice: newTotal, ...(notes !== undefined && { notes }) },
        select: TX_SELECT,
      })
    );

    sendSuccess(res, updated, 200, undefined, 'Transaction updated');
  } catch (err) { next(err); }
}

export async function deleteTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const existing = await prisma.transaction.findUnique({ where: { id: req.params.id } });
    if (!existing) { sendNotFound(res, 'Transaction'); return; }

    if (!isToday(existing.createdAt) && !isSuperAdmin(req.user!.role)) {
      sendForbidden(res, 'Only today\'s records can be deleted (or use Super Admin override)');
      return;
    }

    if (existing.userId !== req.user!.userId && !isAdminOrAbove(req.user!, 'allRecords')) {
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
