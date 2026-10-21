import api from './client';
export const apiClient = api;
import type { ApiResponse, User, Service, Transaction, Expense, Log, DailyAnalytics, MonthlyAnalytics, TodaySummary, BankAccount, Session, SystemConfig, Shop } from '../types';

// ── Auth ────────────────────────────────────────────────────────
export const authApi = {
  login: (username: string, password: string) =>
    api.post<ApiResponse<{ token: string; refreshToken?: string; user: User }>>('/auth/login', { username, password }),
  me: () => api.get<ApiResponse<User & { totalRevenue: number; todayStats: { transactions: number; revenue: number }; recentActivity: unknown[] }>>('/auth/me'),
  logout: () => api.post<ApiResponse<null>>('/auth/logout'),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<ApiResponse<null>>('/auth/change-password', { currentPassword, newPassword }),
};

// ── Users ───────────────────────────────────────────────────────
export const usersApi = {
  list: () => api.get<ApiResponse<User[]>>('/users'),
  get: (id: string) => api.get<ApiResponse<User>>(`/users/${id}`),
  create: (data: { name: string; username: string; password: string; role: string; isActive?: boolean; customRoleId?: string; shopAccess?: Shop[] }) =>
    api.post<ApiResponse<User>>('/users', data),
  update: (id: string, data: Partial<User> & { password?: string }) =>
    api.patch<ApiResponse<User>>(`/users/${id}`, data),
  delete: (id: string) => api.delete<ApiResponse<null>>(`/users/${id}`),
};

// ── Services ─────────────────────────────────────────────────────
export const servicesApi = {
  list: (params?: { category?: string; active?: boolean }) =>
    api.get<ApiResponse<Service[]>>('/services', { params }),
  create: (data: { name: string; category: string; price: number; isActive?: boolean; shop?: Shop }) =>
    api.post<ApiResponse<Service>>('/services', data),
  update: (id: string, data: Partial<Service> & { shop?: Shop }) =>
    api.patch<ApiResponse<Service>>(`/services/${id}`, data),
  delete: (id: string) => api.delete<ApiResponse<null>>(`/services/${id}`),
};

// ── Transactions ──────────────────────────────────────────────────
export const transactionsApi = {
  list: (params?: { date?: string; userId?: string; page?: number; limit?: number; paymentMethod?: string; shop?: string }) =>
    api.get<ApiResponse<Transaction[]>>('/transactions', { params }),
  create: (data: { serviceId?: string; serviceName?: string; quantity: number; unitPrice?: number; paymentMethod: string; notes?: string; shop?: string }) =>
    api.post<ApiResponse<Transaction>>('/transactions', data),
  update: (id: string, data: { updatedAt: string; quantity?: number; notes?: string }) =>
    api.patch<ApiResponse<Transaction>>(`/transactions/${id}`, data),
  delete: (id: string) => api.delete<ApiResponse<null>>(`/transactions/${id}`),
};

// ── Expenses ──────────────────────────────────────────────────────
export const expensesApi = {
  list: (params?: { date?: string; status?: string; userId?: string }) =>
    api.get<ApiResponse<Expense[]>>('/expenses', { params }),
  create: (data: { amount: number; category: string; note?: string; bankId?: string; shop?: Shop }) =>
    api.post<ApiResponse<Expense>>('/expenses', data),
  update: (id: string, data: { updatedAt: string; amount?: number; category?: string; note?: string; shop?: Shop }) =>
    api.patch<ApiResponse<Expense>>(`/expenses/${id}`, data),
  approve: (id: string, status: 'APPROVED' | 'REJECTED', bankId?: string) =>
    api.patch<ApiResponse<Expense>>(`/expenses/${id}/approve`, { status, bankId }),
  delete: (id: string) => api.delete<ApiResponse<null>>(`/expenses/${id}`),
};

// ── Banks ──────────────────────────────────────────────────────────
export const banksApi = {
  list: () => api.get<ApiResponse<BankAccount[]>>('/banks'),
  analytics: (params?: { date?: string; action?: string }) => api.get<ApiResponse<BankAccount[]>>('/banks/analytics', { params }),
  create: (data: { name: string; balance?: number; isCash?: boolean }) =>
    api.post<ApiResponse<BankAccount>>('/banks', data),
  rename: (id: string, name: string) =>
    api.patch<ApiResponse<BankAccount>>(`/banks/${id}/rename`, { name }),
  deposit: (id: string, amount: number, note?: string) =>
    api.patch<ApiResponse<BankAccount>>(`/banks/${id}/deposit`, { amount, note }),
  adjust: (id: string, amount: number, note?: string) =>
    api.patch<ApiResponse<BankAccount>>(`/banks/${id}/adjust`, { amount, note }),
  setBalance: (id: string, balance: number, note?: string) =>
    api.patch<ApiResponse<BankAccount>>(`/banks/${id}/balance`, { balance, note }),
  hardReset: (id: string, note?: string) =>
    api.patch<ApiResponse<BankAccount>>(`/banks/${id}/reset`, { note }),
  delete: (id: string) =>
    api.delete<ApiResponse<null>>(`/banks/${id}`),
};

