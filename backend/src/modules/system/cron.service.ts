import cron from 'node-cron';
import { prisma } from '../../config/prisma';
import * as xlsx from 'xlsx';
import { socketBroadcast } from '../../config/socket';

/**
 * Snapshot function to preserve 1 year of daily analytics before raw transactions are deleted.
 * Call this before deleting transactions for a specific date range.
 */
async function createAnalyticsSnapshots(endDate: Date) {
  // Aggregate transactions by date up to endDate
  const transactions = await prisma.transaction.findMany({
    where: { createdAt: { lt: endDate } },
    select: { createdAt: true, paymentMethod: true, totalPrice: true, userId: true, shop: true }
  });

  const expenses = await prisma.expense.findMany({
    where: { createdAt: { lt: endDate }, status: 'APPROVED' },
    select: { createdAt: true, amount: true, userId: true, shop: true }
  });

  const snapshotMap = new Map<string, any>();
  const userSnapshotMap = new Map<string, any>(); // key: `${userId}_${dateStr}`

  for (const t of transactions) {
    const dStr = t.createdAt.toISOString().split('T')[0];
    const shop = t.shop;
    const globalKey = `${dStr}_${shop}`;
    const userKey = `${t.userId}_${dStr}_${shop}`;
    
    // Global
    if (!snapshotMap.has(globalKey)) {
      snapshotMap.set(globalKey, { dateStr: dStr, shop, income: 0, cashIncome: 0, onlineIncome: 0, otherIncome: 0, shopXeroxIncome: 0, expenses: 0, transactionCount: 0 });
    }
    const day = snapshotMap.get(globalKey)!;
    
    // User
    if (!userSnapshotMap.has(userKey)) {
      userSnapshotMap.set(userKey, { userId: t.userId, dateStr: dStr, shop, income: 0, cashIncome: 0, onlineIncome: 0, otherIncome: 0, shopXeroxIncome: 0, expenses: 0, transactionCount: 0 });
    }
    const userDay = userSnapshotMap.get(userKey)!;

    const amount = Number(t.totalPrice);
    
    day.income += amount;
    day.transactionCount += 1;
    userDay.income += amount;
    userDay.transactionCount += 1;
    
    if (t.paymentMethod === 'CASH') { day.cashIncome += amount; userDay.cashIncome += amount; }
    if (t.paymentMethod === 'ONLINE') { day.onlineIncome += amount; userDay.onlineIncome += amount; }
    if (t.paymentMethod === 'OTHER') { day.otherIncome += amount; userDay.otherIncome += amount; }
    if (t.paymentMethod === 'SHOP_XEROX') { day.shopXeroxIncome += amount; userDay.shopXeroxIncome += amount; }
  }

  for (const e of expenses) {
    const dStr = e.createdAt.toISOString().split('T')[0];
    const shop = e.shop;
    const globalKey = `${dStr}_${shop}`;
    const userKey = `${e.userId}_${dStr}_${shop}`;
    
    // Global
    if (!snapshotMap.has(globalKey)) {
      snapshotMap.set(globalKey, { dateStr: dStr, shop, income: 0, cashIncome: 0, onlineIncome: 0, otherIncome: 0, shopXeroxIncome: 0, expenses: 0, transactionCount: 0 });
    }
    const day = snapshotMap.get(globalKey)!;
    day.expenses += Number(e.amount);

    // User
    if (!userSnapshotMap.has(userKey)) {
      userSnapshotMap.set(userKey, { userId: e.userId, dateStr: dStr, shop, income: 0, cashIncome: 0, onlineIncome: 0, otherIncome: 0, shopXeroxIncome: 0, expenses: 0, transactionCount: 0 });
    }
    const userDay = userSnapshotMap.get(userKey)!;
    userDay.expenses += Number(e.amount);
  }

  // Save to database
  for (const [key, stats] of snapshotMap.entries()) {
    const dateObj = new Date(stats.dateStr);
    const { dateStr, ...updateData } = stats;
    await prisma.dailyAnalyticsSnapshot.upsert({
      where: { date_shop: { date: dateObj, shop: stats.shop } },
      update: { ...updateData, profit: stats.income - stats.expenses },
      create: { date: dateObj, ...updateData, profit: stats.income - stats.expenses }
    });
  }

  // Save to user database
  for (const [key, stats] of userSnapshotMap.entries()) {
    const dateObj = new Date(stats.dateStr);
    const { userId, dateStr, ...updateData } = stats;
    await prisma.userDailyAnalyticsSnapshot.upsert({
      where: { userId_date_shop: { userId, date: dateObj, shop: stats.shop } },
      update: { ...updateData, profit: stats.income - stats.expenses },
      create: { userId, date: dateObj, ...updateData, profit: stats.income - stats.expenses }
    });
  }
}

