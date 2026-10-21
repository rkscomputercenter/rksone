# Business rules the code must keep

Extracted from the code in the production folder (2026-10-21). "Intended" means what the code is trying to do; known deviations are listed in `HANDOFF.md` §5.

## Time
- Everything is IST (`Asia/Kolkata`); `process.env.TZ` is set first thing in `app.ts`. A "day" is 00:00:00.000–23:59:59.999 IST. Use `utils/time.ts` helpers (`getISTDayBounds`, `isToday`, `toISTDateString`).

## Roles
`USER`, `MANAGER`, `ADMIN`, `SUPER_ADMIN`, `CUSTOM` (permissions per module `{read, write}` from `CustomRole`).
- `ADMIN`/`SUPER_ADMIN` always have access to both shops; others use `User.shopAccess`.
- Regular users see only their own transactions/expenses; admins see all and may filter by `userId`.
- Regular users' expense list is always forced to today.
- `MANAGER` is treated as admin-level only for modules `services` and `expenseCategories`.
- Route gates: users CRUD, roles, system config/sessions/storage/alerts, bank create/rename/set/reset/delete, expense delete = `SUPER_ADMIN`; bank deposit/adjust, expense approve, exports, auto-transactions, users list, daily/monthly analytics = `ADMIN`+.

## Transactions (income)
- `totalPrice = unitPrice * quantity`; `unitPrice` defaults to the service price, can be overridden at creation.
- Payment methods: `CASH`, `ONLINE`, `OTHER`, `SHOP_XEROX`.
- Edit/delete: only **today's** records, and only own records unless admin; `SUPER_ADMIN` may edit/delete older records.
- Updates use optimistic locking on `updatedAt` (409 on mismatch).
- Every mutation writes an audit `Log` row atomically (`withAuditLog`).
- Creating with an unknown `serviceName` auto-creates a service (category `OTHER`); an inactive match is reactivated.

## Expenses
- Created by a non-admin: `PENDING`, no bank deduction.
- Created by admin+: `APPROVED` immediately, a `bankId` is required, balance must cover the amount, bank is decremented, and an extra `bank_accounts` audit row (`EXPENSE_DEDUCTION`) is written.
- Approve (`ADMIN`+): needs `bankId`, balance must cover, decrements bank in a DB transaction, audit rows written. Reject: status only.
- Edit: today only (SUPER_ADMIN any day); own expenses only unless SUPER_ADMIN; non-admin edits reset status to `PENDING`.
- Delete: `SUPER_ADMIN` only.

## Banks
- `CASH-BALANCE` (isCash) and `CANARA BANK` are created on demand by reconciliation. Balances change via: expense deduction, deposit, adjust, set, hard reset, and reconciliation. All changes appear in the audit log (`bank_accounts`).

## Auth / sessions
- Login creates a `Session`; access token 15 min, refresh token 7 days (stored on the session, rotated on refresh).
- A session can be kicked or logged out; `authenticate` rejects kicked/logged-out sessions, inactive users, temporarily banned users (`bannedUntil`).
- Maintenance mode (`SystemConfig.maintenanceMode`) blocks everyone except `SUPER_ADMIN` (login, API, downloads).
- Forgot-password creates a `PasswordResetRequest` for admins; response never reveals whether the user exists.
- APK download requires valid username+password (`/auth/verify-download`) and creates an INFO alert for super admins.

## Audit logs
- Retention intended: `LOG_RETENTION_DAYS` (60). **Currently not scheduled** (bug 10).

## Cron jobs (`modules/system/cron.service.ts`, timezone IST)
| Schedule | Job |
|---|---|
| boot | `seedSystemUser` -> `SYSTEM_AUTO` (`SUPER_ADMIN`) owns automatic audit rows; reconciliation does nothing if missing |
| boot +5 s | `checkAndRunReconciliations` (catch-up) |
| `*/10 6-23 * * 1-6` | self-ping `/api/health` (keeps Render awake; Mon–Sat 06:00–23:59) |
| `*/10 * * * *` | `checkAndRunReconciliations` |
| `0 */2 * * *` | socket broadcast of today's income/expenses/profit to ADMIN + SUPER_ADMIN |
| `0 1 * * *` | daily maintenance (below) |

Reconciliation:
- **Cash:** sum of `CASH` + `SHOP_XEROX` payments for the IST day -> `CASH-BALANCE`. Runs from 20:00 for today; every tick also re-checks yesterday.
- **Online:** sum of `ONLINE` payments -> `CANARA BANK`. Runs at 23:59 for today; yesterday re-checked on every tick.
- `OTHER` payments are not reconciled to any bank.
- Idempotent per (type, date) via `AutoTransaction`: first run adds the total; later runs apply only the difference (+ INFO alert). First run also writes an audit row as `SYSTEM_AUTO` and a SUCCESS alert.

Daily maintenance (01:00):
1. Delete expired `DataExport` rows.
2. Delete `DailyAnalyticsSnapshot` older than 1 year.
3. If `autoCleanupEnabled`: first run sets `nextCleanupDate` = 1st of next month 01:00. Within 5 days before it, generate one Excel export (transactions, expenses, logs older than `nextCleanupDate − autoCleanupDurationMonths`; expires 2 days after cleanup). On/after cleanup day: write analytics snapshots (global + per user) for the data being removed, delete old transactions + expenses, schedule next cleanup.
- Invariant to enforce: never delete raw rows before their snapshot (and, once fixed, their export) exist.

The Super Admin can also trigger manual cleanup (`POST /api/system/cleanup`) and reconciliation (`POST /api/system/auto-transactions/trigger`).

## Backups
`backup/backup.sh` — daily `pg_dump | gzip`, keeps last 30 (README says 7; script is the truth). Note: on Supabase/Render the sidecar is not used; rely on Supabase backups or add a scheduled dump.
