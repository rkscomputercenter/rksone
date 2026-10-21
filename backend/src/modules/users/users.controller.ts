import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../../config/prisma';
import { withAuditLog } from '../../utils/auditLog';
import { sendSuccess, sendCreated, sendNotFound, sendError } from '../../utils/response';

export async function getAllUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    let where = {};
    if (req.user!.role !== 'SUPER_ADMIN') {
      where = { role: { notIn: ['SUPER_ADMIN', 'ADMIN'] } };
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true, name: true, username: true, role: true,
        isActive: true, isSuspended: true, createdAt: true, updatedAt: true, shopAccess: true,
        _count: { select: { transactions: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    users.forEach(u => {
      if (u.role === 'ADMIN' || u.role === 'SUPER_ADMIN') {
        u.shopAccess = ['SHOP_COMPUTER', 'SHOP_XEROX'];
      }
    });
    sendSuccess(res, users);
  } catch (err) { next(err); }
}

export async function getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, name: true, username: true, role: true,
        isActive: true, isSuspended: true, createdAt: true, updatedAt: true, shopAccess: true,
        _count: { select: { transactions: true, expenses: true } },
      },
    });
    if (!user) { sendNotFound(res, 'User'); return; }
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      user.shopAccess = ['SHOP_COMPUTER', 'SHOP_XEROX'];
    }
    sendSuccess(res, user);
  } catch (err) { next(err); }
}

export async function createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, username, password, role, isActive, customRoleId, shopAccess } = req.body;

    const existing = await prisma.user.findUnique({ where: { username: username.toLowerCase() } });
    if (existing) {
      sendError(res, 'Username already taken', 409);
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await withAuditLog(
      prisma,
      req.user!.userId,
      'CREATE',
      'users',
      (u) => u.id,
      null,
      (u) => ({ id: u.id, name: u.name, username: u.username, role: u.role }),
      (tx) => tx.user.create({
        data: { name, username: username.toLowerCase(), passwordHash, role, isActive: isActive ?? true, customRoleId: role === 'CUSTOM' ? customRoleId : null, shopAccess: shopAccess || ['SHOP_COMPUTER'] },
        select: { id: true, name: true, username: true, role: true, isActive: true, createdAt: true, customRoleId: true, shopAccess: true },
      })
    );

    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      user.shopAccess = ['SHOP_COMPUTER', 'SHOP_XEROX'];
    }

    sendCreated(res, user, 'User created successfully');
  } catch (err) { next(err); }
}

const ROLE_RANKS: Record<string, number> = {
  USER: 10,
  CUSTOM: 20,
  MANAGER: 30,
  ADMIN: 40,
  SUPER_ADMIN: 50,
};

