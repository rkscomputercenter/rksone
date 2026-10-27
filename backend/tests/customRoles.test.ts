import { beforeEach, describe, expect, it } from 'vitest';
import { api, auth, createBank, createPendingExpense, createService, createUser, prisma, resetDb, bankBalance } from './helpers';

beforeEach(resetDb);

const view = { read: true, write: false };
const change = { read: true, write: true };

describe('custom role: every page the menu shows must work', () => {
  it('lets a role that views banks open the bank book, but not move money', async () => {
    const bank = await createBank('CANARA', 100);
    const viewer = await createUser('CUSTOM', { permissions: { banks: view } });

    expect((await api().get('/api/banks').set(auth(viewer.token))).status).toBe(200);
    expect((await api().get('/api/banks/analytics').set(auth(viewer.token))).status).toBe(200);
    const deposit = await api().patch(`/api/banks/${bank.id}/deposit`).set(auth(viewer.token)).send({ amount: 50 });
    expect(deposit.status).toBe(403);
    expect(await bankBalance(bank.id)).toBe(100);
  });

  it('lets a role that changes banks deposit, but never create, rename or delete', async () => {
    const bank = await createBank('CANARA', 100);
    const keeper = await createUser('CUSTOM', { permissions: { banks: change } });

    const deposit = await api().patch(`/api/banks/${bank.id}/deposit`).set(auth(keeper.token)).send({ amount: 50 });
    expect(deposit.status).toBe(200);
    expect(await bankBalance(bank.id)).toBe(150);
    expect((await api().post('/api/banks').set(auth(keeper.token)).send({ name: 'X' })).status).toBe(403);
    expect((await api().delete(`/api/banks/${bank.id}`).set(auth(keeper.token))).status).toBe(403);
  });

  it('keeps banks closed to a role without the banks permission', async () => {
    const other = await createUser('CUSTOM', { permissions: { analytics: view } });
    expect((await api().get('/api/banks').set(auth(other.token))).status).toBe(403);
  });

  it('opens analytics and exports to a role that views analytics, and nothing else', async () => {
    const analyst = await createUser('CUSTOM', { permissions: { analytics: view } });

    expect((await api().get('/api/analytics/monthly').set(auth(analyst.token))).status).toBe(200);
    expect((await api().get('/api/analytics/daily').set(auth(analyst.token))).status).toBe(200);
    expect((await api().get('/api/system/exports').set(auth(analyst.token))).status).toBe(200);
    expect((await api().post('/api/analytics/adjust').set(auth(analyst.token)).send({})).status).toBe(403);
    expect((await api().get('/api/logs').set(auth(analyst.token))).status).toBe(403);
  });

  it('lets a role that changes services edit the price list, but a viewer cannot', async () => {
    const service = await createService('Xerox A4', 'SHOP_COMPUTER', 2);
    const editor = await createUser('CUSTOM', { permissions: { services: change } });
    const viewer = await createUser('CUSTOM', { permissions: { services: view } });

    const ok = await api().patch(`/api/services/${service.id}`).set(auth(editor.token)).send({ price: 3 });
    expect(ok.status).toBe(200);
    const no = await api().patch(`/api/services/${service.id}`).set(auth(viewer.token)).send({ price: 9 });
    expect(no.status).toBe(403);
    expect(Number((await prisma.service.findUniqueOrThrow({ where: { id: service.id } })).price)).toBe(3);
  });

  it('keeps a price-list editor inside their own shop', async () => {
    const xeroxService = await createService('Xerox A4', 'SHOP_XEROX');
    const editor = await createUser('CUSTOM', { shopAccess: ['SHOP_COMPUTER'], permissions: { services: change } });

    expect((await api().patch(`/api/services/${xeroxService.id}`).set(auth(editor.token)).send({ price: 9 })).status).toBe(404);
    expect((await api().post('/api/services').set(auth(editor.token))
      .send({ name: 'Scan', category: 'OTHER', price: 5, shop: 'SHOP_XEROX' })).status).toBe(403);
  });

  it('lets a role that changes expense categories manage them', async () => {
    const editor = await createUser('CUSTOM', { permissions: { expenseCategories: change } });
    const viewer = await createUser('CUSTOM', { permissions: { expenseCategories: view } });

    expect((await api().post('/api/expense-categories').set(auth(editor.token)).send({ name: 'Tea' })).status).toBeLessThan(300);
    expect((await api().post('/api/expense-categories').set(auth(viewer.token)).send({ name: 'Snacks' })).status).toBe(403);
  });
});

