import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/prisma';
import { env } from '../../config/env';
import { sendSuccess, sendError, sendUnauthorized } from '../../utils/response';
import { socketBroadcast } from '../../config/socket';
import fs from 'fs';
import path from 'path';

/** Reads the current APK path from the published version.json (frontend build output). */
function getCurrentApkUrl(): string {
  try {
    const file = path.join(__dirname, '../../../public/version.json');
    const { apkUrl } = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (typeof apkUrl === 'string' && apkUrl) return apkUrl;
  } catch {
    // fall through to the generic download page
  }
  return '/download';
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { username, password } = req.body as { username: string; password: string };
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const attemptKey = `${ip}_${username.toLowerCase().trim()}`;

    const handleFailedLogin = async () => {
      const alert = await prisma.systemAlert.create({
        data: {
          type: 'WARNING',
          source: 'LOGIN_ATTEMPT',
          message: `Failed login attempt for username: ${username}`,
          ipAddress: req.ip || 'unknown'
        }
      });
      socketBroadcast({ type: 'NEW_ALERT', targetRole: 'SUPER_ADMIN', payload: alert });
      
      return `Invalid credentials. Please try again.`;
    };

    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase().trim() },
      include: { customRole: true }
    });

    // SYSTEM_AUTO only owns automatic audit rows; it can never sign in
    if (!user || !user.isActive || user.username === 'SYSTEM_AUTO') {
      const msg = await handleFailedLogin();
      sendUnauthorized(res, msg);
      return;
    }

    if (user.isSuspended) {
      sendError(res, 'Your account is suspended. Please contact an administrator.', 403);
      return;
    }

    if (user.bannedUntil && new Date(user.bannedUntil) > new Date()) {
      const remaining = Math.ceil((new Date(user.bannedUntil).getTime() - Date.now()) / 60000);
      sendUnauthorized(res, `Account suspended. Try again in ${remaining} minutes.`);
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      const msg = await handleFailedLogin();
      sendUnauthorized(res, msg);
      return;
    }

    // Check for Maintenance Mode (Immunity for SUPER_ADMIN)
    const config = await prisma.systemConfig.findUnique({ where: { id: 1 } });
    if (config?.maintenanceMode && user.role !== 'SUPER_ADMIN') {
      res.status(503).json({
        success: false,
        error: config.maintenanceMessage || 'Server is under maintenance. Only Super Admins can log in right now.',
        maintenance: true
      });
      return;
    }

    // Create session record
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] as string,
      }
    });

    const payload: any = {
      userId: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      sessionId: session.id, // Added sessionId
    };

    if (user.role === 'CUSTOM' && user.customRole) {
      payload.customPermissions = user.customRole.permissions;
    }

    const token = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: '15m', // Phase 2: Short-lived access token
    });

    // Phase 2: Generate Refresh Token
    const refreshToken = jwt.sign({ sessionId: session.id }, env.JWT_SECRET, {
      expiresIn: '7d',
    });

    // Update session with refresh token
    await prisma.session.update({
      where: { id: session.id },
      data: { refreshToken }
    });

    // (Removed DB-based reset logic)

    sendSuccess(res, {
      token,
      refreshToken,
      user: {        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        shopAccess: (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') ? ['SHOP_COMPUTER', 'SHOP_XEROX'] : user.shopAccess,
      },
    }, 200, undefined, 'Login successful');
  } catch (err) {
    next(err);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        shopAccess: true,
        isActive: true,
        createdAt: true,
        customRole: true,
        _count: {
          select: { transactions: true, expenses: true },
        },
      },
    });

    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    // Calculate total contribution (total revenue generated by this user)
    const totalRevenue = await prisma.transaction.aggregate({
      where: { userId: user.id },
      _sum: { totalPrice: true },
    });

    // Today's stats (IST)
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const todayStart = new Date(`${today}T00:00:00+05:30`);
    const todayEnd = new Date(`${today}T23:59:59.999+05:30`);

    const todayTransactions = await prisma.transaction.aggregate({
      where: {
        userId: req.user!.userId,
        createdAt: { gte: todayStart, lte: todayEnd },
      },
      _sum: { totalPrice: true },
      _count: true,
    });

    const recentLogs = await prisma.log.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        action: true,
        tableName: true,
        createdAt: true,
      },
    });

    const responseData = {
      ...user,
      shopAccess: (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') ? ['SHOP_COMPUTER', 'SHOP_XEROX'] : user.shopAccess,
      totalRevenue: totalRevenue._sum.totalPrice || 0,
      todayStats: {
        transactions: todayTransactions._count,
        revenue: todayTransactions._sum.totalPrice || 0,
      },
      customPermissions: user.customRole?.permissions,
      recentActivity: recentLogs,
    };
    delete (responseData as any).customRole;

    sendSuccess(res, responseData);
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body as {
      currentPassword: string;
      newPassword: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
    });

    if (!user) {
      sendError(res, 'User not found', 404);
      return;
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      sendUnauthorized(res, 'Current password is incorrect');
      return;
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    sendSuccess(res, null, 200, undefined, 'Password changed successfully');
  } catch (err) {
    next(err);
  }
}

