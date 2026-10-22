import { beforeEach, describe, expect, it } from 'vitest';
import { api, auth, createPendingExpense, createService, createUser, prisma, resetDb } from './helpers';

beforeEach(resetDb);

describe('shop scope', () => {
  it('refuses to list another shop through ?shop=', async () => {
    const staff = await createUser('USER', { shopAccess: ['SHOP_COMPUTER'] });

    for (const path of ['/api/transactions', '/api/expenses', '/api/analytics/today-summary', '/api/services']) {
      const res = await api().get(path).query({ shop: 'SHOP_XEROX' }).set(auth(staff.token));
      expect(res.status, path).toBe(403);
    }
  });

  it('lists only the shops the user can access when no shop is given', async () => {
    const staff = await createUser('USER', { shopAccess: ['SHOP_COMPUTER'] });
    await createService('Aadhaar print', 'SHOP_COMPUTER');
    await createService('Xerox A4', 'SHOP_XEROX');

    const res = await api().get('/api/services').set(auth(staff.token));

    expect(res.status).toBe(200);
    expect(res.body.data.map((s: any) => s.name)).toEqual(['Aadhaar print']);
  });

  it('hides another shop\'s expense from editing', async () => {
    const xeroxOnlyAdmin = await createUser('CUSTOM', {
      shopAccess: ['SHOP_XEROX'], permissions: { allRecords: { read: true, write: true } },
    });
    const staff = await createUser('USER');
    const expense = await createPendingExpense(staff.id, 10, 'SHOP_COMPUTER');

    const res = await api().patch(`/api/expenses/${expense.id}`).set(auth(xeroxOnlyAdmin.token))
      .send({ note: 'x', updatedAt: expense.updatedAt.toISOString() });

    expect(res.status).toBe(404);
  });
});

describe('custom roles', () => {
  it('gives a CUSTOM role with allRecords.read the admin view of all transactions', async () => {
    const other = await createUser('USER');
    const service = await createService();
    await prisma.transaction.create({ data: { userId: other.id, serviceId: service.id, unitPrice: 5, totalPrice: 5 } });

    const viewer = await createUser('CUSTOM', { permissions: { allRecords: { read: true, write: false } } });
    const list = await api().get('/api/transactions').set(auth(viewer.token));

    expect(list.status).toBe(200);
    expect(list.body.meta.total).toBe(1);
  });

  it('reads permissions from the database, so a change applies without logging in again', async () => {
    const viewer = await createUser('CUSTOM', { permissions: { allRecords: { read: false, write: false } } });
    const other = await createUser('USER');
    const service = await createService();
    await prisma.transaction.create({ data: { userId: other.id, serviceId: service.id, unitPrice: 5, totalPrice: 5 } });

    expect((await api().get('/api/transactions').set(auth(viewer.token))).body.meta.total).toBe(0);
    await prisma.customRole.updateMany({ data: { permissions: { allRecords: { read: true, write: false } } } });
    expect((await api().get('/api/transactions').set(auth(viewer.token))).body.meta.total).toBe(1);
  });
});

describe('authentication', () => {
  it('blocks a suspended user immediately, not after the token expires', async () => {
    const staff = await createUser('USER');
    await prisma.user.update({ where: { id: staff.id }, data: { isSuspended: true } });

    const res = await api().get('/api/auth/me').set(auth(staff.token));
    expect(res.status).toBe(401);
  });

  it('does not accept a refresh token as an access token', async () => {
    const staff = await createUser('USER');
    const res = await api().get('/api/auth/me').set(auth(staff.refreshToken));
    expect(res.status).toBe(401);
  });
});
