import { Router } from 'express';
import { listRoles, createRole, updateRole, deleteRole } from './roles.controller';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/auth';

const router = Router();

// Only Super Admins can manage Custom Roles
router.use(authenticate, requireRole(['SUPER_ADMIN']));

router.get('/', listRoles);
router.post('/', createRole);
router.patch('/:id', updateRole);
router.delete('/:id', deleteRole);

export default router;
