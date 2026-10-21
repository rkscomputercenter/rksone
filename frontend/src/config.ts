/**
 * Where the native (Capacitor) app and update checker find the server.
 * Web builds are served by the backend itself, so they use relative URLs.
 * Override at build time with VITE_SERVER_ORIGIN (no trailing slash).
 */
export const SERVER_ORIGIN: string =
  (import.meta.env.VITE_SERVER_ORIGIN as string | undefined) || 'https://rks.qenbel.site';

export const API_BASE_URL_NATIVE = `${SERVER_ORIGIN}/api`;
