import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, requireAccess, requireRole } from '../../middleware/auth';
import { validate } from '../../utils/validation';
import { z } from 'zod';
import {
  getBanks, getBankAnalytics,
  createBank, renameBank,
  depositToBank, adjustBalance, setBalance, hardResetBalance,
  deleteBank,
} from './banks.controller';

const router = Router();
router.use(authenticate);

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
const ADMINS: Role[] = ['ADMIN', 'SUPER_ADMIN'];

// Viewing: admins, a custom role that may view banks, and a custom role that may change records
// (it has to pick the account an expense is paid from).
router.get('/', requireAccess(ADMINS, ['banks', 'read'], ['allRecords', 'write']), getBanks);
router.get('/analytics', requireAccess(ADMINS, ['banks', 'read']), getBankAnalytics);

// Admin can deposit and adjust; so can a custom role that may change banks
router.patch('/:id/deposit', requireAccess(ADMINS, ['banks', 'write']), validate(depositSchema), depositToBank);
router.patch('/:id/adjust', requireAccess(ADMINS, ['banks', 'write']), validate(adjustSchema), adjustBalance);

// Super Admin only — destructive / privileged
router.post('/', requireRole(['SUPER_ADMIN']), validate(createBankSchema), createBank);
router.patch('/:id/rename', requireRole(['SUPER_ADMIN']), validate(renameSchema), renameBank);
router.patch('/:id/balance', requireRole(['SUPER_ADMIN']), validate(setBalanceSchema), setBalance);
router.patch('/:id/reset', requireRole(['SUPER_ADMIN']), validate(resetSchema), hardResetBalance);
router.delete('/:id', requireRole(['SUPER_ADMIN']), deleteBank);

export default router;
