import jwt from 'jsonwebtoken';
import type { Request } from 'express';
import { describe, expect, it } from 'vitest';
import { apiLimiterKey } from '../src/config/rateLimit';

const req = (ip: string, authorization?: string) => ({ ip, headers: authorization ? { authorization } : {} }) as unknown as Request;
const token = (payload: object, secret = process.env.JWT_SECRET!) => jwt.sign(payload, secret, { expiresIn: '15m' });

// Staff in the shop share one public IP; the limiter must count each signed-in person separately
describe('API rate-limit bucket', () => {
  it('gives two signed-in users on the same Wi-Fi separate buckets', () => {
    const a = apiLimiterKey(req('203.0.113.7', `Bearer ${token({ userId: 'u1' })}`));
    const b = apiLimiterKey(req('203.0.113.7', `Bearer ${token({ userId: 'u2' })}`));
    expect(a).toBe('user:u1');
    expect(b).toBe('user:u2');
  });

  it('counts a forged or expired token against the IP, so it cannot buy a fresh bucket', () => {
    const forged = apiLimiterKey(req('203.0.113.7', `Bearer ${token({ userId: 'u1' }, 'not-the-secret')}`));
    const expired = apiLimiterKey(req('203.0.113.7', `Bearer ${jwt.sign({ userId: 'u1', exp: 1 }, process.env.JWT_SECRET!)}`));
    expect(forged).toBe('ip:203.0.113.7');
    expect(expired).toBe('ip:203.0.113.7');
  });

  it('counts requests without a token by IP, grouping IPv6 by /56 subnet', () => {
    expect(apiLimiterKey(req('198.51.100.4'))).toBe('ip:198.51.100.4');
    expect(apiLimiterKey(req('2001:db8:abcd:12ff::1'))).toBe(apiLimiterKey(req('2001:db8:abcd:1200::99')));
  });
});