describe('custom role: viewing is not changing', () => {
  it('stops a role that only views all records from editing or deleting other staff\'s sales', async () => {
    const staff = await createUser('USER');
    const service = await createService();
    const sale = await prisma.transaction.create({ data: { userId: staff.id, serviceId: service.id, unitPrice: 5, totalPrice: 5 } });
    const viewer = await createUser('CUSTOM', { permissions: { allRecords: view } });

    expect((await api().patch(`/api/transactions/${sale.id}`).set(auth(viewer.token))
      .send({ updatedAt: sale.updatedAt.toISOString(), quantity: 5 })).status).toBe(403);
    expect((await api().delete(`/api/transactions/${sale.id}`).set(auth(viewer.token))).status).toBe(403);
    expect(await prisma.transaction.count()).toBe(1);
  });

  it('lets a role that changes all records edit and delete other staff\'s sales from today', async () => {
    const staff = await createUser('USER');
    const service = await createService();
    const sale = await prisma.transaction.create({ data: { userId: staff.id, serviceId: service.id, unitPrice: 5, totalPrice: 5 } });
    const editor = await createUser('CUSTOM', { permissions: { allRecords: change } });

    const edit = await api().patch(`/api/transactions/${sale.id}`).set(auth(editor.token))
      .send({ updatedAt: sale.updatedAt.toISOString(), quantity: 3 });
    expect(edit.status).toBe(200);
    expect((await api().delete(`/api/transactions/${sale.id}`).set(auth(editor.token))).status).toBe(200);
  });

  it('records a viewer\'s own expense as waiting for approval, with no bank taken from', async () => {
    const bank = await createBank('CASH-BALANCE', 100);
    const viewer = await createUser('CUSTOM', { permissions: { allRecords: view } });

    const res = await api().post('/api/expenses').set(auth(viewer.token)).send({ amount: 20, category: 'Tea' });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('PENDING');
    expect(await bankBalance(bank.id)).toBe(100);
  });

  it('approves a role\'s expense at once when it may change records, taking it from the chosen bank', async () => {
    const bank = await createBank('CASH-BALANCE', 100);
    const keeper = await createUser('CUSTOM', { permissions: { allRecords: change } });

    const res = await api().post('/api/expenses').set(auth(keeper.token)).send({ amount: 20, category: 'Tea', bankId: bank.id });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('APPROVED');
    expect(await bankBalance(bank.id)).toBe(80);
  });

  it('lets only a role that changes all records approve expenses, and lets it pick a bank', async () => {
    const bank = await createBank('CASH-BALANCE', 100);
    const staff = await createUser('USER');
    const expense = await createPendingExpense(staff.id, 30);
    const viewer = await createUser('CUSTOM', { permissions: { allRecords: view } });
    const keeper = await createUser('CUSTOM', { permissions: { allRecords: change } });

    expect((await api().patch(`/api/expenses/${expense.id}/approve`).set(auth(viewer.token))
      .send({ status: 'APPROVED', bankId: bank.id })).status).toBe(403);
    expect((await api().get('/api/banks').set(auth(keeper.token))).status).toBe(200);
    expect((await api().patch(`/api/expenses/${expense.id}/approve`).set(auth(keeper.token))
      .send({ status: 'APPROVED', bankId: bank.id })).status).toBe(200);
    expect(await bankBalance(bank.id)).toBe(70);
  });
});

