import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';
import { sendSuccess, sendError } from '../../utils/response';
import si from 'systeminformation';
import { socketBroadcast } from '../../config/socket';
import { performManualCleanup } from './cron.service';

export async function getConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const config = await prisma.systemConfig.upsert({
      where: { id: 1 },
      create: { id: 1, maintenanceMode: false, maintenanceMessage: 'Server is under maintenance. Please try again later.', version: '1.0.0' },
      update: {},
    });
    sendSuccess(res, config);
  } catch (err) { next(err); }
}

export async function updateConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { maintenanceMode, maintenanceMessage, serverMessage, broadcastToAll, autoCleanupEnabled, autoCleanupDurationMonths } = req.body;
    
    const config = await prisma.systemConfig.upsert({
      where: { id: 1 },
      create: { id: 1, maintenanceMode: false, maintenanceMessage: 'Server is under maintenance. Please try again later.', version: '1.0.0' },
      update: {
        ...(maintenanceMode !== undefined && { maintenanceMode }),
        ...(maintenanceMessage !== undefined && { maintenanceMessage }),
        ...(serverMessage !== undefined && { serverMessage }),
        ...(autoCleanupEnabled !== undefined && { autoCleanupEnabled }),
        ...(autoCleanupDurationMonths !== undefined && { autoCleanupDurationMonths })
      }
    });

    if (maintenanceMode === true) {
      const activeSessions = await prisma.session.findMany({
        where: { logoutTime: null, isKicked: false, user: { role: 'USER' } }
      });
      
      await prisma.session.updateMany({
        where: { id: { in: activeSessions.map(s => s.id) } },
        data: { isKicked: true }
      });

      socketBroadcast({ 
        type: 'KICK', 
        message: 'System is going into maintenance mode.',
        excludeRole: 'SUPER_ADMIN'
      });
    }

    if (serverMessage) {
      socketBroadcast({ 
        type: 'MESSAGE', 
        message: serverMessage,
        excludeRole: broadcastToAll ? undefined : 'SUPER_ADMIN' 
      });
    }

    sendSuccess(res, config);
  } catch (err) { next(err); }
}

export async function getSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const sessions = await prisma.session.findMany({
      where: { logoutTime: null, isKicked: false },
      include: { user: { select: { id: true, name: true, username: true, role: true } } },
      orderBy: { lastSeen: 'desc' }
    });
    sendSuccess(res, sessions);
  } catch (err) { next(err); }
}

export async function kickSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { timeout } = req.body;

    const session = await prisma.session.update({
      where: { id },
      data: { isKicked: true },
      include: { user: true }
    });

    if (timeout && timeout > 0) {
      const bannedUntil = new Date(Date.now() + Number(timeout) * 60000);
      await prisma.user.update({
        where: { id: session.userId },
        data: { bannedUntil }
      });
    }

    socketBroadcast({ 
      type: 'KICK', 
      message: timeout ? `You have been kicked for ${timeout} minutes.` : 'You have been kicked by an administrator.',
      userId: session.userId 
    });

    sendSuccess(res, null, 200, undefined, 'Session kicked successfully');
  } catch (err) { next(err); }
}

export async function triggerReconciliation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { runCashReconciliation, runOnlineReconciliation } = require('./cron.service');
    await runCashReconciliation();
    await runOnlineReconciliation();
    sendSuccess(res, null, 200, undefined, 'Reconciliations triggered successfully');
  } catch (err) { next(err); }
}

export async function messageUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId } = req.params;
    const { message } = req.body;

    socketBroadcast({
      type: 'MESSAGE',
      message,
      userId
    });

    sendSuccess(res, null, 200, undefined, 'Message sent successfully');
  } catch (err) { next(err); }
}

export async function getSystemHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [cpu, mem, fs, net, time] = await Promise.all([
      si.cpuCurrentSpeed(),
      si.mem(),
      si.fsSize(),
      si.networkStats(),
      si.time()
    ]);

    const stats = {
      status: 'Healthy',
      uptime: process.uptime(),
      cpuUsage: cpu.avg,
      memUsage: {
        total: mem.total,
        used: mem.used,
        free: mem.free,
        percent: (mem.used / mem.total) * 100
      },
      diskUsage: fs[0] ? {
        size: fs[0].size,
        used: fs[0].used,
        available: fs[0].available,
        percent: fs[0].use
      } : null,
      network: net[0] ? {
        rx: net[0].rx_bytes,
        tx: net[0].tx_bytes,
        status: net[0].operstate
      } : null,
      timestamp: time.current
    };

    sendSuccess(res, stats);
  } catch (err) { next(err); }
}

