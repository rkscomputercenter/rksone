import { beforeEach, describe, expect, it } from 'vitest';
import { api, auth, bankBalance, createBank, createService, createUser, prisma, resetDb } from './helpers';

beforeEach(resetDb);

describe('creating transactions', () => {
  it('auto-creates the "Others" quick-entry service for staff', async () => {
    const staff = await createUser('USER');
    const res = await api().post('/api/transactions').set(auth(staff.token))
      .send({ serviceName: 'Others', quantity: 1, unitPrice: 40, paymentMethod: 'CASH' });

    expect(res.status).toBe(201);
    expect(Number(res.body.data.totalPrice)).toBe(40);
  });

  it('does not let staff create arbitrary services by name', async () => {
    const staff = await createUser('USER');
    const res = await api().post('/api/transactions').set(auth(staff.token))
      .send({ serviceName: 'Free money', quantity: 1, unitPrice: 1, paymentMethod: 'CASH' });

    expect(res.status).toBe(404);
    expect(await prisma.service.count()).toBe(0);
  });

  it('refuses a shop the user cannot access before touching services', async () => {
    const staff = await createUser('USER', { shopAccess: ['SHOP_COMPUTER'] });
    const res = await api().post('/api/transactions').set(auth(staff.token))
      .send({ serviceName: 'Others', quantity: 1, unitPrice: 5, paymentMethod: 'CASH', shop: 'SHOP_XEROX' });

    expect(res.status).toBe(403);
    expect(await prisma.service.count()).toBe(0);
  });
});

describe('editing transactions', () => {
  it('answers 409 when two edits race from the same copy', async () => {
    const staff = await createUser('USER');
    const service = await createService();
    const created = await api().post('/api/transactions').set(auth(staff.token))
      .send({ serviceId: service.id, quantity: 1, paymentMethod: 'CASH' });
    const updatedAt = created.body.data.updatedAt;

    const results = await Promise.all([3, 5].map(quantity =>
      api().patch(`/api/transactions/${created.body.data.id}`).set(auth(staff.token)).send({ quantity, updatedAt })));

    expect(results.map(r => r.status).sort()).toEqual([200, 409]);
    expect(await prisma.log.count({ where: { tableName: 'transactions', action: 'UPDATE' } })).toBe(1);
  });
});

describe('dashboard summary', () => {
  it('returns the pending expense count as a number', async () => {
    const admin = await createUser('ADMIN');
    const staff = await createUser('USER');
    await prisma.expense.createMany({
      data: [1, 2].map(() => ({ userId: staff.id, amount: 10, category: 'Tea', status: 'PENDING' as const })),
    });

    const res = await api().get('/api/analytics/today-summary').set(auth(admin.token));

    expect(res.status).toBe(200);
    expect(res.body.data.pendingExpenseCount).toBe(2);
  });
});

describe('bank adjustments', () => {
  it('refuses a decrease below zero', async () => {
    const admin = await createUser('ADMIN');
    const bank = await createBank('CASH', 100);

    const res = await api().patch(`/api/banks/${bank.id}/adjust`).set(auth(admin.token)).send({ amount: -150 });

    expect(res.status).toBe(400);
    expect(await bankBalance(bank.id)).toBe(100);
  });

  it('keeps every concurrent adjustment instead of overwriting', async () => {
    const admin = await createUser('ADMIN');
    const bank = await createBank('CASH', 100);

    await Promise.all([10, 20, 30, 40].map(amount =>
      api().patch(`/api/banks/${bank.id}/adjust`).set(auth(admin.token)).send({ amount })));

    expect(await bankBalance(bank.id)).toBe(200);
  });
});
