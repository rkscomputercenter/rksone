import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { sendSuccess } from '../../utils/response';

export async function getLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      page = '1', limit = '50',
      userId, action, tableName, date
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(200, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    // Date filtering logic
    let dateFilter = {};
    if (date) {
      const { start, end } = require('../../utils/time').getISTDayBounds(date as string);
      dateFilter = { createdAt: { gte: start, lte: end } };
    }

    const where = {
      ...(userId && { userId: userId as string }),
      ...(action && { action: (action as string).includes(',') ? { in: (action as string).split(',') } : action as any }),
      ...(tableName && { tableName: tableName as string }),
      ...dateFilter,
    };

    const [logs, total] = await Promise.all([
      prisma.log.findMany({
        where,
        include: { user: { select: { name: true, username: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.log.count({ where }),
    ]);

    sendSuccess(res, logs, 200, { total, page: pageNum, limit: limitNum });
  } catch (err) { next(err); }
}

export async function cleanupLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const retentionDays = env.LOG_RETENTION_DAYS;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await prisma.log.deleteMany({
      where: { createdAt: { lt: cutoffDate } },
    });

    sendSuccess(res, { deletedCount: result.count }, 200, undefined,
      `Deleted ${result.count} logs older than ${retentionDays} days`);
  } catch (err) { next(err); }
}
