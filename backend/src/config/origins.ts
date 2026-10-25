import { env } from './env';

/**
 * Which browser origins may call the API (HTTP and Socket.IO).
 *
 * The web app is served by Vercel on its own domain, so production origins come from
 * ALLOWED_ORIGINS (e.g. https://rksone.qenbel.site,https://app.rksone.qenbel.site).
 * Always allowed: requests with no Origin (curl, server-to-server), localhost (vite dev
 * and the Capacitor Android app, whose origin is https://localhost) and private LAN
 * addresses (shop PCs on the local Wi-Fi).
 */
const PRIVATE_SUBNET_REGEX = /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/;

const configuredOrigins = env.ALLOWED_ORIGINS
  .split(',')
  .map(o => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  if (configuredOrigins.includes(origin)) return true;
  try {
    const { hostname } = new URL(origin);
    return hostname === 'localhost' || hostname === '127.0.0.1' || PRIVATE_SUBNET_REGEX.test(hostname);
  } catch {
    return false;
  }
}

/**
 * Origin callback in the shape both `cors` and Socket.IO accept. A refused origin gets no
 * CORS headers (the browser blocks it) instead of an error, so it doesn't log as a 500.
 */
export function originCallback(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void): void {
  callback(null, isAllowedOrigin(origin));
}
