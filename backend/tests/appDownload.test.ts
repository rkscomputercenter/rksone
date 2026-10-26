import { beforeEach, describe, expect, it } from 'vitest';
import { api, auth, createUser, prisma, resetDb } from './helpers';

beforeEach(resetDb);

describe('Android app download', () => {
  it('gives a signed-in user the APK link without a password, and tells the super admins', async () => {
    const staff = await createUser('USER');

    const res = await api().get('/api/auth/app-download').set(auth(staff.token));

    expect(res.status).toBe(200);
    expect(res.body.data.apkUrl).toBe('https://downloads.example.test/RKS_ONE.apk');
    const alerts = await prisma.systemAlert.findMany({ where: { message: { contains: 'downloaded the Android App' } } });
    expect(alerts).toHaveLength(1);
  });

  it('refuses someone who is not signed in', async () => {
    const res = await api().get('/api/auth/app-download');
    expect(res.status).toBe(401);
  });

  it('still lets someone who is not signed in fetch it with a correct username and password', async () => {
    const staff = await createUser('USER');
    const { username } = await prisma.user.findUniqueOrThrow({ where: { id: staff.id } });

    const ok = await api().post('/api/auth/verify-download').send({ username, password: 'test-password' });
    const bad = await api().post('/api/auth/verify-download').send({ username, password: 'wrong' });

    expect(ok.status).toBe(200);
    expect(ok.body.data.apkUrl).toBe('https://downloads.example.test/RKS_ONE.apk');
    expect(bad.status).toBe(401);
  });
});
