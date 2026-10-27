import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { sendUnauthorized } from '../utils/response';
import { Role } from '@prisma/client';

export interface AuthPayload {
  userId: string;
  username: string;
  role: Role;
  name: string;
  sessionId?: string;
  customPermissions?: Record<string, { read: boolean; write: boolean }>;
  shopAccess: string[];
}

// Extend Express Request to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

/**
 * JWT authentication middleware.
 * Verifies token, checks user is still active, attaches user to req.user.
 * Also checks for maintenance mode and session kick-out.
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.query.token) {
      token = req.query.token as string;
    }

    if (!token) {
      sendUnauthorized(res, 'No token provided');
      return;
    }

    let payload: AuthPayload;
    try {
      payload = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
    } catch {
      sendUnauthorized(res, 'Invalid or expired token');
      return;
    }

    // Refresh tokens are signed with the same secret but carry no userId — never accept them here.
    if (!payload.userId) {
      sendUnauthorized(res, 'Invalid or expired token');
      return;
    }

    // 1. Verify user still exists and is active (permissions always come from the DB, not the token)
    const [user, session, config] = await Promise.all([
      prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true, isActive: true, isSuspended: true, role: true, name: true, username: true,
          bannedUntil: true, shopAccess: true, customRole: { select: { permissions: true } },
        },
      }),
      payload.sessionId ? prisma.session.findUnique({ where: { id: payload.sessionId } }) : null,
      prisma.systemConfig.findUnique({ where: { id: 1 } }),
    ]);

    if (!user || !user.isActive) {
      console.log(`[AUTH REJECT] Account inactive or not found: ${payload.username}`);
      sendUnauthorized(res, 'Account not found or deactivated');
      return;
    }

    if (user.isSuspended) {
      sendUnauthorized(res, 'Your account is suspended. Please contact an administrator.');
      return;
    }

    // 1.1 Check if this specific session has been kicked
    if (payload.sessionId) {
      if (!session) {
        console.log(`[AUTH REJECT] Session not found: ${payload.sessionId}`);
        sendUnauthorized(res, 'Session not found. Please log in again.');
        return;
      }
      
      if (session.isKicked || session.logoutTime) {
        console.log(`[AUTH REJECT] Session terminated: Kicked=${session.isKicked}, Logout=${session.logoutTime}`);
        sendUnauthorized(res, 'Your session has been terminated by an administrator.');
        return;
      }
      
      // Update last seen (throttled to once a minute). Not awaited: the request must not wait for a bookkeeping write.
      if (Date.now() - new Date(session.lastSeen).getTime() > 60000) {
        prisma.session.update({ where: { id: session.id }, data: { lastSeen: new Date() } }).catch(() => {});
      }
    }

    // Check for Temporary Ban (Timeout)
    if (user.bannedUntil && new Date(user.bannedUntil) > new Date()) {
      const remaining = Math.ceil((new Date(user.bannedUntil).getTime() - Date.now()) / 60000);
      console.log(`[AUTH REJECT] User banned until ${user.bannedUntil}: ${user.username}`);
      sendUnauthorized(res, `Your account is temporarily suspended. Try again in ${remaining} minutes.`);
      return;
    }

    // 2. Check for Maintenance Mode (Immunity for SUPER_ADMIN)
    if (config?.maintenanceMode && user.role !== 'SUPER_ADMIN') {
      res.status(503).json({
        success: false,
        error: config.maintenanceMessage || 'Server is under maintenance',
        maintenance: true
      });
      return;
    }

    req.user = {
      userId: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      sessionId: payload.sessionId,
      ...(user.role === 'CUSTOM' && user.customRole && {
        customPermissions: user.customRole.permissions as AuthPayload['customPermissions'],
      }),
      shopAccess: (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') ? ['SHOP_COMPUTER', 'SHOP_XEROX'] : user.shopAccess
    };

    next();
  } catch (err) {
    next(err);
  }
}

/** The modules a custom role can grant. "Change" (write) always includes "view" (read). */
export type PermissionAction = 'read' | 'write';

/**
 * Does this person hold a module permission?
 * ADMIN and SUPER_ADMIN hold all of them. MANAGER holds services and expenseCategories.
 * CUSTOM holds what its role grants, and a "write" grant includes "read".
 */
export function hasPermission(user: AuthPayload, module: string, action: PermissionAction = 'read'): boolean {
  if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') return true;
  if (user.role === 'MANAGER') return module === 'services' || module === 'expenseCategories';
  if (user.role === 'CUSTOM') {
    const perms = user.customPermissions?.[module];
    if (!perms) return false;
    return action === 'write' ? !!perms.write : !!(perms.read || perms.write);
  }
  return false;
}

/**
 * Access gate for a route: the listed roles pass, and so does anyone holding one of the
 * module permissions, e.g. requireAccess(['ADMIN', 'SUPER_ADMIN'], ['banks', 'read']).
 * Permissions come from the database on every request (see authenticate), never from the token.
 */
export function requireAccess(allowedRoles: Role[], ...grants: Array<[module: string, action: PermissionAction]>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }
    if (allowedRoles.includes(req.user.role) || grants.some(([module, action]) => hasPermission(req.user!, module, action))) {
      next();
      return;
    }
    res.status(403).json({ success: false, error: 'Access denied. Insufficient permissions.' });
  };
}

/**
 * Role-based access control middleware factory.
 * Fix #7: All permissions enforced in backend — no frontend trust.
 *
 * Usage: requireRole(['ADMIN', 'SUPER_ADMIN']), or with a module so a custom role can pass too:
 * requireRole(['ADMIN', 'SUPER_ADMIN'], 'banks', 'read')
 */
export function requireRole(allowedRoles: Role[], requiredModule?: string, requiredAction: PermissionAction = 'read') {
  return requiredModule ? requireAccess(allowedRoles, [requiredModule, requiredAction]) : requireAccess(allowedRoles);
}

/**
 * Admin-level access for a module: ADMIN and SUPER_ADMIN always, MANAGER for services and
 * expense categories, and a custom role that may at least view that module.
 * (For changing things, use hasPermission(user, module, 'write').)
 */
export function isAdminOrAbove(user: AuthPayload, module?: string): boolean {
  if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') return true;
  return module ? hasPermission(user, module, 'read') : false;
}

/**
 * Checks if user is SUPER_ADMIN
 */
export function isSuperAdmin(role: Role): boolean {
  return role === 'SUPER_ADMIN';
}
