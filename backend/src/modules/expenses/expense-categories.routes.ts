import { Router } from 'express';
import { Role } from '@prisma/client';
import * as controller from './expense-categories.controller';
import { authenticate, requireRole } from '../../middleware/auth';

const router = Router();

// Everyone can view categories (for the dropdown)
router.get('/', authenticate, controller.getCategories);

// Managers and admins can manage categories, and so can a custom role that may change them
const MANAGERS: Role[] = ['MANAGER', 'ADMIN', 'SUPER_ADMIN'];
router.post('/', authenticate, requireRole(MANAGERS, 'expenseCategories', 'write'), controller.createCategory);
router.patch('/:id', authenticate, requireRole(MANAGERS, 'expenseCategories', 'write'), controller.updateCategory);
router.delete('/:id', authenticate, requireRole(MANAGERS, 'expenseCategories', 'write'), controller.deleteCategory);

export default router;