export async function verifyDownload(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { username, password } = req.body;
    const ip = req.ip || req.socket.remoteAddress || 'unknown';

    if (!username || !password) {
      sendError(res, 'Username and password are required', 400);
      return;
    }

    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase().trim() }
    });

    if (!user || !user.isActive || user.isSuspended || user.username === 'SYSTEM_AUTO') {
      sendUnauthorized(res, 'Invalid credentials or account suspended');
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      sendUnauthorized(res, 'Invalid credentials');
      return;
    }

    // Check for Maintenance Mode
    const config = await prisma.systemConfig.findUnique({ where: { id: 1 } });
    if (config?.maintenanceMode && user.role !== 'SUPER_ADMIN') {
      res.status(503).json({
        success: false,
        error: config.maintenanceMessage || 'Server is under maintenance. Downloads disabled.',
        maintenance: true
      });
      return;
    }

    // Log the download event (non-blocking)
    try {
      const alert = await prisma.systemAlert.create({
        data: {
          type: 'INFO',
          source: 'SYSTEM',
          message: `User ${user.username} downloaded the Android App.`,
          ipAddress: ip
        }
      });
      socketBroadcast({ type: 'NEW_ALERT', targetRole: 'SUPER_ADMIN', payload: alert });
    } catch (logErr) {
      console.error('[verifyDownload] Failed to log download event:', logErr);
    }

    sendSuccess(res, { apkUrl: getCurrentApkUrl() }, 200, undefined, 'Verification successful. Download started.');
  } catch (err) {
    next(err);
  }
}






export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { username } = req.body;
    if (!username) {
      sendError(res, 'Username is required', 400);
      return;
    }

    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase().trim() }
    });

    if (!user) {
      // Don't leak if user exists or not
      sendSuccess(res, null, 200, undefined, 'If the username exists, a request has been sent.');
      return;
    }

    await prisma.passwordResetRequest.create({
      data: {
        userId: user.id
      }
    });

    sendSuccess(res, null, 200, undefined, 'Password reset request sent to administrators.');
  } catch (err) {
    next(err);
  }
}



export async function refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token } = req.body;
    if (!token) {
      sendUnauthorized(res, 'Refresh token required');
      return;
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (e) {
      sendUnauthorized(res, 'Invalid or expired refresh token');
      return;
    }

    const sessionId = decoded.sessionId;
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: { include: { customRole: true } } }
    });

    if (!session || session.refreshToken !== token || session.logoutTime || session.isKicked) {
      sendUnauthorized(res, 'Session invalid or expired');
      return;
    }

    const user = session.user;
    if (!user || !user.isActive || user.isSuspended) {
      sendUnauthorized(res, 'User invalid or suspended');
      return;
    }

    const payload: any = {
      userId: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      sessionId: session.id,
    };

    if (user.role === 'CUSTOM' && user.customRole) {
      payload.customPermissions = user.customRole.permissions;
    }

    const newAccessToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '15m' });
    const newRefreshToken = jwt.sign({ sessionId: session.id }, env.JWT_SECRET, { expiresIn: '7d' });

    await prisma.session.update({
      where: { id: session.id },
      data: { refreshToken: newRefreshToken, lastSeen: new Date() }
    });

    sendSuccess(res, { token: newAccessToken, refreshToken: newRefreshToken }, 200, undefined, 'Token refreshed');
  } catch (err) {
    next(err);
  }
}