export function eventStream(req: Request, res: Response): void {
  sendError(res, 'SSE is deprecated. Use Socket.IO instead.', 410);
}

// ── Storage Management ──────────────────────────────────────────────────────

export async function getStorageStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // In PostgreSQL, you can get table sizes. We use raw query for this.
    const result: any[] = await prisma.$queryRaw`
      SELECT relname as table_name, pg_total_relation_size(relid) as size_bytes
      FROM pg_catalog.pg_statio_user_tables
      WHERE relname IN ('transactions', 'expenses', 'logs', 'daily_analytics_snapshots', 'data_exports');
    `;
    
    const sizes = result.map(r => ({
      table: r.table_name,
      sizeBytes: Number(r.size_bytes),
      sizeMb: (Number(r.size_bytes) / (1024 * 1024)).toFixed(2) + ' MB'
    }));

    const totalBytes = sizes.reduce((acc, curr) => acc + curr.sizeBytes, 0);

    sendSuccess(res, {
      tables: sizes,
      totalBytes,
      totalMb: (totalBytes / (1024 * 1024)).toFixed(2) + ' MB'
    });
  } catch (err) { next(err); }
}

export async function manualCleanup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { endDate, types } = req.body as { endDate: string, types: string[] };
    if (!endDate || !types || types.length === 0) {
      sendError(res, 'Missing endDate or types array', 400);
      return;
    }
    const end = new Date(endDate);
    await performManualCleanup(end, types);
    sendSuccess(res, null, 200, undefined, 'Cleanup completed successfully.');
  } catch (err) { next(err); }
}

// ── Exports ─────────────────────────────────────────────────────────────────

export async function listExports(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const exports = await prisma.dataExport.findMany({
      select: { id: true, fileName: true, status: true, scheduledFor: true, createdAt: true, expiresAt: true },
      orderBy: { createdAt: 'desc' }
    });
    sendSuccess(res, exports);
  } catch (err) { next(err); }
}

export async function downloadExport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const dataExport = await prisma.dataExport.findUnique({ where: { id } });
    if (!dataExport) {
      sendError(res, 'Export not found', 404);
      return;
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${dataExport.fileName}"`);
    res.send(dataExport.fileData);
  } catch (err) { next(err); }
}

export async function logBill(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { customerName, total, items, date } = req.body;
    await prisma.log.create({
      data: {
        userId: req.user!.userId,
        action: 'CREATE',
        tableName: 'bills',
        recordId: `bill-${Date.now()}`,
        newValue: { customerName, total, items, date } as any,
      }
    });
    sendSuccess(res, null, 201, undefined, 'Bill logged successfully');
  } catch (err) { next(err); }
}

export async function getAutoTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { date, type, limit = '50', page = '1' } = req.query;
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const pageNum = Math.max(1, parseInt(page as string));

    const where: any = {};
    if (date) {
      // date is YYYY-MM-DD
      const targetDate = new Date(`${date}T00:00:00.000Z`);
      where.date = targetDate;
    }
    if (type) where.type = type as string;

    const [transactions, total] = await Promise.all([
      prisma.autoTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limitNum,
        skip: (pageNum - 1) * limitNum,
      }),
      prisma.autoTransaction.count({ where })
    ]);

    res.json({
      success: true,
      data: transactions,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (err) {
    next(err);
  }
}

// ── System Alerts ───────────────────────────────────────────────────────────

export async function getAlerts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const alerts = await prisma.systemAlert.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100 // Last 100 alerts
    });
    sendSuccess(res, alerts);
  } catch (err) { next(err); }
}

export async function markAlertRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const alert = await prisma.systemAlert.update({
      where: { id },
      data: { isRead: true }
    });
    sendSuccess(res, alert);
  } catch (err) { next(err); }
}

export async function clearAlerts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await prisma.systemAlert.deleteMany({});
    sendSuccess(res, null, 200, undefined, 'All alerts cleared');
  } catch (err) { next(err); }
}
