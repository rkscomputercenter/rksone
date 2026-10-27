import React, { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import AppShell from './components/layout/AppShell';
import LoginPage from './pages/Login';
import AppUpdater from './components/AppUpdater';
import { RksOneLogo } from './components/brand/Logo';
import { BootLoading } from './components/ui/Loading';

// Every page except sign-in is fetched when first opened, so the first screen does not wait for
// the charts, the logs or the admin pages. (In the Android app the files are on the phone.)
const LandingPage = lazy(() => import('./pages/LandingPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const NewTransaction = lazy(() => import('./pages/transactions/NewTransaction'));
const TransactionsList = lazy(() => import('./pages/transactions/TransactionsList'));
const ExpensesList = lazy(() => import('./pages/expenses/ExpensesList'));
const NewExpense = lazy(() => import('./pages/expenses/NewExpense'));
const BillingPage = lazy(() => import('./pages/BillingPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const DeveloperPage = lazy(() => import('./pages/DeveloperPage'));
const ServicesPage = lazy(() => import('./pages/services/ServicesPage'));
const AnalyticsPage = lazy(() => import('./pages/analytics/AnalyticsPage'));
const UsersPage = lazy(() => import('./pages/users/UsersPage'));
const LogsPage = lazy(() => import('./pages/logs/LogsPage'));
const ProfilePage = lazy(() => import('./pages/Profile'));
const AdminTransactions = lazy(() => import('./pages/admin/AdminTransactions'));
const AdminExpenses = lazy(() => import('./pages/admin/AdminExpenses'));
const AutomaticTransactionsPage = lazy(() => import('./pages/admin/AutomaticTransactionsPage'));
const UserPerformancePage = lazy(() => import('./pages/admin/UserPerformancePage'));
const AuditLogsPage = lazy(() => import('./pages/admin/AuditLogsPage'));
const BillLogsPage = lazy(() => import('./pages/logs/BillLogsPage'));
const BanksPage = lazy(() => import('./pages/banks/BanksPage'));
const BankConfig = lazy(() => import('./pages/admin/BankConfig'));
const ServerManagement = lazy(() => import('./pages/admin/ServerManagement'));
const ManageExpenseCategories = lazy(() => import('./pages/admin/ManageExpenseCategories'));
const StorageManagement = lazy(() => import('./pages/admin/StorageManagement'));
const DataExports = lazy(() => import('./pages/admin/DataExports'));
const MaintenancePage = lazy(() => import('./pages/Maintenance'));
const IncomeManagementPage = lazy(() => import('./pages/admin/IncomeManagementPage'));
const RenderMaintenancePage = lazy(() => import('./pages/admin/RenderMaintenancePage'));
const RoleManagementPage = lazy(() => import('./pages/admin/RoleManagementPage'));
const SystemAlertsPage = lazy(() => import('./pages/admin/SystemAlertsPage'));
const PasswordRequestsPage = lazy(() => import('./pages/admin/PasswordRequestsPage'));
const RestrictedAccessPage = lazy(() => import('./pages/RestrictedAccessPage'));
const DownloadAppPage = lazy(() => import('./pages/DownloadAppPage'));

function RootRedirect() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <BootLoading />;

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to={Capacitor.isNativePlatform() ? "/login" : "/open"} replace />;
}

function CustomSplashScreen({ onComplete }: { onComplete: () => void }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Show the logo briefly, then fade out
    const timer = setTimeout(() => {
      setFading(true);
      // Wait for the fade animation to complete before unmounting
      setTimeout(onComplete, 350);
    }, 900);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'radial-gradient(120% 80% at 60% 35%, #1A1546 0%, #0B0A1F 55%, #07060F 100%)', zIndex: 99999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      opacity: fading ? 0 : 1, transition: 'opacity 0.35s ease-in-out',
      pointerEvents: 'none'
    }}>
      <style>{`
        @keyframes pulseLogo {
          0% { transform: scale(0.85); opacity: 0; }
          40% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .splash-logo-anim {
          animation: pulseLogo 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
      <div className="splash-logo-anim" style={{ color: '#fff', width: 'min(78vw, 320px)' }}>
        <RksOneLogo height={92} glow style={{ width: '100%', height: 'auto' }} />
      </div>
    </div>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(Capacitor.isNativePlatform());

  // Android back button: handled by AppShell for signed-in pages; elsewhere Capacitor goes back by default.

  return (
    <>
      {showSplash && <CustomSplashScreen onComplete={() => setShowSplash(false)} />}
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <AuthProvider>
        <AppUpdater />
        <BrowserRouter>
          <Suspense fallback={<BootLoading />}>
          <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/developer" element={<DeveloperPage />} />
          <Route path="/open" element={<LandingPage />} />
          <Route path="/download" element={<DownloadAppPage />} />
          <Route path="/" element={<RootRedirect />} />

          {/* Signed-in pages share one frame (sidebar, topbar, live updates) that stays mounted */}
          <Route element={<AppShell />}>
          {/* All authenticated users */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/transactions/new" element={<NewTransaction />} />
            <Route path="/transactions" element={<TransactionsList />} />
            <Route path="/expenses" element={<ExpensesList />} />
            <Route path="/expenses/new" element={<NewExpense />} />
            <Route path="/billing" element={<BillingPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          {/* Managers and admins; a custom role gets in when its permission for that module allows */}
          <Route element={<ProtectedRoute allowedRoles={['MANAGER', 'ADMIN', 'SUPER_ADMIN']} permissionKey="services" />}>
            <Route path="/services" element={<ServicesPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['MANAGER', 'ADMIN', 'SUPER_ADMIN']} permissionKey="expenseCategories" />}>
            <Route path="/admin/expense-categories" element={<ManageExpenseCategories />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']} permissionKey="banks" />}>
            <Route path="/banks" element={<BanksPage />} />
            <Route path="/admin/bank-config" element={<BankConfig />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']} permissionKey="allRecords" />}>
            <Route path="/admin/transactions" element={<AdminTransactions />} />
            <Route path="/admin/expenses" element={<AdminExpenses />} />
            <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']} permissionKey="salaryLogs" />}>
            <Route path="/logs" element={<LogsPage />} />
            <Route path="/admin/bill-logs" element={<BillLogsPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']} permissionKey="analytics" />}>
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/admin/exports" element={<DataExports />} />
            <Route path="/admin/user-performance" element={<UserPerformancePage />} />
          </Route>

          {/* Admins and super admins only (no custom-role permission covers these) */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'SUPER_ADMIN']} />}>
            <Route path="/admin/auto-transactions" element={<AutomaticTransactionsPage />} />
          </Route>

          {/* Super Admin only */}
          <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']} />}>
            <Route path="/users" element={<UsersPage />} />
            <Route path="/admin/roles" element={<RoleManagementPage />} />
            <Route path="/admin/system" element={<ServerManagement />} />
            <Route path="/admin/render" element={<RenderMaintenancePage />} />
            <Route path="/admin/storage" element={<StorageManagement />} />
            <Route path="/admin/income-management" element={<IncomeManagementPage />} />
            <Route path="/admin/alerts" element={<SystemAlertsPage />} />
            <Route path="/admin/password-requests" element={<PasswordRequestsPage />} />
          </Route>

          <Route path="/restricted" element={<RestrictedAccessPage />} />
          </Route>

          <Route path="/maintenance" element={<MaintenancePage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </div>
    </>
  );
}
