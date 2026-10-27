import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate, createServiceSchema, updateServiceSchema } from '../../utils/validation';
import { getAllServices, createService, updateService, deleteService } from './services.controller';

const router = Router();

// GET /api/services — any authenticated user
router.get('/', authenticate, getAllServices);

// POST/PATCH — managers and admins, and a custom role that may change services
router.post('/', authenticate, requireRole(['MANAGER', 'ADMIN', 'SUPER_ADMIN'], 'services', 'write'), validate(createServiceSchema), createService);
router.patch('/:id', authenticate, requireRole(['MANAGER', 'ADMIN', 'SUPER_ADMIN'], 'services', 'write'), validate(updateServiceSchema), updateService);

// DELETE — SUPER_ADMIN only
router.delete('/:id', authenticate, requireRole(['SUPER_ADMIN']), deleteService);

export default router;
