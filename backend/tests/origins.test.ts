import { describe, expect, it } from 'vitest';
import { api } from './helpers';

// The web app (Vercel) and the API (Render) are on different domains, so CORS decides who may call
describe('CORS', () => {
  const allowOrigin = async (origin: string) =>
    (await api().get('/api/health').set('Origin', origin)).headers['access-control-allow-origin'];

  it('allows the configured web app domains, even when configured with spaces or a trailing slash', async () => {
    expect(await allowOrigin('https://rksone.qenbel.site')).toBe('https://rksone.qenbel.site');
    expect(await allowOrigin('https://app.rksone.qenbel.site')).toBe('https://app.rksone.qenbel.site');
  });

  it('allows the Android app (https://localhost) and shop PCs on the LAN', async () => {
    expect(await allowOrigin('https://localhost')).toBe('https://localhost');
    expect(await allowOrigin('http://192.168.1.20:5173')).toBe('http://192.168.1.20:5173');
  });

  it('gives other sites no CORS headers, and does not fail the request', async () => {
    for (const origin of ['https://evil.example', 'https://other.qenbel.site', 'https://x.trycloudflare.com']) {
      const res = await api().get('/api/health').set('Origin', origin);
      expect(res.headers['access-control-allow-origin'], origin).toBeUndefined();
      expect(res.status, origin).not.toBe(500);
    }
  });
});
