You are an expert full-stack developer AI. Your task is to build a complete, modern ERP and Shop Management System for a Computer Centre called "RKS Computer Centre". The app will handle users, role-based access control, point-of-sale transactions, expense tracking, bank reconciliation, real-time analytics, and system administration.

# Technology Stack
- **Client App**: Android Framework (Kotlin with Jetpack Compose OR React Native), using Retrofit/Axios for API calls and Socket.IO Client for WebSockets.
- **Backend**: Node.js, Express, TypeScript, Socket.IO, node-cron.
- **Database**: PostgreSQL with Prisma ORM.
- **Security & Auth**: JWT authentication, bcrypt for password hashing, helmet, express-rate-limit.

# Core Requirements & Entities (Prisma Schema)

## 1. Roles & Permissions
- **Roles**: USER, MANAGER, ADMIN, SUPER_ADMIN, and CUSTOM.
- **System**: JWT-based auth. Keep track of user sessions (login/logout times, IP, User Agent).

## 2. Services (Catalog)
- Pre-defined services with categories (GOVT, PRINTING, CARDS, OTHER) and base prices.
- Must be able to toggle isActive.

## 3. Transactions (Income)
- Users can create transactions representing customer purchases.
- Fields: userId, serviceId, quantity, unitPrice, totalPrice, paymentMethod (CASH, ONLINE, OTHER, SHOP_XEROX), notes.

## 4. Expenses & Bank Accounts
- Track multiple BankAccount entities (e.g., Cash Drawer, Canara Bank).
- Users can log Expense items linked to a Category and a Bank Account.
- Expenses have a status: PENDING, APPROVED, REJECTED.

## 5. Analytics & Snapshots
- Implement a background cron job to capture daily financial snapshots (DailyAnalyticsSnapshot and UserDailyAnalyticsSnapshot).
- Track income, cash income, online income, expenses, profit, and transaction count.

## 6. System Logs & Alerts
- **Audit Logs**: Track CREATE, UPDATE, DELETE actions for critical tables.
- **System Alerts**: Real-time Socket.IO alerts for INFO, WARNING, ERROR, SUCCESS.

# Application Structure (Screens & Navigation)

Create a responsive, modern Android UI with a bottom navigation bar or a side navigation drawer. Implement the following screens protected by role-based access:

- **Public**: /login, /open (Landing Screen).
- **All Authenticated Users**:
  - /dashboard: Daily overview, recent transactions.
  - /transactions/new & /transactions: Create and view own transactions.
  - /expenses/new & /expenses: Create and view own expenses.
  - /billing: Interface for generating customer bills.
  - /profile: User profile and session management.
- **Manager & Above**:
  - /services: Manage the service catalog.
  - /admin/expense-categories: Manage expense types.
- **Admin & Above**:
  - /banks & /admin/bank-config: Manage bank accounts and balances.
  - /admin/transactions & /admin/expenses: View and manage all user records.
  - /logs, /admin/salary, /analytics, /admin/exports: View audit logs, calculate staff salary, view charts, and export data.
- **Super Admin Only**:
  - /users & /admin/roles: Manage employees, suspend users, assign custom roles.
  - /admin/system & /admin/render: Server maintenance modes and Render deployment controls.
  - /admin/alerts: View system-wide background alerts.
  - /admin/auto-transactions: Automated bank reconciliation logs.

# Implementation Steps for the AI

1. **Step 1: Database Setup**: Generate the schema.prisma with all the models mentioned above.
2. **Step 2: Backend Auth & Core API**: Implement Express server setup, error handling, JWT middleware, and basic CRUD routes for Users, Services, and Transactions.
3. **Step 3: App Foundation**: Setup the Android project, Navigation components, Auth state management, and the main Layout.
4. **Step 4: Transactions & Expenses Workflow**: Build the backend controllers and mobile screens for logging income and expenses.
5. **Step 5: Admin & Analytics Dashboard**: Implement the aggregation queries in Prisma for analytics, and build the charts in the mobile app.
6. **Step 6: Real-time & Cron Jobs**: Integrate Socket.io for live alerts and node-cron for daily snapshot calculations.

Ensure the code follows best practices: modular folder structure, proper error handling, and a highly polished, premium mobile UI design (e.g., Material Design 3 guidelines, dynamic animations, modern color palettes).
