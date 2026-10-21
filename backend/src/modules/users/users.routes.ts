import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate, createUserSchema, updateUserSchema } from '../../utils/validation';
import {
  getAllUsers,
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

router.get('/', requireRole(['ADMIN', 'SUPER_ADMIN']), getAllUsers);
router.get('/:id', requireRole(['SUPER_ADMIN']), getUserById);
router.post('/', requireRole(['SUPER_ADMIN']), validate(createUserSchema), createUser);
router.patch('/:id', requireRole(['SUPER_ADMIN']), validate(updateUserSchema), updateUser);
router.delete('/:id', requireRole(['SUPER_ADMIN']), deleteUser);

export default router;
