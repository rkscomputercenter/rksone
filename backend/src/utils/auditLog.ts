import { Prisma, PrismaClient, AuditAction } from '@prisma/client';

type TransactionClient = Prisma.TransactionClient;

/**
 * Centralized audit log writer.
 * MUST be called within a prisma.$transaction() to ensure atomicity.
 * 
 * Fix #4: All mutations pass through this — no bypass possible.
 * Fix #8: Used inside prisma.$transaction() for atomic writes.
 */
export async function writeAuditLog(
  tx: TransactionClient,
  userId: string,
  action: AuditAction,
  tableName: string,
  recordId: string,
  oldValue: object | null,
  newValue: object | null
): Promise<void> {
  await tx.log.create({
    data: {
      userId,
      action,
      tableName,
      recordId,
      oldValue: oldValue as Prisma.InputJsonValue ?? Prisma.JsonNull,
      newValue: newValue as Prisma.InputJsonValue ?? Prisma.JsonNull,
    },
  });
}

/**
 * Wraps a Prisma mutation in a transaction that also writes an audit log.
 * This is the primary way ALL mutations should be performed.
 * 
 * Usage:
 *   const result = await withAuditLog(prisma, userId, 'CREATE', 'transactions', id, null, newData, async (tx) => {
 *     return tx.transaction.create({ data: ... });
 *   });
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function withAuditLog<T = any>(
  prisma: PrismaClient,
  userId: string,
  action: AuditAction,
  tableName: string,
  getRecordId: (result: any) => string,
  oldValue: object | null,
  getNewValue: (result: any) => object | null,
  operation: (tx: TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    const result = await operation(tx);

    await writeAuditLog(
      tx,
      userId,
      action,
      tableName,
      getRecordId(result),
      oldValue,
      getNewValue(result)
    );

    return result;
  });
}
