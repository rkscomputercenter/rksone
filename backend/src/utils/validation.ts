import { z, ZodSchema } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { sendValidationError } from './response';

/**
 * Middleware factory that validates req.body against a Zod schema.
 * Returns 422 with the first validation error message.
 */
export function validate<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const firstError = result.error.errors[0];
      const field = firstError.path.join('.');
      const message = field
        ? `${field}: ${firstError.message}`
        : firstError.message;
      sendValidationError(res, message);
      return;
    }
    req.body = result.data;
    next();
  };
}

// ─── Shared field schemas ────────────────────────────────────────────

export const positiveDecimal = z
  .number({ invalid_type_error: 'Must be a number' })
  .positive('Must be greater than 0')
  .multipleOf(0.01, 'Max 2 decimal places');

export const nonNegativeDecimal = z
  .number({ invalid_type_error: 'Must be a number' })
  .nonnegative('Must be 0 or greater')
  .multipleOf(0.01, 'Max 2 decimal places');

export const positiveInt = z
  .number({ invalid_type_error: 'Must be a number' })
  .int('Must be a whole number')
  .positive('Must be at least 1');

// ─── Auth schemas ───────────────────────────────────────────────────

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(6, 'New password must be at least 6 characters'),
});

// ─── User schemas ───────────────────────────────────────────────────

export const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .regex(/^[a-z0-9_]+$/, 'Username: lowercase letters, numbers, underscores only'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['USER', 'MANAGER', 'ADMIN', 'SUPER_ADMIN', 'CUSTOM']),
  customRoleId: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
  isSuspended: z.boolean().optional().default(false),
  shopAccess: z.array(z.enum(['SHOP_COMPUTER', 'SHOP_XEROX'])).optional(),
});

export const updateUserSchema = createUserSchema
  .partial()
  .omit({ password: true })
  .extend({
    password: z.string().min(6).optional(),
  });

// ─── Service schemas ────────────────────────────────────────────────

export const createServiceSchema = z.object({
  name: z.string().min(2, 'Service name required'),
  category: z.enum(['GOVT', 'PRINTING', 'CARDS', 'OTHER']),
  price: nonNegativeDecimal,
  isActive: z.boolean().optional().default(true),
  shop: z.enum(['SHOP_COMPUTER', 'SHOP_XEROX']).optional(),
});

export const updateServiceSchema = createServiceSchema.partial();

// ─── Transaction schemas ────────────────────────────────────────────

export const createTransactionSchema = z.object({
  serviceId: z.string().uuid('Invalid service ID').optional(),
  serviceName: z.string().optional(),
  quantity: positiveInt,
  notes: z.string().max(500).optional(),
  unitPrice: nonNegativeDecimal.optional(),
  paymentMethod: z.enum(['CASH', 'ONLINE', 'OTHER', 'SHOP_XEROX']),
  shop: z.enum(['SHOP_COMPUTER', 'SHOP_XEROX']).optional(),
}).refine(data => data.serviceId || data.serviceName, {
  message: "Either serviceId or serviceName must be provided",
});

export const updateTransactionSchema = z.object({
  quantity: positiveInt.optional(),
  notes: z.string().max(500).optional(),
  updatedAt: z.string().datetime({ message: 'updatedAt must be ISO datetime (for optimistic lock)' }),
});

// ─── Expense schemas ────────────────────────────────────────────────

export const createExpenseSchema = z.object({
  amount: positiveDecimal,
  category: z.string().min(1, 'Category is required'),
  note: z.string().max(500).optional(),
  bankId: z.string().uuid('Invalid bank ID').optional(),
  shop: z.enum(['SHOP_COMPUTER', 'SHOP_XEROX']).optional(),
});

export const updateExpenseSchema = z.object({
  amount: positiveDecimal.optional(),
  category: z.string().min(1).optional(),
  note: z.string().max(500).optional(),
  shop: z.enum(['SHOP_COMPUTER', 'SHOP_XEROX']).optional(),
  updatedAt: z.string().datetime({ message: 'updatedAt required for optimistic lock' }),
});

export const approveExpenseSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  bankId: z.string().uuid('Invalid bank ID').optional(),
}).refine(
  (data) => data.status === 'REJECTED' || data.bankId !== undefined,
  { message: 'bankId is required when approving an expense', path: ['bankId'] }
);

// ─── Analytics query schemas ────────────────────────────────────────

export const dailyAnalyticsQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  shop: z.enum(['SHOP_COMPUTER', 'SHOP_XEROX']).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
    .optional(),
});

export const monthlyAnalyticsQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  shop: z.enum(['SHOP_COMPUTER', 'SHOP_XEROX']).optional(),
  year: z
    .string()
    .regex(/^\d{4}$/, 'Year must be YYYY')
    .transform(Number)
    .optional(),
  month: z
    .string()
    .regex(/^(0?[1-9]|1[0-2])$/, 'Month must be 1-12')
    .transform(Number)
    .optional(),
});








export function validateQuery(schema: ZodSchema<any>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const firstError = result.error.errors[0];
      const field = firstError.path.join('.');
      const message = field
        ? "Query parameter $field: ${firstError.message}"
        : firstError.message;
      sendValidationError(res, message);
      return;
    }
    req.query = result.data as any;
    next();
  };
}

export function validateParams(schema: ZodSchema<any>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      const firstError = result.error.errors[0];
      const field = firstError.path.join('.');
      const message = field
        ? "URL parameter $field: ${firstError.message}"
        : firstError.message;
      sendValidationError(res, message);
      return;
    }
    req.params = result.data as any;
    next();
  };
}