// ── Analytics ──────────────────────────────────────────────────────
export const analyticsApi = {
  todaySummary: () => api.get<ApiResponse<TodaySummary>>('/analytics/today-summary'),
  daily: (date?: string, userId?: string, shop?: string) => api.get<ApiResponse<DailyAnalytics>>('/analytics/daily', { params: { date: date || undefined, userId: userId || undefined, shop: shop || undefined } }),
  monthly: (year?: number, month?: number, userId?: string, shop?: string) => api.get<ApiResponse<MonthlyAnalytics>>('/analytics/monthly', { params: { year, month, userId: userId || undefined, shop: shop || undefined } }),
  manualAdjust: (data: { date: string, type: 'INCOME' | 'EXPENSE', amount: number, note?: string }) =>
    api.post<ApiResponse<any>>('/analytics/adjust', data),
};

// ── Logs ──────────────────────────────────────────────────────────
export const logsApi = {
  list: (params?: { page?: number; limit?: number; userId?: string; action?: string; tableName?: string; date?: string }) =>
    api.get<ApiResponse<Log[]>>('/logs', { params }),
  cleanup: () => api.delete<ApiResponse<{ deletedCount: number }>>('/logs/cleanup'),
};

// ── Health ────────────────────────────────────────────────────────
export const healthApi = {
  check: () => api.get<ApiResponse<{ status: string; database: string; localTime: string }>>('/health'),
};

// ── Expense Categories ─────────────────────────────────────────────
export const expenseCategoriesApi = {
  list: () => api.get<ApiResponse<{ id: string; name: string }[]>>('/expense-categories'),
  create: (name: string) => api.post<ApiResponse<any>>('/expense-categories', { name }),
  update: (id: string, name: string) => api.patch<ApiResponse<any>>(`/expense-categories/${id}`, { name }),
  delete: (id: string) => api.delete<ApiResponse<any>>(`/expense-categories/${id}`),
};

// ── System / Server Management ────────────────────────────────────
export const systemApi = {
  getConfig: () => api.get<ApiResponse<SystemConfig>>('/system/config'),
  updateConfig: (data: Partial<SystemConfig> & { broadcastToAll?: boolean }) => api.patch<ApiResponse<SystemConfig>>('/system/config', data),
  getSessions: () => api.get<ApiResponse<Session[]>>('/system/sessions'),
  kickSession: (id: string, timeout?: number) => api.post<ApiResponse<null>>(`/system/sessions/${id}/kick`, { timeout }),
  messageUser: (userId: string, message: string) => api.post<ApiResponse<null>>(`/system/sessions/${userId}/message`, { message }),
  getHealthStats: () => api.get<ApiResponse<any>>('/system/health-stats'),
  getStorageStats: () => api.get<ApiResponse<{ tables: any[], totalBytes: number, totalMb: string }>>('/system/storage'),
  manualCleanup: (endDate: string, types: string[]) => api.post<ApiResponse<null>>('/system/cleanup', { endDate, types }),
  logBill: (data: { customerName: string, total: number, items: any[], date: string }) => api.post<ApiResponse<null>>('/system/log-bill', data),
  getAutoTransactions: (params?: { page?: number; limit?: number; date?: string; type?: string }) => api.get<ApiResponse<any[]>>('/system/auto-transactions', { params }),
  triggerReconciliation: () => api.post<ApiResponse<null>>('/system/auto-transactions/trigger'),
  getAlerts: () => api.get<ApiResponse<any[]>>('/system/alerts'),
  markAlertRead: (id: string) => api.patch<ApiResponse<any>>(`/system/alerts/${id}/read`),
  clearAlerts: () => api.delete<ApiResponse<null>>('/system/alerts'),
};

// ── Exports ───────────────────────────────────────────────────────
export const exportsApi = {
  list: () => api.get<ApiResponse<any[]>>('/system/exports'),
  downloadUrl: (id: string) => `${api.defaults.baseURL}/system/exports/${id}/download`,
};

