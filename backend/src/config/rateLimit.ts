import type { Request } from 'express';
import jwt from 'jsonwebtoken';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { env } from './env';

const WINDOW_MS = 15 * 60 * 1000;
/** Per signed-in person: far above what one person clicking through the app needs. */
export const USER_LIMIT = 1500;
/** Per address for requests without a valid token (sign-in page, health checks). */
export const ANON_LIMIT = 300;

/**
 * Bucket for the API limiter. Staff in the shop share one public IP, so counting by IP
 * made a busy day return 429s for everyone (and the app then signed people out).
 * A request with a valid access token counts against that user; anything else against its IP.
 * The token is verified, so a made-up token can't buy a fresh bucket.
 */
export function apiLimiterKey(req: Request): string {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(header.slice(7), env.JWT_SECRET) as { userId?: string };
      if (payload?.userId) return `user:${payload.userId}`;
    } catch {
      // expired or invalid: fall back to the address
    }
  }
  return `ip:${ipKeyGenerator(req.ip ?? '')}`;
}

export const apiLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: (req) => (apiLimiterKey(req).startsWith('user:') ? USER_LIMIT : ANON_LIMIT),
  keyGenerator: apiLimiterKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Wait a minute and try again.' },
  skip: () => env.NODE_ENV === 'test',
});
