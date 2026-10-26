/**
 * RKS ONE runs on two servers:
 *   - the web app (Vercel):  https://rksone.qenbel.site  (app.rksone.qenbel.site redirects there)
 *   - the API (Render):      https://api.rksone.qenbel.site
 * Override at build time with VITE_APP_ORIGIN / VITE_API_ORIGIN (no trailing slash).
 */
import { Capacitor } from '@capacitor/core';

export const APP_NAME = 'RKS ONE';

/** This build's version (package.json). Installed apps compare it with <web app>/version.json. */
export const APP_VERSION: string = __APP_VERSION__;

const env = import.meta.env;
const trim = (url: string) => url.replace(/\/$/, '');

/** Web app origin: where version.json and the download page live. */
export const APP_ORIGIN: string = trim((env.VITE_APP_ORIGIN as string | undefined) || 'https://rksone.qenbel.site');

/**
 * API origin. In `vite dev` the browser uses '' so requests go through the dev proxy
 * (vite.config.ts → localhost:5001); the Android app always needs the full URL.
 */
export const API_ORIGIN: string = env.DEV && !Capacitor.isNativePlatform() && !env.VITE_API_ORIGIN
  ? ''
  : trim((env.VITE_API_ORIGIN as string | undefined) || 'https://api.rksone.qenbel.site');

export const API_BASE_URL = `${API_ORIGIN}/api`;

/** Socket.IO needs an absolute origin; in dev it shares the page's origin (proxied). */
export const SOCKET_ORIGIN: string = API_ORIGIN || window.location.origin;
