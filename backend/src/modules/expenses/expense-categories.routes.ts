import { Router } from 'express';
import * as controller from './expense-categories.controller';
import { authenticate, requireRole } from '../../middleware/auth';

const router = Router();

// Everyone can view categories (for the dropdown)
router.get('/', authenticate, controller.getCategories);

// Admin and Super Admin can manage categories
router.post('/', authenticate, requireRole(['MANAGER', 'ADMIN', 'SUPER_ADMIN']), controller.createCategory);
router.patch('/:id', authenticate, requireRole(['MANAGER', 'ADMIN', 'SUPER_ADMIN']), controller.updateCategory);
router.delete('/:id', authenticate, requireRole(['MANAGER', 'ADMIN', 'SUPER_ADMIN']), controller.deleteCategory);

export default router;
