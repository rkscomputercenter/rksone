# HANDOFF — Qenbel migration

Date of handoff: 2026-10-21. Written from a session opened in `D:\shop-rks` (production). Continue from `D:\shop-rks-qenbel`.

## 1. Goal
Run the same system at **https://rks.qenbel.site** (new Render service + new Supabase DB), while the **old system `shop-rks.onrender.com` keeps running** for a while. Reason: installed Android APKs fetch `version.json`, the APK and the API from the old URL. Later the old server will push a "bridge" update that moves installed apps to the new URL.

## 2. Decisions locked (don't re-litigate)
- Option B: separate folder + **fresh git repo** (no history, no heavy files).
- Old URL stays alive; this folder never modifies production.
- New APK must keep `applicationId com.shoprks.app` and be signed with the **same keystore** as v1.0.x APKs (Android update requirement). The keystore stays outside git: the original file is at `D:\shop-rks\frontend\android\app\release.keystore` (tracked in the old repo). Create `frontend/android/keystore.properties` (see `.example`) pointing at it.
- Native server origin comes from `VITE_SERVER_ORIGIN`, default `https://rks.qenbel.site` (`frontend/src/config.ts`).

## 3. What was done in this folder
Source = `git archive HEAD` of production (tracked files only), then:
- Removed: all `.apk`/`.exe`, `asset/`, committed keystore, `backend/logs`, scratch/patch scripts, `Readness...txt`.
- `frontend/src/config.ts` (+ `vite-env.d.ts`): `SERVER_ORIGIN`, `API_BASE_URL_NATIVE`. `api/client.ts` and `components/AppUpdater.tsx` use it instead of hard-coded `shop-rks.onrender.com`.
- `desktop-wrapper/main.js` loads `https://rks.qenbel.site`.
- `backend/src/app.ts`: CORS no longer allows every `*.onrender.com`; allows `qenbel.site` and `*.qenbel.site` (+ `ALLOWED_ORIGINS`, LAN, localhost).
- `auth.controller.ts` `verifyDownload`: APK path now read from `public/version.json` (fallback `/download`) instead of a hard-coded `v1.0.41` filename.
- `cron.service.ts`: removed `runOneTimeCorrection` (hard-coded July 2026 balance fixes keyed on `SystemConfig.version`).
- `entrypoint.sh`: `prisma db push --accept-data-loss` -> `prisma db push` (will now fail instead of silently dropping data). Not yet replaced by `migrate deploy` (see §6).
- `frontend/android/app/build.gradle`: signing credentials read from gitignored `keystore.properties` (no passwords in git).
- `.gitignore`: apk/aab/exe/keystore/keystore.properties/local.properties/logs.
- `render.yaml`, `deploy.yml`, `DEPLOYMENT.md`, `.env.example`, `STARTUP_INSTRUCTIONS.md`: renamed to `rks-qenbel` / `rks.qenbel.site`.

## 4. Verified vs not verified
Verified: `npm ci` + `prisma generate` + `tsc --noEmit` pass for backend and frontend.
**Not verified:** running the app, Docker build, any DB migration/restore, Render/Supabase setup, Android build with the keystore, Electron.

## 5. Bug backlog (found in analysis; none fixed yet) — in priority order
Money / permissions:
1. `middleware/auth.ts` `authenticate()` never copies `customPermissions` from the JWT into `req.user` -> `CUSTOM` roles can never pass `requireRole`/`isAdminOrAbove`.
2. Shop-scope bypass: `transactions.controller.ts` / `expenses.controller.ts` use `shop: shop ? shop : {in: shopAccess}` -> user can read other shop via `?shop=`. Update/delete don't check shop access either.
3. `expenses.controller.ts` `approveExpense`: no `status === PENDING` check (double approval deducts twice); balance check outside the DB transaction (race).
4. `updateExpense`: spreads `req.body` (writes client `updatedAt`, allows `shop` change without access check); editing amount of an APPROVED expense doesn't adjust bank balance.
5. Optimistic lock is read-then-write (not atomic) in transactions + expenses; move `updatedAt` into the `where` of the update.
6. `createTransaction` lets any user create new `Service` rows via `serviceName`.
Cron / data:
7. `cron.service.ts` `createAnalyticsSnapshots` buckets by UTC date (`toISOString`) — wrong day for entries before 05:30 IST; also loads whole tables into memory. These snapshots replace deleted raw data permanently.
8. Auto-cleanup deletes transactions/expenses even if the Excel export doesn't exist (export only generated in a 5-day window).
9. Reconciliation (`runCashReconciliation`/`runOnlineReconciliation`) not atomic; no unique key on `AutoTransaction(type,date)`; ignores shop split; only today/yesterday are re-checked.
10. `logs/logs.cleanup.ts` `startLogCleanupJob()` is never called -> audit logs never rotate (README claims 60 days).
Auth / ops:
11. `JWT_EXPIRES_IN` unused (hard-coded 15m/7d); access+refresh share one secret and no token-type claim; `?token=` query auth; suspended-account response before password check leaks account existence; every failed login writes a `SystemAlert`; `LoginAttempt` model unused; 3+ DB queries and a `console.log` per request in `authenticate`.
12. Socket.IO `origin:'*'` + credentials; no session re-check; role room from stale token.
13. `utils/validation.ts` `validateQuery`/`validateParams` messages use plain `"..."` strings so `$field` is printed literally.
14. `xlsx@0.18.5` known vulns (export only). Duplicate `morgan` in `app.ts`; startup negative-transaction cleanup in `listen()`; `seed.js` + `seed.ts` both exist; `vite.config.ts` proxy port 5001 vs backend 5000.
15. Schema: add `(shop, createdAt)` indexes; string-typed statuses -> enums; `DataExport.fileData` stores Excel in Postgres.

