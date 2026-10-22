import { beforeEach, describe, expect, it } from 'vitest';
import { api, auth, bankBalance, createBank, createPendingExpense, createUser, prisma, resetDb } from './helpers';

beforeEach(resetDb);

const bankLogs = (bankId: string) =>
  prisma.log.findMany({ where: { tableName: 'bank_accounts', recordId: bankId }, orderBy: { createdAt: 'asc' } });

describe('admin-created expenses', () => {
  it('deducts the bank and writes both audit rows in one transaction', async () => {
    const admin = await createUser('ADMIN');
    const bank = await createBank('SBI', 1000);

    const res = await api().post('/api/expenses').set(auth(admin.token))
      .send({ amount: 250, category: 'Paper', bankId: bank.id });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('APPROVED');
    expect(await bankBalance(bank.id)).toBe(750);
    expect(await prisma.log.count({ where: { tableName: 'expenses' } })).toBe(1);
    expect((await bankLogs(bank.id)).map(l => (l.newValue as any).action)).toEqual(['EXPENSE_DEDUCTION']);
  });

  it('rejects an expense the bank cannot cover and leaves nothing behind', async () => {
    const admin = await createUser('ADMIN');
    const bank = await createBank('SBI', 100);

    const res = await api().post('/api/expenses').set(auth(admin.token))
      .send({ amount: 250, category: 'Paper', bankId: bank.id });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Insufficient balance in SBI/);
    expect(await bankBalance(bank.id)).toBe(100);
    expect(await prisma.expense.count()).toBe(0);
    expect(await prisma.log.count()).toBe(0);
  });

  it('never overdraws when two expenses race for the same balance', async () => {
    const admin = await createUser('ADMIN');
    const bank = await createBank('SBI', 300);

    const results = await Promise.all([1, 2].map(() =>
      api().post('/api/expenses').set(auth(admin.token)).send({ amount: 200, category: 'Paper', bankId: bank.id })));

    expect(results.map(r => r.status).sort()).toEqual([201, 400]);
    expect(await bankBalance(bank.id)).toBe(100);
  });
});

describe('approving and rejecting', () => {
  it('approves once: a second approval is refused and the bank is deducted only once', async () => {
    const admin = await createUser('ADMIN');
    const staff = await createUser('USER');
    const bank = await createBank('SBI', 1000);
    const expense = await createPendingExpense(staff.id, 300);

    const first = await api().patch(`/api/expenses/${expense.id}/approve`).set(auth(admin.token))
      .send({ status: 'APPROVED', bankId: bank.id });
    const second = await api().patch(`/api/expenses/${expense.id}/approve`).set(auth(admin.token))
      .send({ status: 'APPROVED', bankId: bank.id });

    expect(first.status).toBe(200);
    expect(second.status).toBe(409);
    expect(await bankBalance(bank.id)).toBe(700);
  });

  it('deducts only once when two admins approve at the same moment', async () => {
    const admin = await createUser('ADMIN');
    const staff = await createUser('USER');
    const bank = await createBank('SBI', 1000);
    const expense = await createPendingExpense(staff.id, 300);

    const results = await Promise.all([1, 2].map(() =>
      api().patch(`/api/expenses/${expense.id}/approve`).set(auth(admin.token)).send({ status: 'APPROVED', bankId: bank.id })));

    expect(results.map(r => r.status).sort()).toEqual([200, 409]);
    expect(await bankBalance(bank.id)).toBe(700);
  });

  it('refuses approval the bank cannot cover and keeps the expense pending', async () => {
    const admin = await createUser('ADMIN');
    const staff = await createUser('USER');
    const bank = await createBank('SBI', 100);
    const expense = await createPendingExpense(staff.id, 300);

    const res = await api().patch(`/api/expenses/${expense.id}/approve`).set(auth(admin.token))
      .send({ status: 'APPROVED', bankId: bank.id });

    expect(res.status).toBe(400);
    expect((await prisma.expense.findUniqueOrThrow({ where: { id: expense.id } })).status).toBe('PENDING');
    expect(await bankBalance(bank.id)).toBe(100);
  });

  it('refunds the bank when an approved expense is rejected', async () => {
    const admin = await createUser('ADMIN');
    const staff = await createUser('USER');
    const bank = await createBank('SBI', 1000);
    const expense = await createPendingExpense(staff.id, 300);
    await api().patch(`/api/expenses/${expense.id}/approve`).set(auth(admin.token)).send({ status: 'APPROVED', bankId: bank.id });

    const res = await api().patch(`/api/expenses/${expense.id}/approve`).set(auth(admin.token)).send({ status: 'REJECTED' });

    expect(res.status).toBe(200);
    expect(await bankBalance(bank.id)).toBe(1000);
    expect((await bankLogs(bank.id)).map(l => (l.newValue as any).action)).toEqual(['EXPENSE_DEDUCTION', 'EXPENSE_REFUND']);
  });
});

