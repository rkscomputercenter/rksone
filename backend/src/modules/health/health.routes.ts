import { Router, Request, Response } from 'express';
import { prisma } from '../../config/prisma';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    // Check DB connectivity
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      success: true,
      data: {
        status: 'ok',
        service: 'RKS Backend',
        timestamp: new Date().toISOString(),
        timezone: process.env.TZ || 'Asia/Kolkata',
        localTime: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        database: 'connected',
        environment: process.env.NODE_ENV,
      },
    });
  } catch {
    res.status(503).json({
      success: false,
      data: {
        status: 'degraded',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
      },
    });
  }
});

export default router;