## 6. Open decisions for the user
- `android-native/` (untracked Kotlin app in production folder, ~55 source files, references the old URL in `ApiClient.kt`/`AuthInterceptor.kt`): **not copied**. Copy it here? (exclude `build/`, `.gradle/`, `local.properties`.)
- Entry script: switch to `prisma migrate deploy`? The old DB was created with `db push`; migrations may have drifted from `schema.prisma`. Needs a dry run on an empty Supabase DB (`prisma migrate diff`) before changing.
- Supabase: confirm RLS (`20260521140000_enable_rls_prisma_migrations`) covers every table; use pooler URL (6543, `pgbouncer=true`) for the app, direct URL for migrations (`directUrl` in `schema.prisma`).
- GitHub repo name/remote for this folder (placeholder name used in docs: `hemapriyan-rk/rks-qenbel`).

## 7. Cutover plan (high level)
1. Create Supabase project + Render service (`rks-qenbel`), set env (`DATABASE_URL`, new `JWT_SECRET`, `ALLOWED_ORIGINS=https://rks.qenbel.site`). Attach the domain.
2. Dry run: `pg_dump` prod -> restore into new DB; compare row counts and bank balances. **The new DB is a snapshot — data diverges the moment people use the old system.** Plan a final dump/restore in a maintenance window (`SystemConfig.maintenanceMode`) just before users move.
3. Build the bridge APK from this folder (new origin, same applicationId + original keystore, higher `versionCode`/`versionName`). Place it in the **old** repo's `frontend/public` and bump the old `version.json` — that is the only change ever made in production for this migration, and only with the user's explicit approval.
4. After users have moved: retire the old service.

## 8. Next steps (suggested)
1. Commit baseline (done below if `git log` shows it), decide §6 items.
2. Fix §5 items 1–7 (money/permissions/IST snapshots), then 8–10 (cron), each as a small commit.
3. Add minimal tests around transactions, expense approval, bank balance and reconciliation.
4. Supabase/Render setup + dry-run restore.

## 9. Database backup (2026-10-21)
- Live DB = Supabase project `vfzrfkzkenqjzhvilgqp`. Direct host (`db.<ref>.supabase.co`) is IPv6-only and does not resolve from this PC; use the **Mumbai session pooler** `aws-1-ap-south-1.pooler.supabase.com:5432`, user `postgres.vfzrfkzkenqjzhvilgqp`. Port 6543 pooler can't be used for pg_dump.
- Backup `rks_20261021_184714` stored in `D:ecovery`, `D:\shop-rksackups`, `D:\shop-rks-qenbelackups` (git-ignored). Details/restore steps: `D:ecovery\README.md`; script: `D:ecoveryackup-db.sh` (credentials in `D:ecovery\.supabase_conn` / `.supabase_pw`, outside git).
- Verified: checksums OK in all 3 copies; row counts per table in the dump equal live (18 tables). A full test-restore into a scratch Postgres was NOT completed (Docker Desktop stopped responding) — do that dry run before cutover.
- `_prisma_migrations` has 14 rows in live, so the live DB was migrated with `prisma migrate` at some point (relevant to the `migrate deploy` question in section 6).
- Re-run the backup right before cutover. The DB password was shared in chat, so rotate it after the migration.
