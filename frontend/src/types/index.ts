export type Role = 'USER' | 'MANAGER' | 'ADMIN' | 'SUPER_ADMIN' | 'CUSTOM';
export type Shop = 'SHOP_COMPUTER' | 'SHOP_XEROX';
export type ServiceCategory = 'GOVT' | 'PRINTING' | 'CARDS' | 'OTHER';
export type ExpenseStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';

export interface User {
  id: string;
  name: string;
  username: string;
  role: Role;
  customRoleId?: string | null;
  customPermissions?: Record<string, { read: boolean; write: boolean }>;
  shopAccess: Shop[];
  isActive: boolean;
  isSuspended: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { transactions: number; expenses?: number };
}

export interface Service {
  id: string;
  name: string;
  category: ServiceCategory;
  price: number;
  isActive: boolean;
  shop?: Shop;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  paymentMethod: 'CASH' | 'ONLINE' | 'OTHER' | 'SHOP_XEROX';
  notes?: string;
  createdAt: string;
  updatedAt: string;
  shop?: Shop;
  user: { id: string; name: string; username: string };
  service: { id: string; name: string; category: ServiceCategory };
}

export interface BankAccount {
  id: string;
  name: string;
  balance: number;
  isCash: boolean;
  createdAt: string;
  updatedAt: string;
  totalDeducted?: number;
  expenses?: Array<{ id: string; amount: number; category: string; note?: string; createdAt: string; user: { name: string } }>;
  logs?: Array<{ id: string; action: string; newValue: any; oldValue?: any; createdAt: string; user: { name: string } }>;
  _count?: { expenses: number };
}

export interface CustomRole {
  id: string;
  name: string;
  permissions: Record<string, { read: boolean; write: boolean }>;
  createdAt: string;
  updatedAt: string;
  _count?: { users: number };
}

export interface Expense {
  id: string;
  amount: number;
  category: string;
  note?: string;
  status: ExpenseStatus;
  bankId?: string | null;
  bank?: { id: string; name: string } | null;
  shop?: Shop;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string; username: string };
}

export interface Log {
  id: string;
  action: AuditAction;
  tableName: string;
  recordId: string;
  oldValue: unknown;
  newValue: unknown;
  createdAt: string;
  user: { name: string; username: string };
}

export interface DailyAnalytics {
  date: string;
  income: number;
  computerCash: number;
  computerOnline: number;
  xeroxCash: number;
  xeroxOnline: number;
  otherIncome: number;
  shopXeroxDirect: number;
  expenses: number;
  profit: number;
  transactionCount: number;
  expenseCount: number;
  topServices: Array<{ service: Service; revenue: number; count: number }>;
  userBreakdown: Array<{ user: User; revenue: number; count: number }>;
  expenseCategories: Array<{ category: string; total: number }>;
}

export interface MonthlyAnalytics {
  year: number;
  month: number;
  income: number;
  computerCash: number;
  computerOnline: number;
  xeroxCash: number;
  xeroxOnline: number;
  otherIncome: number;
  shopXeroxDirect: number;
  expenses: number;
  profit: number;
  transactionCount: number;
  expenseCount: number;
  daily: Array<{ date: string; income: number; computerCash: number; computerOnline: number; xeroxCash: number; xeroxOnline: number; otherIncome: number; shopXeroxDirect: number; expenses: number; profit: number; count: number }>;
}

export interface TodaySummary {
  date: string;
  income: number;
  computerCash: number;
  computerOnline: number;
  xeroxCash: number;
  xeroxOnline: number;
  otherIncome: number;
  shopXeroxDirect: number;
  expenses: number;
  profit: number;
  transactionCount: number;
  expenseCount: number;
  pendingExpenseCount: number;
}

export interface Session {
  id: string;
  userId: string;
  loginTime: string;
  logoutTime?: string | null;
  lastSeen: string;
  isKicked: boolean;
  ipAddress?: string;
  userAgent?: string;
  user: { name: string; username: string; role: Role };
}

export interface SystemConfig {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  serverMessage: string;
  version: string;
  autoCleanupEnabled: boolean;
  autoCleanupDurationMonths: number;
  lastCleanupDate?: string | null;
  nextCleanupDate?: string | null;
}

export interface DataExport {
  id: string;
  fileName: string;
  status: string;
  scheduledFor: string;
  createdAt: string;
  expiresAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: { total?: number; page?: number; limit?: number; date?: string; totalSum?: number };
}