/**
 * Generate Excel buffer with 3 sheets: Transactions, Expenses, Audit Logs
 */
async function generateExcelBuffer(endDate: Date): Promise<Buffer> {
  const wb = xlsx.utils.book_new();

  const transactions = await prisma.transaction.findMany({
    where: { createdAt: { lt: endDate } },
    include: { service: true, user: true }
  });
  const txData = transactions.map(t => ({
    ID: t.id,
    Date: t.createdAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    Operator: t.user?.name || 'Unknown',
    Service: t.service?.name || 'Unknown',
    PaymentMethod: t.paymentMethod,
    Quantity: t.quantity,
    UnitPrice: Number(t.unitPrice),
    TotalPrice: Number(t.totalPrice),
    Notes: t.notes || ''
  }));
  const txSheet = xlsx.utils.json_to_sheet(txData);
  xlsx.utils.book_append_sheet(wb, txSheet, 'Transactions');

  const expenses = await prisma.expense.findMany({
    where: { createdAt: { lt: endDate } },
    include: { user: true }
  });
  const expData = expenses.map(e => ({
    ID: e.id,
    Date: e.createdAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    Operator: e.user?.name || 'Unknown',
    Category: e.category,
    Amount: Number(e.amount),
    Status: e.status,
    Notes: e.note || ''
  }));
  const expSheet = xlsx.utils.json_to_sheet(expData);
  xlsx.utils.book_append_sheet(wb, expSheet, 'Expenses');

  const logs = await prisma.log.findMany({
    where: { createdAt: { lt: endDate } },
    include: { user: true }
  });
  const logData = logs.map(l => ({
    ID: l.id,
    Date: l.createdAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    Operator: l.user?.name || 'Unknown',
    Action: l.action,
    Table: l.tableName,
    RecordID: l.recordId
  }));
  const logSheet = xlsx.utils.json_to_sheet(logData);
  xlsx.utils.book_append_sheet(wb, logSheet, 'Audit Logs');

  // Generate buffer
  return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

export async function performManualCleanup(endDate: Date, types: string[]) {
  // 1. Snapshot analytics before deletion
  if (types.includes('transactions') || types.includes('expenses')) {
    await createAnalyticsSnapshots(endDate);
  }

  // 2. Perform deletion
  if (types.includes('transactions')) await prisma.transaction.deleteMany({ where: { createdAt: { lt: endDate } } });
  if (types.includes('expenses')) await prisma.expense.deleteMany({ where: { createdAt: { lt: endDate } } });
}

async function seedSystemUser() {
  try {
    let sysUser = await prisma.user.findUnique({ where: { username: 'SYSTEM_AUTO' } });
    if (!sysUser) {
      const bcrypt = require('bcrypt');
      const hash = await bcrypt.hash('system_auto_do_not_login', 10);
      sysUser = await prisma.user.create({
        data: {
          name: 'System Auto',
          username: 'SYSTEM_AUTO',
          passwordHash: hash,
          role: 'SUPER_ADMIN',
          isActive: true
        }
      });
      console.log('✅ SYSTEM_AUTO user created for audit logs.');
    }
    return sysUser;
  } catch (err) {
    console.error('Failed to seed SYSTEM_AUTO user:', err);
    return null;
  }
}

export function initCronJobs() {
  seedSystemUser();

  // ── Render Anti-Sleep Ping ──
  // Runs every 10 minutes ONLY between 6 AM and 11:59 PM (IST), Monday through Saturday
  cron.schedule('*/10 6-23 * * 1-6', async () => {
    try {
      const pingUrl = process.env.RENDER_EXTERNAL_URL 
        ? `${process.env.RENDER_EXTERNAL_URL}/api/health`
        : `http://localhost:${process.env.PORT || 5001}/api/health`;
      
      const res = await fetch(pingUrl);
      if (res.ok) {
        console.log(`[Anti-Sleep] Pinged ${pingUrl} successfully.`);
      } else {
        console.warn(`[Anti-Sleep] Pinged ${pingUrl} but got status: ${res.status}`);
      }
    } catch (err) {
      console.error('[Anti-Sleep] Failed to ping self:', err);
    }
  }, {
    timezone: "Asia/Kolkata"
  });

  // ── Automatic Transactions (Bank Reconciliation Failsafe & Trigger) ──
  cron.schedule('*/10 * * * *', async () => {
    try {
      await checkAndRunReconciliations();
    } catch (err) {
      console.error('[Reconciliation Cron] Failed:', err);
    }
  }, { timezone: "Asia/Kolkata" });



  // ── Periodic Financial Update (Every 2 Hours) ──
  cron.schedule('0 */2 * * *', async () => {
    try {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      const start = new Date(`${today}T00:00:00+05:30`);
      const end = new Date(`${today}T23:59:59.999+05:30`);

      const [txs, exps] = await Promise.all([
        prisma.transaction.aggregate({
          where: { createdAt: { gte: start, lte: end } },
          _sum: { totalPrice: true }
        }),
        prisma.expense.aggregate({
          where: { createdAt: { gte: start, lte: end }, status: 'APPROVED' },
          _sum: { amount: true }
        })
      ]);

      const income = Number(txs._sum.totalPrice || 0);
      const expenses = Number(exps._sum.amount || 0);
      const profit = income - expenses;

      socketBroadcast({
        type: 'PERIODIC_UPDATE',
        targetRoles: ['SUPER_ADMIN', 'ADMIN'],
        payload: { income, expenses, profit }
      });
    } catch (err) {
      console.error('[Periodic Update] Failed:', err);
    }
  }, { timezone: "Asia/Kolkata" });

  cron.schedule('0 1 * * *', async () => {
    console.log('🕒 Running Daily Maintenance Job...');
    try {
      const config = await prisma.systemConfig.findUnique({ where: { id: 1 } });
      if (!config) return;

      const now = new Date();

      // Clean up expired DataExports
      const expiredExports = await prisma.dataExport.deleteMany({
        where: { expiresAt: { lt: now } }
      });
      if (expiredExports.count > 0) {
        console.log(`🗑️ Deleted ${expiredExports.count} expired Excel exports.`);
      }

      // Cleanup Old Snapshots (> 1 year)
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      await prisma.dailyAnalyticsSnapshot.deleteMany({
        where: { date: { lt: oneYearAgo } }
      });

      if (!config.autoCleanupEnabled) return;

      // Handle Auto Cleanup Scheduling
      if (!config.nextCleanupDate) {
        // Set next cleanup to 1st of next month
        const nextDate = new Date(now.getFullYear(), now.getMonth() + 1, 1, 1, 0, 0);
        await prisma.systemConfig.update({ where: { id: 1 }, data: { nextCleanupDate: nextDate } });
        return;
      }

      const nextCleanup = new Date(config.nextCleanupDate);
      const timeDiff = nextCleanup.getTime() - now.getTime();
      const daysUntilCleanup = Math.ceil(timeDiff / (1000 * 3600 * 24));

      const targetDeletionDate = new Date(nextCleanup);
      targetDeletionDate.setMonth(targetDeletionDate.getMonth() - config.autoCleanupDurationMonths);

      // Phase 1: 5 days before, generate Excel
      if (daysUntilCleanup <= 5 && daysUntilCleanup > 0) {
        const existingExport = await prisma.dataExport.findFirst({
          where: { scheduledFor: nextCleanup }
        });
        if (!existingExport) {
          console.log(`📦 Generating Auto-Cleanup Excel Export (Target: < ${targetDeletionDate.toISOString()})...`);
          const buffer = await generateExcelBuffer(targetDeletionDate);
          
          const expires = new Date(nextCleanup);
          expires.setDate(expires.getDate() + 2); // Expire 2 days after cleanup

          await prisma.dataExport.create({
            data: {
              fileName: `RKS_Archive_${targetDeletionDate.toISOString().split('T')[0]}.xlsx`,
              fileData: buffer,
              scheduledFor: nextCleanup,
              expiresAt: expires
            }
          });
          console.log('✅ Export generated and stored in DB.');
        }
      }

      // Phase 2: Cleanup day
      if (daysUntilCleanup <= 0) {
        console.log(`🧹 Executing Auto-Cleanup for data older than ${targetDeletionDate.toISOString()}`);
        await performManualCleanup(targetDeletionDate, ['transactions', 'expenses']);
        
        // Schedule next cleanup (1st of next month)
        const newNextCleanup = new Date(now.getFullYear(), now.getMonth() + 1, 1, 1, 0, 0);
        await prisma.systemConfig.update({
          where: { id: 1 },
          data: { 
            lastCleanupDate: now,
            nextCleanupDate: newNextCleanup
          }
        });
        console.log('✅ Auto-cleanup complete.');
      }
      
    } catch (err) {
      console.error('❌ Cron Job Error:', err);
    }
  }, {
    timezone: "Asia/Kolkata"
  });

  // Cold Start Check: immediately run failsafe checks on boot (with 5-second buffer to ensure DB is ready)
  setTimeout(() => {
    console.log('🔄 Cold start buffer complete. Checking for missed reconciliations...');
    checkAndRunReconciliations().catch(console.error);
  }, 5000);
}

export async function checkAndRunReconciliations() {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    hour12: false
  });
  const now = new Date();
  const hourStr = formatter.format(now);
  const hours = parseInt(hourStr, 10);
  const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));

  // Check today
  if (hours >= 20) {
    await runCashReconciliation(nowIST);
  }
  if (hours === 23 && nowIST.getMinutes() >= 59) {
    await runOnlineReconciliation(nowIST);
  }

  // Always check yesterday to ensure we didn't sleep through the whole night
  const yesterdayIST = new Date(nowIST);
  yesterdayIST.setDate(yesterdayIST.getDate() - 1);
  await runCashReconciliation(yesterdayIST);
  await runOnlineReconciliation(yesterdayIST);
}

