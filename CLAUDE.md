# CLAUDE.md — RKS Computer Centre & Xerox (Qenbel migration copy)

Read this first, then `HANDOFF.md` (state + next steps) and `docs/BUSINESS_RULES.md` (rules the code must keep).

## What this folder is
This is the **migration copy** of the live system. It will be deployed to **https://rks.qenbel.site** on a **new Render service + new Supabase project**.

- **Production is a different folder: `D:\shop-rks`** (live at https://shop-rks.onrender.com, GitHub `hemapriyan-rk/shop-rks`, auto-deploys on push to `main`).
- **Never edit, commit, or push anything in `D:\shop-rks` from a session in this folder.** If a change must go to production, tell the user and let them decide.
- This folder has its own git repo (no remote yet). History is intentionally not carried over (old repo was 1 GB: APKs, an .exe, a committed keystore).
- Do not add a remote or push without the user's explicit go-ahead.

## Stack
- Backend: Node 20+, Express 4, TypeScript, Prisma 5, PostgreSQL (Supabase), Socket.IO, node-cron, zod, winston. `backend/`
- Frontend: React 18, Vite, TypeScript, Recharts, Capacitor 8 (Android). `frontend/`
- Desktop: Electron wrapper (`desktop-wrapper/`, loads the server URL). Backup sidecar: `backup/`.
- Deploy: root `Dockerfile` (multi-stage; Express serves the built frontend from `/app/public`), `render.yaml`, `.github/workflows/deploy.yml` (Render deploy hook).

## Commands
```
# backend (from backend/)
npm ci && npx prisma generate
npm run dev            # ts-node-dev, reads backend env (DATABASE_URL, JWT_SECRET required)
npx tsc --noEmit       # typecheck  (passes as of handoff)
npm run build          # tsc -> dist/

# frontend (from frontend/)
npm ci
npm run dev            # vite on 5173, proxies /api -> localhost:5001  (NOTE: backend defaults to PORT 5000; set PORT=5001 or fix vite.config.ts)
npx tsc --noEmit       # typecheck  (passes as of handoff)
npm run build
```
There are no tests and no lint config yet.

## Architecture map
- `backend/src/app.ts` entry. Modules in `backend/src/modules/<feature>/{*.controller.ts,*.routes.ts}`: auth, users, roles, services, transactions, expenses, banks, analytics, logs, system (+ `cron.service.ts`), health.
- `backend/src/middleware/auth.ts`: `authenticate`, `requireRole`, `isAdminOrAbove`.
- `backend/src/utils/auditLog.ts`: `withAuditLog` — all mutations should go through it.
- `backend/prisma/schema.prisma` + `migrations/`.
- Frontend: `src/api/client.ts` (axios + refresh-token interceptor), `src/config.ts` (server origin for native app), `src/pages/**`, `src/context/*`.

## Hard rules for this codebase
1. All time logic is **IST (Asia/Kolkata)**. Never bucket days with `toISOString().split('T')[0]` (that is UTC).
2. Money changes (bank balances, reconciliation) must be atomic (`prisma.$transaction`) and audit-logged.
3. Permission checks live in the backend; never rely on the frontend.
4. Keep the rules in `docs/BUSINESS_RULES.md` intact when refactoring — especially reconciliation and cleanup.
5. No secrets in git: `.env`, `keystore.properties`, `*.keystore`, `*.apk`, `*.exe` are gitignored. Do not print secrets from env files.
6. Android/APK constraints (do not break): keep `applicationId com.shoprks.app` and sign with the **original** release keystore, or installed apps cannot update in place.

## Status
See `HANDOFF.md`. Short version: baseline copy done and typechecks; URLs decoupled from the old server; behaviour bug fixes (list in HANDOFF.md §5) are **not** done yet.
