import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate, createServiceSchema, updateServiceSchema } from '../../utils/validation';
import { getAllServices, createService, updateService, deleteService } from './services.controller';

const router = Router();

// GET /api/services — any authenticated user
router.get('/', authenticate, getAllServices);

// POST/PATCH — ADMIN+
router.post('/', authenticate, requireRole(['MANAGER', 'ADMIN', 'SUPER_ADMIN']), validate(createServiceSchema), createService);
router.patch('/:id', authenticate, requireRole(['MANAGER', 'ADMIN', 'SUPER_ADMIN']), validate(updateServiceSchema), updateService);

// DELETE — SUPER_ADMIN only
router.delete('/:id', authenticate, requireRole(['SUPER_ADMIN']), deleteService);

export default router;