describe('custom role: logs', () => {
  it('shows a records-only role the history of sales and expenses, and nothing about users or banks', async () => {
    const admin = await createUser('SUPER_ADMIN');
    await prisma.log.createMany({ data: [
      { userId: admin.id, action: 'UPDATE', tableName: 'transactions', recordId: 'a' },
      { userId: admin.id, action: 'UPDATE', tableName: 'users', recordId: 'b' },
      { userId: admin.id, action: 'UPDATE', tableName: 'bank_accounts', recordId: 'c' },
    ] });
    const records = await createUser('CUSTOM', { permissions: { allRecords: view } });
    const system = await createUser('CUSTOM', { permissions: { salaryLogs: view } });

    const mine = await api().get('/api/logs').set(auth(records.token));
    expect(mine.status).toBe(200);
    expect(mine.body.data.map((l: any) => l.tableName)).toEqual(['transactions']);
    expect((await api().get('/api/logs').query({ tableName: 'users' }).set(auth(records.token))).body.data).toEqual([]);
    expect((await api().get('/api/logs').set(auth(system.token))).body.meta.total).toBe(3);
  });

  it('leaves out the before/after values unless asked, and never lets a custom role delete logs', async () => {
    const admin = await createUser('SUPER_ADMIN');
    await prisma.log.create({ data: { userId: admin.id, action: 'UPDATE', tableName: 'transactions', recordId: 'a', oldValue: { q: 1 }, newValue: { q: 2 } } });
    const system = await createUser('CUSTOM', { permissions: { salaryLogs: change } });

    const slim = await api().get('/api/logs').set(auth(system.token));
    expect(slim.body.data[0].oldValue).toBeUndefined();
    const full = await api().get('/api/logs').query({ details: 'true' }).set(auth(system.token));
    expect(full.body.data[0].newValue).toEqual({ q: 2 });
    expect((await api().delete('/api/logs/cleanup').set(auth(system.token))).status).toBe(403);
  });

  it('gives a staff-name list to roles that look at records, and to nobody else', async () => {
    await createUser('USER');
    const records = await createUser('CUSTOM', { permissions: { allRecords: view } });
    const banker = await createUser('CUSTOM', { permissions: { banks: view } });

    const list = await api().get('/api/users/directory').set(auth(records.token));
    expect(list.status).toBe(200);
    expect(Object.keys(list.body.data[0]).sort()).toEqual(['id', 'isActive', 'name', 'username']);
    expect((await api().get('/api/users/directory').set(auth(banker.token))).status).toBe(403);
  });
});

describe('custom role: accounts and roles', () => {
  it('refuses a custom-role account with no role chosen, or a role that does not exist', async () => {
    const boss = await createUser('SUPER_ADMIN');
    const base = { name: 'Priya', username: 'priya', password: 'secret123', role: 'CUSTOM' };

    const none = await api().post('/api/users').set(auth(boss.token)).send({ ...base, customRoleId: '' });
    expect(none.status).toBe(400);
    const missing = await api().post('/api/users').set(auth(boss.token)).send({ ...base, customRoleId: 'does-not-exist' });
    expect(missing.status).toBe(400);
    expect(await prisma.user.count({ where: { username: 'priya' } })).toBe(0);
  });

  it('refuses an account with no shop at all', async () => {
    const boss = await createUser('SUPER_ADMIN');
    const res = await api().post('/api/users').set(auth(boss.token))
      .send({ name: 'Ravi', username: 'ravi', password: 'secret123', role: 'USER', shopAccess: [] });
    expect(res.status).toBe(400);
  });

  it('returns the custom role of each user, so the edit form can show it', async () => {
    const boss = await createUser('SUPER_ADMIN');
    const worker = await createUser('CUSTOM', { permissions: { banks: view } });

    const list = await api().get('/api/users').set(auth(boss.token));
    const row = list.body.data.find((u: any) => u.id === worker.id);
    expect(row.customRoleId).toBeTruthy();
  });

  it('saves a role with "change" meaning "view too", and refuses an unknown module', async () => {
    const boss = await createUser('SUPER_ADMIN');

    const ok = await api().post('/api/roles').set(auth(boss.token))
      .send({ name: 'Cashier', permissions: { banks: { read: false, write: true } } });
    expect(ok.status).toBe(201);
    expect(ok.body.data.permissions.banks).toEqual({ read: true, write: true });
    expect(ok.body.data.permissions.services).toEqual({ read: false, write: false });

    const bad = await api().post('/api/roles').set(auth(boss.token))
      .send({ name: 'Typo', permissions: { bankz: { read: true, write: true } } });
    expect(bad.status).toBe(400);
  });

  it('applies a change to a role on the very next request', async () => {
    const worker = await createUser('CUSTOM', { permissions: { banks: view } });
    expect((await api().get('/api/banks').set(auth(worker.token))).status).toBe(200);

    await prisma.customRole.updateMany({ data: { permissions: { banks: { read: false, write: false } } } });
    expect((await api().get('/api/banks').set(auth(worker.token))).status).toBe(403);
  });
});
