import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../utils/validation';
import { z } from 'zod';
import {
  getBanks, getBankAnalytics,
  createBank, renameBank,
  depositToBank, adjustBalance, setBalance, hardResetBalance,
  deleteBank,
} from './banks.controller';

const router = Router();
router.use(authenticate, requireRole(['ADMIN', 'SUPER_ADMIN']));

// ── Schemas ──────────────────────────────────────────────────────
const createBankSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  balance: z.number().nonnegative().optional().default(0),
  isCash: z.boolean().optional().default(false),
});

const renameSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
});

const depositSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  note: z.string().max(500).optional(),
});

const adjustSchema = z.object({
  amount: z.number().refine(v => v !== 0, 'Amount must be non-zero'),
  note: z.string().max(500).optional(),
});

const setBalanceSchema = z.object({
  balance: z.number().nonnegative('Balance cannot be negative'),
  note: z.string().max(500).optional(),
});

const resetSchema = z.object({
  note: z.string().max(500).optional(),
});

// ── Routes ──────────────────────────────────────────────────────
router.get('/', getBanks);
router.get('/analytics', getBankAnalytics);

// Admin can deposit and adjust
router.patch('/:id/deposit', validate(depositSchema), depositToBank);
router.patch('/:id/adjust', validate(adjustSchema), adjustBalance);

// Super Admin only — destructive / privileged
router.post('/', requireRole(['SUPER_ADMIN']), validate(createBankSchema), createBank);
router.patch('/:id/rename', requireRole(['SUPER_ADMIN']), validate(renameSchema), renameBank);
router.patch('/:id/balance', requireRole(['SUPER_ADMIN']), validate(setBalanceSchema), setBalance);
router.patch('/:id/reset', requireRole(['SUPER_ADMIN']), validate(resetSchema), hardResetBalance);
router.delete('/:id', requireRole(['SUPER_ADMIN']), deleteBank);

export default router;