export async function runCashReconciliation(targetDate?: Date) {
  try {
    const sysUser = await prisma.user.findUnique({ where: { username: 'SYSTEM_AUTO' } });
    if (!sysUser) return;

    const dateToUse = targetDate || new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const dateStr = dateToUse.getFullYear() + '-' + String(dateToUse.getMonth() + 1).padStart(2, '0') + '-' + String(dateToUse.getDate()).padStart(2, '0');
    
    const start = new Date(`${dateStr}T00:00:00+05:30`);
    const end = new Date(`${dateStr}T23:59:59.999+05:30`);
    const dateOnly = new Date(`${dateStr}T00:00:00.000Z`);

    console.log('🕒 Running Cash Reconciliation Job...');

    const txs = await prisma.transaction.aggregate({
      where: {
        createdAt: { gte: start, lte: end },
        paymentMethod: { in: ['CASH', 'SHOP_XEROX'] }
      },
      _sum: { totalPrice: true }
    });

    const totalCash = Number(txs._sum.totalPrice || 0);

    const existing = await prisma.autoTransaction.findFirst({
      where: { type: 'CASH_RECONCILIATION', date: dateOnly }
    });

    if (existing) {
      if (Number(existing.amount) === totalCash) return; // No change
      
      const diff = totalCash - Number(existing.amount);
      
      let cashBank = await prisma.bankAccount.findUnique({ where: { name: 'CASH-BALANCE' } });
      if (cashBank) {
        await prisma.bankAccount.update({
          where: { id: cashBank.id },
          data: { balance: { increment: diff } }
        });
      }

      await prisma.autoTransaction.update({
        where: { id: existing.id },
        data: { amount: totalCash }
      });
      const alert = await prisma.systemAlert.create({
        data: { type: 'INFO', source: 'AUTO_TRANS', message: `Updated Cash Reconciliation. Difference of ₹${diff} applied for ${dateStr}.` }
      });
      socketBroadcast({ type: 'NEW_ALERT', targetRole: 'SUPER_ADMIN', payload: alert });
      console.log(`🔄 Updated Cash Reconciliation. Difference of ₹${diff} applied for ${dateStr}.`);
      return;
    }


    let cashBank = await prisma.bankAccount.findUnique({ where: { name: 'CASH-BALANCE' } });
    if (!cashBank) {
      cashBank = await prisma.bankAccount.create({ data: { name: 'CASH-BALANCE', isCash: true, balance: 0 } });
    }

    await prisma.bankAccount.update({
      where: { id: cashBank.id },
      data: { balance: { increment: totalCash } }
    });

    const autoTx = await prisma.autoTransaction.create({
      data: {
        type: 'CASH_RECONCILIATION',
        amount: totalCash,
        date: dateOnly,
        bankName: 'CASH-BALANCE'
      }
    });

    await prisma.log.create({
      data: {
        userId: sysUser.id,
        action: 'CREATE',
        tableName: 'auto_transactions',
        recordId: autoTx.id,
        newValue: JSON.parse(JSON.stringify(autoTx))
      }
    });

    const alert = await prisma.systemAlert.create({
      data: { type: 'SUCCESS', source: 'AUTO_TRANS', message: `Cash Reconciliation complete. Added ₹${totalCash} to CASH-BALANCE for ${dateStr}.` }
    });
    socketBroadcast({ type: 'NEW_ALERT', targetRole: 'SUPER_ADMIN', payload: alert });

    console.log(`✅ Cash Reconciliation complete. Added ₹${totalCash} to CASH-BALANCE for ${dateStr}.`);
  } catch (err) {
    console.error('Failed to run Cash Reconciliation:', err);
  }
}

