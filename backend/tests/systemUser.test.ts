import bcrypt from 'bcrypt';
import { beforeEach, describe, expect, it } from 'vitest';
import { seedSystemUser } from '../src/modules/system/cron.service';
import { api, prisma, resetDb } from './helpers';

beforeEach(resetDb);

describe('SYSTEM_AUTO account', () => {
  it('replaces the old fixed password (published in the repo) with a random one', async () => {
    await prisma.user.create({
      data: {
        name: 'System Auto', username: 'SYSTEM_AUTO', role: 'SUPER_ADMIN',
        passwordHash: await bcrypt.hash('system_auto_do_not_login', 4),
      },
    });

    await seedSystemUser();

    const user = await prisma.user.findUniqueOrThrow({ where: { username: 'SYSTEM_AUTO' } });
    expect(await bcrypt.compare('system_auto_do_not_login', user.passwordHash)).toBe(false);
    const res = await api().post('/api/auth/login').send({ username: 'SYSTEM_AUTO', password: 'system_auto_do_not_login' });
    expect(res.status).toBe(401);
  });

  it('creates the account with a random password when it is missing', async () => {
    const user = await seedSystemUser();

    expect(user?.role).toBe('SUPER_ADMIN');
    expect(await bcrypt.compare('system_auto_do_not_login', user!.passwordHash)).toBe(false);
  });
});
