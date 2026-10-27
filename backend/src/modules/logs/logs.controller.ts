import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { hasPermission } from '../../middleware/auth';
import { sendSuccess } from '../../utils/response';
import { getISTDayBounds } from '../../utils/time';

/** What a role that may view all records (but not the system logs) can see in the logs. */
const RECORD_TABLES = ['transactions', 'expenses'];

export async function getLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      page = '1', limit = '50',
      userId, action, tableName, date, details
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(200, Math.max(1, parseInt(limit as string) || 50));
    const skip = (pageNum - 1) * limitNum;

    // Date filtering logic
    let dateFilter = {};
    if (date) {
      const { start, end } = getISTDayBounds(date as string);
      dateFilter = { createdAt: { gte: start, lte: end } };
    }

    // Someone who may see all records but not the system logs only sees the records' own history
    const systemLogs = hasPermission(req.user!, 'salaryLogs', 'read');
    if (!systemLogs && tableName && !RECORD_TABLES.includes(tableName as string)) {
      sendSuccess(res, [], 200, { total: 0, page: pageNum, limit: limitNum });
      return;
    }

    const where = {
      ...(userId && { userId: userId as string }),
      ...(action && { action: (action as string).includes(',') ? { in: (action as string).split(',') } : action as any }),
      ...(tableName && { tableName: tableName as string }),
      ...(!systemLogs && !tableName && { tableName: { in: RECORD_TABLES } }),
      ...dateFilter,
    };

    // The before/after values are large JSON. Only the page that shows them asks for them (details=true).
    const withValues = details === 'true';

    const [logs, total] = await Promise.all([
      prisma.log.findMany({
        where,
        select: {
          id: true, userId: true, action: true, tableName: true, recordId: true, createdAt: true,
          ...(withValues && { oldValue: true, newValue: true }),
          user: { select: { name: true, username: true } },
        },
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
