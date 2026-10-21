import { prisma } from '../../config/prisma';
import { env } from '../../config/env';

/**
 * Background job: deletes audit logs older than LOG_RETENTION_DAYS.
 * Runs every 24 hours after server start.
 */
export function startLogCleanupJob(): void {
  const INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

  console.log(`[LOG CLEANUP] Job scheduled — retaining logs for ${env.LOG_RETENTION_DAYS} days`);

  const runCleanup = async () => {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - env.LOG_RETENTION_DAYS);

      const result = await prisma.log.deleteMany({
        where: { createdAt: { lt: cutoffDate } },
      });

      if (result.count > 0) {
        console.log(`[LOG CLEANUP] Deleted ${result.count} logs older than ${env.LOG_RETENTION_DAYS} days`);
      }
    } catch (err) {
      console.error('[LOG CLEANUP] Job failed:', err);
    }
  };

  // Run after 1 minute delay (let DB stabilize), then every 24h
  setTimeout(() => {
    runCleanup();
    setInterval(runCleanup, INTERVAL_MS);
  }, 60 * 1000);
}
