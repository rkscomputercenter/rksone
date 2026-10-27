import bcrypt from 'bcrypt';
import request from 'supertest';
import { Role, Shop } from '@prisma/client';
import app from '../src/app';
import { prisma } from '../src/config/prisma';

export { app, prisma };
export const api = () => request(app);

export const PASSWORD = 'test-password';

/** Empties every table so each test starts from a known state. */
export async function resetDb(): Promise<void> {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  const list = tables.map(t => `"public"."${t.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

let userSeq = 0;

/** Creates a user and logs in through the real /auth/login endpoint. */
export async function createUser(
  role: Role,
  opts: { shopAccess?: Shop[]; permissions?: Record<string, { read: boolean; write: boolean }> } = {}
): Promise<{ id: string; token: string; refreshToken: string }> {
  const username = `${role.toLowerCase()}_${++userSeq}`;
  const customRole = opts.permissions
    ? await prisma.customRole.create({ data: { name: `role_${userSeq}`, permissions: opts.permissions } })
    : null;
  const user = await prisma.user.create({
    data: {
      name: username, username, role,
      passwordHash: await bcrypt.hash(PASSWORD, 4),
      shopAccess: opts.shopAccess ?? ['SHOP_COMPUTER'],
      customRoleId: customRole?.id,
    },
  });
  const res = await api().post('/api/auth/login').send({ username, password: PASSWORD });
  if (res.status !== 200) throw new Error(`login failed for ${username}: ${res.status} ${JSON.stringify(res.body)}`);
  return { id: user.id, token: res.body.data.token, refreshToken: res.body.data.refreshToken };
}

export const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

export async function createBank(name: string, balance: number) {
  return prisma.bankAccount.create({ data: { name, balance } });
}

export async function bankBalance(id: string): Promise<number> {
  const bank = await prisma.bankAccount.findUniqueOrThrow({ where: { id } });
  return Number(bank.balance);
}

export async function createService(name = 'Xerox A4', shop: Shop = 'SHOP_COMPUTER', price = 2) {
  return prisma.service.create({ data: { name, category: 'PRINTING', price, shop } });
}

/** Creates a PENDING expense directly (as a regular user would via the API). */
export async function createPendingExpense(userId: string, amount: number, shop: Shop = 'SHOP_COMPUTER') {
  return prisma.expense.create({ data: { userId, amount, category: 'Tea', shop, status: 'PENDING' } });
}
