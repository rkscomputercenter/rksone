/**
 * RKS Backend — Main Application Entry Point
 *
 * CRITICAL: Set timezone BEFORE any imports
 * Fix #1: IST enforcement at process level
 */
process.env.TZ = 'Asia/Kolkata';

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { stream, logger } from './utils/logger';

import { env } from './config/env';
import { originCallback } from './config/origins';
import { apiLimiter } from './config/rateLimit';
import { globalErrorHandler } from './utils/response';

// Route imports
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/users/users.routes';
import serviceRoutes from './modules/services/services.routes';
import transactionRoutes from './modules/transactions/transactions.routes';
import expenseRoutes from './modules/expenses/expenses.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';
import logsRoutes from './modules/logs/logs.routes';
import healthRoutes from './modules/health/health.routes';
import bankRoutes from './modules/banks/banks.routes';
import systemRoutes from './modules/system/system.routes';
import expenseCategoryRoutes from './modules/expenses/expense-categories.routes';
import rolesRoutes from './modules/roles/roles.routes';

// Background jobs
import { initCronJobs } from './modules/system/cron.service';

const app = express();

// Render (and Cloudflare, if proxied) sit in front of the app. Without this, req.ip is the
// proxy's address: every user shares one rate-limit bucket and alerts log the wrong IP.
app.set('trust proxy', env.TRUST_PROXY_HOPS);

// ── Security ──────────────────────────────────────────────────────
app.use(helmet());

// The web app lives on another domain (Vercel); see config/origins.ts for who may call the API
app.use(cors({
  origin: originCallback,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting: per signed-in user, or per IP without a token (config/rateLimit.ts)
app.use('/api/', apiLimiter);

// ── Middleware ─────────────────────────────────────────────────────
app.use(compression({ filter: (req, res) => { if (req.url.endsWith('.apk')) return false; return compression.filter(req, res); } }));
// One request log line per request (through winston); none in tests
if (env.NODE_ENV !== 'test') app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev', { stream }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── Routes ─────────────────────────────────────────────────────────
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/logs', logsRoutes);
app.use('/api/banks', bankRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/expense-categories', expenseCategoryRoutes);
app.use('/api/roles', rolesRoutes);

// The web app is deployed separately (Vercel); this server only answers /api/*
app.get('/', (_req, res) => {
  res.json({ success: true, data: { service: 'RKS ONE API', health: '/api/health' } });
});

// 404 handler — catches unmatched API routes
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.path} not found` });
});

// Global error handler
app.use(globalErrorHandler);

// ── Start Server ───────────────────────────────────────────────────
import { createServer } from 'http';
import { initSocket } from './config/socket';

const httpServer = createServer(app);
const io = initSocket(httpServer);

const PORT = env.PORT;

// Tests import the app (supertest) without starting the server or the cron jobs
if (env.NODE_ENV !== 'test') httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(` RKS Backend running on 0.0.0.0:${PORT}`);
  console.log(` Environment: ${env.NODE_ENV}`);
  console.log(` Timezone: ${process.env.TZ}`);
  console.log(` Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  // Start cron jobs
  
  // One-time cleanup for salary records
  
  // One-time cleanup for orphaned negative transactions
  (async () => {
    try {
      const { prisma } = require('./config/prisma');
      const negativeTxs = await prisma.transaction.findMany({
        where: { totalPrice: { lt: 0 } }
      });
      if (negativeTxs.length > 0) {
        console.log(`Found ${negativeTxs.length} negative transactions to clean up.`);
        for (const tx of negativeTxs) {
          try {
            await prisma.transaction.delete({ where: { id: tx.id } });
            console.log(`Successfully deleted negative transaction ${tx.id} (${tx.totalPrice})`);
          } catch (e: any) {
            console.error(`Failed to clean up negative transaction ${tx.id}:`, e.message);
          }
        }
      }
    } catch (e: any) {
      console.error('Failed negative transaction cleanup routine:', e.message);
    }
  })();

    initCronJobs();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received — shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received — shutting down...');
  process.exit(0);
});

export default app;



