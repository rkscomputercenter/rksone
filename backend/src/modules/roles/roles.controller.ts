import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma';
import { sendSuccess, sendError } from '../../utils/response';
import { z } from 'zod';

/** The modules a role can grant. Anything else is refused so a typo can never look like a permission. */
export const PERMISSION_MODULES = ['services', 'expenseCategories', 'banks', 'analytics', 'allRecords', 'salaryLogs'] as const;

const createRoleSchema = z.object({
  name: z.string().trim().min(2, 'Give the role a name of at least 2 letters').max(60),
  permissions: z.record(z.object({
    read: z.boolean(),
    write: z.boolean()
  })).refine(p => Object.keys(p).every(k => (PERMISSION_MODULES as readonly string[]).includes(k)), 'Unknown permission')
}).transform(data => ({
  ...data,
  // Being allowed to change something includes being allowed to see it
  permissions: Object.fromEntries(
    PERMISSION_MODULES.map(m => [m, { read: !!(data.permissions[m]?.read || data.permissions[m]?.write), write: !!data.permissions[m]?.write }])
  ),
}));

export const listRoles = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const roles = await prisma.customRole.findMany({
      include: {
        _count: { select: { users: true } }
      },
      orderBy: { createdAt: 'asc' }
    });
    sendSuccess(res, roles);
  } catch (err) {
    next(err);
  }
};

export const createRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const data = createRoleSchema.parse(req.body);
    const existing = await prisma.customRole.findUnique({ where: { name: data.name } });
    if (existing) {
      sendError(res, 'Role name already exists', 400);
      return;
    }

    const role = await prisma.customRole.create({
      data: {
        name: data.name,
        permissions: data.permissions
      }
    });
    sendSuccess(res, role, 201, undefined, 'Role created successfully');
  } catch (err) {
    next(err);
  }
};

export const updateRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const data = createRoleSchema.parse(req.body);

    const existing = await prisma.customRole.findUnique({ where: { id } });
    if (!existing) {
      sendError(res, 'Role not found', 404);
      return;
    }

    const nameCheck = await prisma.customRole.findFirst({
      where: { name: data.name, id: { not: id } }
    });
    if (nameCheck) {
      sendError(res, 'Role name already exists', 400);
      return;
    }

    const role = await prisma.customRole.update({
      where: { id },
      data: {
        name: data.name,
        permissions: data.permissions
      }
    });
    sendSuccess(res, role, 200, undefined, 'Role updated successfully');
  } catch (err) {
    next(err);
  }
};

export const deleteRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await prisma.customRole.findUnique({ 
      where: { id },
      include: { _count: { select: { users: true } } }
    });

    if (!existing) {
      sendError(res, 'Role not found', 404);
      return;
    }

    if (existing._count.users > 0) {
      sendError(res, 'Cannot delete role assigned to active users. Reassign them first.', 400);
      return;
    }

    await prisma.customRole.delete({ where: { id } });
    sendSuccess(res, null, 200, undefined, 'Role deleted successfully');
  } catch (err) {
    next(err);
  }
};
