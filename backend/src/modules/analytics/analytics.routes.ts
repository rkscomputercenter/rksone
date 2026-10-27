import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validateQuery, dailyAnalyticsQuerySchema, monthlyAnalyticsQuerySchema } from '../../utils/validation';
import { getDailyAnalytics, getMonthlyAnalytics, getTodaySummary, manualAdjust } from './analytics.controller';

const router = Router();
router.use(authenticate);

// Today summary — all roles (own data for USER, all data for ADMIN+)
router.get('/today-summary', getTodaySummary);

// Daily + monthly — admins, and a custom role that may view analytics
router.get('/daily', requireRole(['ADMIN', 'SUPER_ADMIN'], 'analytics', 'read'), validateQuery(dailyAnalyticsQuerySchema), getDailyAnalytics);
router.get('/monthly', requireRole(['ADMIN', 'SUPER_ADMIN'], 'analytics', 'read'), validateQuery(monthlyAnalyticsQuerySchema), getMonthlyAnalytics);
router.post('/adjust', requireRole(['SUPER_ADMIN']), manualAdjust);

export default router;

