import { Router } from 'express';
import { authenticate, requireAccess } from '../../middleware/auth';
import { getLogs, cleanupLogs } from './logs.controller';

const router = Router();
router.use(authenticate);

// Reading: admins, and a custom role that may view system logs or all records
// (the controller narrows what a records-only role can see).
router.get('/', requireAccess(['ADMIN', 'SUPER_ADMIN'], ['salaryLogs', 'read'], ['allRecords', 'read']), getLogs);
router.delete('/cleanup', requireAccess(['ADMIN', 'SUPER_ADMIN']), cleanupLogs);

export default router;
