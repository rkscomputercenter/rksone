import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { getLogs, cleanupLogs } from './logs.controller';

const router = Router();
router.use(authenticate, requireRole(['ADMIN', 'SUPER_ADMIN']));

router.get('/', getLogs);
router.delete('/cleanup', cleanupLogs);

export default router;
