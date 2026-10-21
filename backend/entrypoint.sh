#!/bin/sh
# ============================================================
# RKS Backend Entrypoint
# Runs Prisma migrations, seeds if needed, then starts the app
# ============================================================
set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " RKS – Computer Centre and Xerox"
echo " Backend starting at $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "[SYNC] Pushing Prisma schema to database..."
npx prisma db push

echo "[SEED] Checking if seed is required..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.count().then(count => {
  if (count === 0) {
    console.log('[SEED] No users found — running seed...');
    process.exit(1);
  } else {
    console.log('[SEED] Database already has data (' + count + ' users). Skipping seed.');
    process.exit(0);
  }
}).catch(e => {
  console.error('[SEED] Error checking users:', e.message);
  process.exit(0);
});
" && NEEDS_SEED=false || NEEDS_SEED=true

if [ "$NEEDS_SEED" = "true" ]; then
  node prisma/seed.js || echo "[SEED] Seed script not found, skipping."
fi

echo "[START] Launching Express server..."
exec node dist/app.js