export async function runOnlineReconciliation(targetDate?: Date) {
  try {
    const sysUser = await prisma.user.findUnique({ where: { username: 'SYSTEM_AUTO' } });
    if (!sysUser) {
      console.log('⚠️ SYSTEM_AUTO user not found. Skipping online reconciliation.');
      return;
    }

    const dateToUse = targetDate || new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const dateStr = dateToUse.getFullYear() + '-' + String(dateToUse.getMonth() + 1).padStart(2, '0') + '-' + String(dateToUse.getDate()).padStart(2, '0');
    
    const start = new Date(`${dateStr}T00:00:00+05:30`);
    const end = new Date(`${dateStr}T23:59:59.999+05:30`);
    const dateOnly = new Date(`${dateStr}T00:00:00.000Z`);

    console.log('🕒 Running Online Reconciliation Job...');

    const txs = await prisma.transaction.aggregate({
      where: {
        createdAt: { gte: start, lte: end },
        paymentMethod: 'ONLINE'
      },
      _sum: { totalPrice: true }
    });

    const totalOnline = Number(txs._sum.totalPrice || 0);

    const existing = await prisma.autoTransaction.findFirst({
      where: { type: 'ONLINE_RECONCILIATION', date: dateOnly }
    });

    if (existing) {
      if (Number(existing.amount) === totalOnline) return; // No change
      
      const diff = totalOnline - Number(existing.amount);
      
      let canaraBank = await prisma.bankAccount.findUnique({ where: { name: 'CANARA BANK' } });
      if (canaraBank) {
        await prisma.bankAccount.update({
          where: { id: canaraBank.id },
          data: { balance: { increment: diff } }
        });
      }

      await prisma.autoTransaction.update({
        where: { id: existing.id },
        data: { amount: totalOnline }
      });
      const alert = await prisma.systemAlert.create({
        data: { type: 'INFO', source: 'AUTO_TRANS', message: `Updated Online Reconciliation. Difference of ₹${diff} applied for ${dateStr}.` }
      });
      socketBroadcast({ type: 'NEW_ALERT', targetRole: 'SUPER_ADMIN', payload: alert });
      console.log(`🔄 Updated Online Reconciliation. Difference of ₹${diff} applied for ${dateStr}.`);
      return;
    }


    let canaraBank = await prisma.bankAccount.findUnique({ where: { name: 'CANARA BANK' } });
    if (!canaraBank) {
      canaraBank = await prisma.bankAccount.create({ data: { name: 'CANARA BANK', isCash: false, balance: 0 } });
    }

    await prisma.bankAccount.update({
      where: { id: canaraBank.id },
      data: { balance: { increment: totalOnline } }
    });

    const autoTx = await prisma.autoTransaction.create({
      data: {
        type: 'ONLINE_RECONCILIATION',
        amount: totalOnline,
        date: dateOnly,
        bankName: 'CANARA BANK'
      }
    });

    await prisma.log.create({
      data: {
        userId: sysUser.id,
        action: 'CREATE',
        tableName: 'auto_transactions',
        recordId: autoTx.id,
        newValue: JSON.parse(JSON.stringify(autoTx))
      }
    });

    const alert = await prisma.systemAlert.create({
      data: { type: 'SUCCESS', source: 'AUTO_TRANS', message: `Online Reconciliation complete. Added ₹${totalOnline} to CANARA BANK for ${dateStr}.` }
    });
    socketBroadcast({ type: 'NEW_ALERT', targetRole: 'SUPER_ADMIN', payload: alert });

    console.log(`✅ Online Reconciliation complete. Added ₹${totalOnline} to CANARA BANK for ${dateStr}.`);
  } catch (err) {
    console.error('Failed to run Online Reconciliation:', err);
  }
}
