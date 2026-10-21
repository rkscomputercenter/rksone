import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate, createTransactionSchema, updateTransactionSchema } from '../../utils/validation';
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from './transactions.controller';

const router = Router();
router.use(authenticate);

router.get('/', getTransactions);
router.post('/', validate(createTransactionSchema), createTransaction);
router.patch('/:id', validate(updateTransactionSchema), updateTransaction);
router.delete('/:id', deleteTransaction);

export default router;
