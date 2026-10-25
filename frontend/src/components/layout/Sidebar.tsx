import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, PlusCircle, Printer, ScrollText, ListOrdered, Wallet,
  BarChart3, FolderOpen, ClipboardList, Landmark, SlidersHorizontal, TrendingUp,
  Wrench, Tags, History, FileClock, Receipt, RefreshCw, Archive,
  Bell, KeyRound, Users, ShieldCheck, Server, Database, Cloud, IndianRupee,
  Code, LogOut, X, ChevronRight, type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { RksOneLogo } from '../brand/Logo';

interface NavItem {
  icon: LucideIcon;
  labelKey: string;
  path: string;
  permKey?: string;
  superOnly?: boolean;
  adminOnly?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const ROLE_LABEL: Record<string, string> = {
  USER: 'Staff', MANAGER: 'Manager', ADMIN: 'Admin', SUPER_ADMIN: 'Super admin', CUSTOM: 'Custom role',
};

const SECTIONS: NavSection[] = [
  {
    title: 'Counter',
    items: [
      { icon: LayoutDashboard, labelKey: 'nav.dashboard', path: '/dashboard' },
      { icon: PlusCircle, labelKey: 'nav.newEntry', path: '/transactions/new' },
      { icon: ListOrdered, labelKey: 'nav.myTransactions', path: '/transactions' },
      { icon: Wallet, labelKey: 'nav.myExpenses', path: '/expenses' },
      { icon: Printer, labelKey: 'nav.billing', path: '/billing' },
      { icon: ScrollText, labelKey: 'nav.terms', path: '/terms' },
    ],
  },
  {
    title: 'Money',
    items: [
      { icon: BarChart3, labelKey: 'nav.analytics', path: '/analytics', permKey: 'analytics' },
      { icon: FolderOpen, labelKey: 'nav.allTransactions', path: '/admin/transactions', permKey: 'allRecords' },
      { icon: ClipboardList, labelKey: 'nav.allExpenses', path: '/admin/expenses', permKey: 'allRecords' },
      { icon: Landmark, labelKey: 'nav.banks', path: '/banks', permKey: 'banks' },
      { icon: SlidersHorizontal, labelKey: 'nav.bankConfig', path: '/admin/bank-config', permKey: 'banks' },
      { icon: TrendingUp, labelKey: 'Staff performance', path: '/admin/user-performance', adminOnly: true },
    ],
  },
  {
    title: 'Price list',
    items: [
      { icon: Wrench, labelKey: 'nav.services', path: '/services', permKey: 'services' },
      { icon: Tags, labelKey: 'nav.expenseCats', path: '/admin/expense-categories', permKey: 'expenseCategories' },
    ],
  },
  {
    title: 'Records',
    items: [
      { icon: History, labelKey: 'Transaction log', path: '/admin/audit-logs', permKey: 'allRecords' },
      { icon: FileClock, labelKey: 'nav.auditLogs', path: '/logs', permKey: 'salaryLogs' },
      { icon: Receipt, labelKey: 'nav.billLogs', path: '/admin/bill-logs', permKey: 'salaryLogs' },
      { icon: RefreshCw, labelKey: 'Automatic entries', path: '/admin/auto-transactions', adminOnly: true },
      { icon: Archive, labelKey: 'nav.dataExports', path: '/admin/exports', permKey: 'analytics' },
    ],
  },
  {
    title: 'System',
    items: [
      { icon: Bell, labelKey: 'System alerts', path: '/admin/alerts', superOnly: true },
      { icon: KeyRound, labelKey: 'Password requests', path: '/admin/password-requests', superOnly: true },
      { icon: Users, labelKey: 'nav.users', path: '/users', superOnly: true },
      { icon: ShieldCheck, labelKey: 'Roles', path: '/admin/roles', superOnly: true },
      { icon: Server, labelKey: 'nav.serverMgmt', path: '/admin/system', superOnly: true },
      { icon: Database, labelKey: 'nav.storageMgmt', path: '/admin/storage', superOnly: true },
      { icon: Cloud, labelKey: 'nav.renderMgmt', path: '/admin/render', superOnly: true },
      { icon: IndianRupee, labelKey: 'nav.incomeMgmt', path: '/admin/income-management', superOnly: true },
    ],
  },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, role, isAdmin, isSuperAdmin, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const canSee = (item: NavItem) => {
    if (item.superOnly) return isSuperAdmin;
    if (item.adminOnly) return isAdmin || isSuperAdmin;
    if (!item.permKey) return true; // counter items are for everyone
    if (isAdmin || isSuperAdmin) return true;
    if (role === 'MANAGER') return ['services', 'expenseCategories'].includes(item.permKey);
    if (role === 'CUSTOM') return !!user?.customPermissions?.[item.permKey]?.read;
    return false;
  };

  const label = (key: string) => (key.startsWith('nav.') ? t(key as any) : key);
  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside className={`sidebar ${isOpen ? 'mobile-open' : ''}`} aria-label="Main menu">
      <div className="sidebar-brand">
        <div>
          <RksOneLogo height={48} className="brand-logo" />
          <div className="brand-sub">RKS Xerox &amp; Computer Center</div>
        </div>
        <button className="sidebar-close-btn icon-btn" onClick={onClose} aria-label="Close menu" style={{ marginLeft: 'auto' }}>
          <X size={18} />
        </button>
      </div>

      <nav className="sidebar-nav">
        {SECTIONS.map(section => {
          const items = section.items.filter(canSee);
          if (items.length === 0) return null;
          return (
            <div className="nav-section" key={section.title}>
              <div className="nav-section-title">{section.title}</div>
              {items.map(({ icon: Icon, labelKey, path }) => (
                <NavLink key={path} to={path} end onClick={onClose}
                  className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
                  <span className="nav-icon"><Icon size={18} strokeWidth={1.9} /></span>
                  {label(labelKey)}
                </NavLink>
              ))}
            </div>
          );
        })}

        <div className="nav-section" style={{ marginTop: 'auto', paddingTop: 14 }}>
          <NavLink to="/developer" onClick={onClose} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
            <span className="nav-icon"><Code size={18} strokeWidth={1.9} /></span>
            About this app
          </NavLink>
          <button className="nav-item danger" onClick={handleLogout}>
            <span className="nav-icon"><LogOut size={18} strokeWidth={1.9} /></span>
            {t('nav.logout')}
          </button>
        </div>
      </nav>

      <button className="sidebar-user" onClick={() => { onClose(); navigate('/profile'); }}>
        <div className="avatar" aria-hidden="true">{user?.name?.[0]?.toUpperCase()}</div>
        <div className="user-info">
          <div className="user-name">{user?.name}</div>
          <div className="user-role">{ROLE_LABEL[role ?? ''] ?? role}</div>
        </div>
        <ChevronRight size={16} color="var(--graphite-3)" />
      </button>
    </aside>
  );
}
