import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate, createExpenseSchema, updateExpenseSchema, approveExpenseSchema } from '../../utils/validation';
import {
  getExpenses, createExpense, updateExpense,
  deleteExpense, approveExpense
} from './expenses.controller';

const router = Router();
router.use(authenticate);

router.get('/', getExpenses);
router.post('/', validate(createExpenseSchema), createExpense);
router.patch('/:id', validate(updateExpenseSchema), updateExpense);
router.patch('/:id/approve', requireRole(['ADMIN', 'SUPER_ADMIN']), validate(approveExpenseSchema), approveExpense);
router.delete('/:id', requireRole(['SUPER_ADMIN']), deleteExpense);

export default router;
