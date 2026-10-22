import { Router } from 'express';
import { login, getMe, changePassword, verifyDownload, forgotPassword, refreshToken } from './auth.controller';
import { authenticate } from '../../middleware/auth';
import { validate, loginSchema, changePasswordSchema } from '../../utils/validation';

const router = Router();

// POST /api/auth/login — public
import slowDown from 'express-slow-down';
import { ipKeyGenerator } from 'express-rate-limit';
import { env } from '../../config/env';

// Progressive delay: start delaying after 4 failed/successful attempts
// 5th attempt = 2s delay, 6th = 4s, 7th = 6s... (up to max 20s delay)
// Keyed by IP + Username to prevent innocent troops from being slowed down by attackers on the same network
const loginSpeedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  delayAfter: 4, // Allow 4 rapid requests per 15 minutes before slowing down
  delayMs: (hits) => (hits - 4) * 2000, // Add 2s delay per extra hit
  maxDelayMs: 20000, // Max 20 second delay
  keyGenerator: (req) => {
    // ipKeyGenerator groups IPv6 addresses by /56 so one client can't rotate addresses to dodge the delay
    return `${ipKeyGenerator(req.ip || 'unknown')}_${req.body?.username?.toLowerCase()?.trim() || 'unknown'}`;
  },
  skip: () => env.NODE_ENV === 'test',
});

router.post('/login', loginSpeedLimiter, validate(loginSchema), login);

// POST /api/auth/forgot-password - public
router.post('/forgot-password', forgotPassword);

// POST /api/auth/refresh - public
router.post('/refresh', refreshToken);

// POST /api/auth/verify-download - public (with basic auth body)
router.post('/verify-download', verifyDownload);

// GET /api/auth/me — protected
router.get('/me', authenticate, getMe);

// POST /api/auth/logout — protected
router.post('/logout', authenticate, (req, res, next) => {
  const { sessionId } = req.user!;
  if (!sessionId) {
    res.json({ success: true });
    return;
  }
  
  import('../../config/prisma').then(({ prisma }) => {
    prisma.session.update({
      where: { id: sessionId },
      data: { logoutTime: new Date() }
    }).then(() => res.json({ success: true }))
      .catch(next);
  });
});

// POST /api/auth/change-password — protected
router.post('/change-password', authenticate, validate(changePasswordSchema), changePassword);

export default router;