describe('deleting', () => {
  it('refunds the bank when a super admin deletes an approved expense', async () => {
    const owner = await createUser('SUPER_ADMIN');
    const bank = await createBank('SBI', 1000);
    const created = await api().post('/api/expenses').set(auth(owner.token)).send({ amount: 400, category: 'Rent', bankId: bank.id });

    const res = await api().delete(`/api/expenses/${created.body.data.id}`).set(auth(owner.token));

    expect(res.status).toBe(200);
    expect(await bankBalance(bank.id)).toBe(1000);
    expect(await prisma.expense.count()).toBe(0);
  });
});

describe('editing', () => {
  it('returns the money when staff edit their approved expense back to pending', async () => {
    const admin = await createUser('ADMIN');
    const staff = await createUser('USER');
    const bank = await createBank('SBI', 1000);
    const expense = await createPendingExpense(staff.id, 300);
    const approved = await api().patch(`/api/expenses/${expense.id}/approve`).set(auth(admin.token))
      .send({ status: 'APPROVED', bankId: bank.id });

    const res = await api().patch(`/api/expenses/${expense.id}`).set(auth(staff.token))
      .send({ amount: 350, updatedAt: approved.body.data.updatedAt });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('PENDING');
    expect(res.body.data.bankId).toBeNull();
    expect(await bankBalance(bank.id)).toBe(1000);
  });

  it('moves only the difference when an admin changes an approved amount', async () => {
    const admin = await createUser('ADMIN');
    const bank = await createBank('SBI', 1000);
    const created = await api().post('/api/expenses').set(auth(admin.token)).send({ amount: 300, category: 'Paper', bankId: bank.id });

    const up = await api().patch(`/api/expenses/${created.body.data.id}`).set(auth(admin.token))
      .send({ amount: 450.5, updatedAt: created.body.data.updatedAt });
    expect(up.status).toBe(200);
    expect(await bankBalance(bank.id)).toBe(549.5);

    const down = await api().patch(`/api/expenses/${created.body.data.id}`).set(auth(admin.token))
      .send({ amount: 100, updatedAt: up.body.data.updatedAt });
    expect(down.status).toBe(200);
    expect(await bankBalance(bank.id)).toBe(900);
  });

  it('ignores shop, status and bankId sent in an edit', async () => {
    const staff = await createUser('USER');
    const expense = await createPendingExpense(staff.id, 50);

    const res = await api().patch(`/api/expenses/${expense.id}`).set(auth(staff.token)).send({
      note: 'milk', shop: 'SHOP_XEROX', status: 'APPROVED', bankId: '00000000-0000-0000-0000-000000000000',
      updatedAt: expense.updatedAt.toISOString(),
    });

    expect(res.status).toBe(200);
    const after = await prisma.expense.findUniqueOrThrow({ where: { id: expense.id } });
    expect([after.shop, after.status, after.bankId, after.note]).toEqual(['SHOP_COMPUTER', 'PENDING', null, 'milk']);
  });

  it('answers 409 to an edit based on a stale copy', async () => {
    const staff = await createUser('USER');
    const expense = await createPendingExpense(staff.id, 50);
    const stale = expense.updatedAt.toISOString();

    await api().patch(`/api/expenses/${expense.id}`).set(auth(staff.token)).send({ note: 'first', updatedAt: stale });
    const res = await api().patch(`/api/expenses/${expense.id}`).set(auth(staff.token)).send({ note: 'second', updatedAt: stale });

    expect(res.status).toBe(409);
    expect((await prisma.expense.findUniqueOrThrow({ where: { id: expense.id } })).note).toBe('first');
  });
});
