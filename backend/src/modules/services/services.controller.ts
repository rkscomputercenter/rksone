import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';
import { withAuditLog } from '../../utils/auditLog';
import { sendSuccess, sendCreated, sendNotFound, sendError } from '../../utils/response';

export async function getAllServices(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { category, active, shop } = req.query;

    const services = await prisma.service.findMany({
      where: {
        ...(category && { category: category as any }),
        ...(active !== undefined && { isActive: active === 'true' }),
        shop: shop ? (shop as any) : { in: req.user!.shopAccess },
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    sendSuccess(res, services);
  } catch (err) { next(err); }
}

export async function createService(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const service = await withAuditLog(
      prisma, req.user!.userId, 'CREATE', 'services',
      (s) => s.id, null,
      (s) => ({ name: s.name, category: s.category, price: s.price }),
      (tx) => tx.service.create({ data: req.body })
    );
    sendCreated(res, service, 'Service created');
  } catch (err) { next(err); }
}

export async function updateService(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const existing = await prisma.service.findUnique({ where: { id: req.params.id } });
    if (!existing) { sendNotFound(res, 'Service'); return; }

    const updated = await withAuditLog(
      prisma, req.user!.userId, 'UPDATE', 'services',
      (s) => s.id,
      { name: existing.name, category: existing.category, price: existing.price, isActive: existing.isActive },
      (s) => ({ name: s.name, category: s.category, price: s.price, isActive: s.isActive }),
      (tx) => tx.service.update({ where: { id: req.params.id }, data: req.body })
    );

    sendSuccess(res, updated, 200, undefined, 'Service updated');
  } catch (err) { next(err); }
}

export async function deleteService(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const existing = await prisma.service.findUnique({ where: { id: req.params.id } });
    if (!existing) { sendNotFound(res, 'Service'); return; }

    // Check if service has transactions — soft delete instead
    const txCount = await prisma.transaction.count({ where: { serviceId: req.params.id } });
    if (txCount > 0) {
      sendError(res, `Cannot delete service with ${txCount} existing transactions. Deactivate it instead.`, 409);
      return;
    }

    await withAuditLog(
      prisma, req.user!.userId, 'DELETE', 'services',
      () => req.params.id,
      { name: existing.name, category: existing.category, price: existing.price },
      () => null,
      (tx) => tx.service.delete({ where: { id: req.params.id } })
    );

    sendSuccess(res, null, 200, undefined, 'Service deleted');
  } catch (err) { next(err); }
}
