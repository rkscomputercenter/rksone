import { Router } from 'express';
import * as controller from './system.controller';
import { authenticate, requireRole } from '../../middleware/auth';

const router = Router();

// SSE Stream — accessible to all authenticated users to receive notifications
router.get('/events', authenticate, controller.eventStream);

// Config — Read by App, Write by Super Admin
router.get('/config', controller.getConfig);
router.patch('/config', authenticate, requireRole(['SUPER_ADMIN']), controller.updateConfig);
router.get('/health-stats', authenticate, requireRole(['SUPER_ADMIN']), controller.getSystemHealth);

// Sessions — Super Admin only
router.get('/sessions', authenticate, requireRole(['SUPER_ADMIN']), controller.getSessions);
router.post('/sessions/:id/kick', authenticate, requireRole(['SUPER_ADMIN']), controller.kickSession);
router.post('/sessions/:userId/message', authenticate, requireRole(['SUPER_ADMIN']), controller.messageUser);

// Storage & Cleanup — Super Admin only
router.get('/storage', authenticate, requireRole(['SUPER_ADMIN']), controller.getStorageStats);
router.post('/cleanup', authenticate, requireRole(['SUPER_ADMIN']), controller.manualCleanup);

// Exports — Admin & Super Admin
router.get('/exports', authenticate, requireRole(['ADMIN', 'SUPER_ADMIN']), controller.listExports);
router.get('/exports/:id/download', authenticate, requireRole(['ADMIN', 'SUPER_ADMIN']), controller.downloadExport);

// Automatic Transactions — Admin & Super Admin
router.get('/auto-transactions', authenticate, requireRole(['ADMIN', 'SUPER_ADMIN']), controller.getAutoTransactions);
router.post('/auto-transactions/trigger', authenticate, requireRole(['ADMIN', 'SUPER_ADMIN']), controller.triggerReconciliation);

// Billing Log - All Authenticated Users
router.post('/log-bill', authenticate, controller.logBill);

// System Alerts - Super Admin only
router.get('/alerts', authenticate, requireRole(['SUPER_ADMIN']), controller.getAlerts);
router.patch('/alerts/:id/read', authenticate, requireRole(['SUPER_ADMIN']), controller.markAlertRead);
router.delete('/alerts', authenticate, requireRole(['SUPER_ADMIN']), controller.clearAlerts);

export default router;
