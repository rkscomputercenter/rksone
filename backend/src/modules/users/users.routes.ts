import { Router } from 'express';
import { authenticate, requireAccess, requireRole } from '../../middleware/auth';
import { validate, createUserSchema, updateUserSchema } from '../../utils/validation';
import {
  getAllUsers,
  getUserDirectory,
  createUser,
  updateUser,
  deleteUser,
  getUserById,
  getPasswordRequests,
  resolvePasswordRequest
} from './users.controller';

const router = Router();

// Base authentication
router.use(authenticate);

// Password requests routes (SUPER_ADMIN only)
router.get('/password-requests', requireRole(['SUPER_ADMIN']), getPasswordRequests);
router.post('/password-requests/:id/resolve', requireRole(['SUPER_ADMIN']), resolvePasswordRequest);

// Names only (for the "by staff member" filters). Anyone who may look at records, logs or analytics needs it.
router.get('/directory',
  requireAccess(['ADMIN', 'SUPER_ADMIN'], ['allRecords', 'read'], ['salaryLogs', 'read'], ['analytics', 'read']),
  getUserDirectory);

router.get('/', requireRole(['ADMIN', 'SUPER_ADMIN']), getAllUsers);
router.get('/:id', requireRole(['SUPER_ADMIN']), getUserById);
router.post('/', requireRole(['SUPER_ADMIN']), validate(createUserSchema), createUser);
router.patch('/:id', requireRole(['SUPER_ADMIN']), validate(updateUserSchema), updateUser);
router.delete('/:id', requireRole(['SUPER_ADMIN']), deleteUser);

export default router;
