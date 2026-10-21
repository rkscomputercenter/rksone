import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/Login';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import Dashboard from './pages/Dashboard';
import NewTransaction from './pages/transactions/NewTransaction';
import TransactionsList from './pages/transactions/TransactionsList';
import ExpensesList from './pages/expenses/ExpensesList';
import NewExpense from './pages/expenses/NewExpense';
import BillingPage from './pages/BillingPage';
import TermsPage from './pages/TermsPage';
import DeveloperPage from './pages/DeveloperPage';
import ServicesPage from './pages/services/ServicesPage';
import AnalyticsPage from './pages/analytics/AnalyticsPage';
import UsersPage from './pages/users/UsersPage';
import LogsPage from './pages/logs/LogsPage';
import ProfilePage from './pages/Profile';
import AdminTransactions from './pages/admin/AdminTransactions';
import AdminExpenses from './pages/admin/AdminExpenses';
import AutomaticTransactionsPage from './pages/admin/AutomaticTransactionsPage';
import UserPerformancePage from './pages/admin/UserPerformancePage';
import AuditLogsPage from './pages/admin/AuditLogsPage';
import BillLogsPage from './pages/logs/BillLogsPage';
import BanksPage from './pages/banks/BanksPage';
import BankConfig from './pages/admin/BankConfig';
import ServerManagement from './pages/admin/ServerManagement';
import ManageExpenseCategories from './pages/admin/ManageExpenseCategories';
import StorageManagement from './pages/admin/StorageManagement';
import DataExports from './pages/admin/DataExports';
import MaintenancePage from './pages/Maintenance';

import IncomeManagementPage from './pages/admin/IncomeManagementPage';
import RenderMaintenancePage from './pages/admin/RenderMaintenancePage';
import RoleManagementPage from './pages/admin/RoleManagementPage';
import SystemAlertsPage from './pages/admin/SystemAlertsPage';
import PasswordRequestsPage from './pages/admin/PasswordRequestsPage';
import RestrictedAccessPage from './pages/RestrictedAccessPage';
import DownloadAppPage from './pages/DownloadAppPage';
import AppUpdater from './components/AppUpdater';

function RootRedirect() {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }
  
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <Navigate to={Capacitor.isNativePlatform() ? "/login" : "/open"} replace />;
}

function CustomSplashScreen({ onComplete }: { onComplete: () => void }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Show splash for 1.5 seconds, then start fading out
    const timer = setTimeout(() => {
      setFading(true);
      // Wait 0.5s for the fade animation to complete before unmounting
      setTimeout(onComplete, 500);
    }, 1500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'var(--bg-base)', zIndex: 99999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      opacity: fading ? 0 : 1, transition: 'opacity 0.5s ease-in-out',
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
      <img 
        src="/app-logo.png" 
        alt="Logo" 
        className="splash-logo-anim"
        style={{ 
          width: '130px', height: '130px', objectFit: 'contain', 
          borderRadius: '50%', background: '#fff', padding: '8px', 
          boxShadow: '0 15px 35px rgba(0,0,0,0.15)' 
        }} 
      />
    </div>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(Capacitor.isNativePlatform());

  useEffect(() => {
    // Hardware back button
    CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      if (!canGoBack) {
        CapacitorApp.exitApp();
      } else {
        window.history.back();
      }
    });

    return () => {
      CapacitorApp.removeAllListeners();
    };
  }, []);

  return (
    <>
      {showSplash && <CustomSplashScreen onComplete={() => setShowSplash(false)} />}
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      <AuthProvider>
        <AppUpdater />
        <BrowserRouter>
          <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/developer" element={<DeveloperPage />} />
          <Route path="/open" element={<LandingPage />} />
          <Route path="/download" element={<DownloadAppPage />} />
          <Route path="/" element={<RootRedirect />} />

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

          {/* Admin+ */ /* Custom roles can access these depending on permissions */}
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

          {/* Super Admin only */}
          <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']} />}>
            <Route path="/users" element={<UsersPage />} />
            <Route path="/admin/roles" element={<RoleManagementPage />} />
            <Route path="/admin/system" element={<ServerManagement />} />
            <Route path="/admin/render" element={<RenderMaintenancePage />} />
            <Route path="/admin/storage" element={<StorageManagement />} />
            <Route path="/admin/auto-transactions" element={<AutomaticTransactionsPage />} />
            <Route path="/admin/income-management" element={<IncomeManagementPage />} />
            <Route path="/admin/alerts" element={<SystemAlertsPage />} />
            <Route path="/admin/password-requests" element={<PasswordRequestsPage />} />
          </Route>

          <Route path="/maintenance" element={<MaintenancePage />} />
          <Route path="/restricted" element={<RestrictedAccessPage />} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </div>
    </>
  );
}
