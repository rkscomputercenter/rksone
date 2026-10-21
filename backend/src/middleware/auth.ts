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

    // 1. Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, isActive: true, role: true, name: true, username: true, bannedUntil: true, shopAccess: true },
    });

    console.log(`[AUTH DEBUG] User: ${user?.username}, Active: ${user?.isActive}, Role: ${user?.role}, SessionID: ${payload.sessionId}`);

    if (!user || !user.isActive) {
      console.log(`[AUTH REJECT] Account inactive or not found: ${payload.username}`);
      sendUnauthorized(res, 'Account not found or deactivated');
      return;
    }

    // 1.1 Check if this specific session has been kicked
    if (payload.sessionId) {
      const session = await prisma.session.findUnique({
        where: { id: payload.sessionId }
      });
      
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
      
      // Update last seen (throttle updates to every 1 min)
      if (Date.now() - new Date(session.lastSeen).getTime() > 60000) {
        await prisma.session.update({
          where: { id: session.id },
          data: { lastSeen: new Date() }
        });
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
    const config = await prisma.systemConfig.findUnique({ where: { id: 1 } });
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
      shopAccess: (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') ? ['SHOP_COMPUTER', 'SHOP_XEROX'] : user.shopAccess
    };

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Role-based access control middleware factory.
 * Fix #7: All permissions enforced in backend — no frontend trust.
 * 
 * Usage: requireRole(['ADMIN', 'SUPER_ADMIN'])
 */
export function requireRole(allowedRoles: Role[], requiredModule?: string, requiredAction?: 'read' | 'write') {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    const rolesArray = allowedRoles;

    if (req.user.role === 'CUSTOM' && requiredModule) {
      const perms = req.user.customPermissions?.[requiredModule];
      if (perms) {
        if (requiredAction === 'write' && perms.write) {
          next();
          return;
        }
        if (requiredAction === 'read' && perms.read) {
          next();
          return;
        }
        // If they don't have the specific module permission, it falls through to reject
      }
    }

    if (!rolesArray.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `Access denied. Insufficient permissions.`,
      });
      return;
    }

    next();
  };
}

/**
 * Checks if user has admin-level access (ADMIN or SUPER_ADMIN)
 * or if they have custom permission for a specific module.
 */
export function isAdminOrAbove(user: AuthPayload, module?: string): boolean {
  if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') return true;
  if (user.role === 'MANAGER' && module && ['services', 'expenseCategories'].includes(module)) return true;
  if (user.role === 'CUSTOM' && module) {
    return !!user.customPermissions?.[module]?.read;
  }
  return false;
}

/**
 * Checks if user is SUPER_ADMIN
 */
export function isSuperAdmin(role: Role): boolean {
  return role === 'SUPER_ADMIN';
}