export async function updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) { sendNotFound(res, 'User'); return; }

    const actorRank = ROLE_RANKS[req.user!.role] || 0;
    const targetRank = ROLE_RANKS[existing.role] || 0;

    // You cannot modify someone with a higher or equal rank unless you are a SUPER_ADMIN
    if (actorRank <= targetRank && req.user!.role !== 'SUPER_ADMIN') {
      sendError(res, 'You do not have permission to modify a superior or equal role account', 403);
      return;
    }

    // Prevent deactivating the last super admin
    if (req.body.isActive === false && existing.role === 'SUPER_ADMIN') {
      const superAdminCount = await prisma.user.count({
        where: { role: 'SUPER_ADMIN', isActive: true },
      });
      if (superAdminCount <= 1) {
        sendError(res, 'Cannot deactivate the last Super Admin', 400);
        return;
      }
    }

    // Hardcode protection for the main 'admin' user
    if (existing.username === 'admin') {
      if (req.body.isActive === false) {
        sendError(res, 'The main admin user cannot be deactivated', 400);
        return;
      }
      if (req.body.role && req.body.role !== 'SUPER_ADMIN') {
        sendError(res, 'The main admin user role cannot be changed', 400);
        return;
      }
    }

    const updateData: any = {};
    if (req.body.name) updateData.name = req.body.name;
    if (req.body.role) {
      updateData.role = req.body.role;
      if (req.body.role === 'CUSTOM') {
        updateData.customRoleId = req.body.customRoleId;
      } else {
        updateData.customRoleId = null;
      }
    }
    if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;
    if (req.body.isSuspended !== undefined) updateData.isSuspended = req.body.isSuspended;
    if (req.body.password) {
      updateData.passwordHash = await bcrypt.hash(req.body.password, 12);
    }
    if (req.body.username) {
      updateData.username = req.body.username.toLowerCase();
    }
    if (req.body.shopAccess) {
      updateData.shopAccess = { set: req.body.shopAccess };
    }

    const updated = await withAuditLog(
      prisma, req.user!.userId, 'UPDATE', 'users',
      (u) => u.id,
      { id: existing.id, name: existing.name, role: existing.role, isActive: existing.isActive },
      (u) => ({ id: u.id, name: u.name, role: u.role, isActive: u.isActive }),
      (tx) => tx.user.update({
        where: { id: req.params.id },
        data: updateData,
        select: { id: true, name: true, username: true, role: true, isActive: true, isSuspended: true, updatedAt: true, customRoleId: true, shopAccess: true },
      })
    );

    if (updated.role === 'ADMIN' || updated.role === 'SUPER_ADMIN') {
      updated.shopAccess = ['SHOP_COMPUTER', 'SHOP_XEROX'];
    }

    sendSuccess(res, updated, 200, undefined, 'User updated');
  } catch (err) { next(err); }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = req.params.id;
    const user = await prisma.user.findUnique({ 
      where: { id },
      include: {
        _count: {
          select: { transactions: true, expenses: true, logs: true }
        }
      }
    });
    
    if (!user) { sendNotFound(res, 'User'); return; }

    const actorRank = ROLE_RANKS[req.user!.role] || 0;
    const targetRank = ROLE_RANKS[user.role] || 0;

    // You cannot delete someone with a higher or equal rank unless you are a SUPER_ADMIN
    if (actorRank <= targetRank && req.user!.role !== 'SUPER_ADMIN') {
      sendError(res, 'You do not have permission to delete a superior or equal role account', 403);
      return;
    }

    if (id === req.user!.userId) {
      sendError(res, 'Cannot delete your own account', 400);
      return;
    }

    // Prevent deleting the main admin user entirely
    if (user.username === 'admin') {
      sendError(res, 'The main admin user cannot be deleted under any circumstances', 400);
      return;
    }

    // Prevent deleting the last super admin
    if (user.role === 'SUPER_ADMIN') {
      const superAdminCount = await prisma.user.count({
        where: { role: 'SUPER_ADMIN', isActive: true },
      });
      if (superAdminCount <= 1) {
        sendError(res, 'Cannot delete the last Super Admin', 400);
        return;
      }
    }

    // Check if user has any activity
    const hasActivity = user._count.transactions > 0 || user._count.expenses > 0;

    if (hasActivity) {
      // Soft-delete by deactivating to preserve financial audit trail
      await withAuditLog(
        prisma, req.user!.userId, 'DELETE', 'users',
        () => id,
        { id: user.id, name: user.name, username: user.username, action: 'SOFT_DELETE' },
        () => null,
        (tx) => tx.user.update({
          where: { id },
          data: { isActive: false },
        })
      );
      sendSuccess(res, null, 200, undefined, 'User has transactions and was deactivated to preserve history');
    } else {
      // Hard delete if no activity exists
      await withAuditLog(
        prisma, req.user!.userId, 'DELETE', 'users',
        () => id,
        { id: user.id, name: user.name, username: user.username, action: 'HARD_DELETE' },
        () => null,
        (tx) => {
          // First delete logs associated with this user to avoid Restrict constraint
          return Promise.all([
            tx.log.deleteMany({ where: { userId: id } }),
            tx.user.delete({ where: { id } })
          ]);
        }
      );
      sendSuccess(res, null, 200, undefined, 'User deleted permanently');
    }
  } catch (err) { next(err); }
}

export async function getPasswordRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const requests = await prisma.passwordResetRequest.findMany({
      where: { status: 'PENDING' },
      include: {
        user: {
          select: { id: true, name: true, username: true, role: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
    sendSuccess(res, requests);
  } catch (err) { next(err); }
}

export async function resolvePasswordRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
      sendError(res, 'New password must be at least 6 characters long', 400);
      return;
    }

    const request = await prisma.passwordResetRequest.findUnique({ where: { id } });
    if (!request) {
      sendNotFound(res, 'Password Reset Request');
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: request.userId },
        data: { passwordHash }
      }),
      prisma.passwordResetRequest.update({
        where: { id },
        data: { status: 'RESOLVED' }
      })
    ]);

    sendSuccess(res, null, 200, undefined, 'Password successfully updated.');
  } catch (err) { next(err); }
}
