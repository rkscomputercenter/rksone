import React, { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, PlusCircle, Printer, ScrollText, ListOrdered, Wallet,
  BarChart3, FolderOpen, ClipboardList, Landmark, SlidersHorizontal, TrendingUp,
  Wrench, Tags, History, FileClock, Receipt, RefreshCw, Archive,
  Bell, KeyRound, Users, ShieldCheck, Server, Database, Cloud, IndianRupee,
  Code, LogOut, Menu, ChevronRight, ChevronDown, type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

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
  /** The sandwich button at the top of the menu: hides it (desktop) or closes the drawer (phone) */
  onToggle: () => void;
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
      { icon: TrendingUp, labelKey: 'Staff performance', path: '/admin/user-performance', permKey: 'analytics' },
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

export default function Sidebar({ isOpen, onClose, onToggle }: SidebarProps) {
  const { user, role, isAdmin, isSuperAdmin, logout, hasPermission } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const canSee = (item: NavItem) => {
    if (item.superOnly) return isSuperAdmin;
    if (item.adminOnly) return isAdmin || isSuperAdmin;
    if (!item.permKey) return true; // counter items are for everyone
    return hasPermission(item.permKey); // admins, managers (services, categories) and custom roles by their grants
  };

  // Groups after "Counter" fold away. Which ones are open is remembered on this device,
  // and the group holding the current page always opens.
  const [openGroups, setOpenGroups] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('rks_menuGroups') || '["Money"]'); } catch { return ['Money']; }
  });
  useEffect(() => {
    const current = SECTIONS.find(s => s.items.some(i => i.path === pathname))?.title;
    if (current && current !== SECTIONS[0].title) setOpenGroups(g => (g.includes(current) ? g : [...g, current]));
  }, [pathname]);
  useEffect(() => {
    try { localStorage.setItem('rks_menuGroups', JSON.stringify(openGroups)); } catch { /* storage blocked */ }
  }, [openGroups]);
  // Keep the current page's entry in view (it may sit low in an opened group)
  useEffect(() => {
    const t = setTimeout(() => document.querySelector('.sidebar .nav-item.active')?.scrollIntoView({ block: 'nearest' }), 50);
    return () => clearTimeout(t);
  }, [pathname, openGroups]);
  const toggleGroup = (title: string) =>
    setOpenGroups(g => (g.includes(title) ? g.filter(x => x !== title) : [...g, title]));

  const label = (key: string) => (key.startsWith('nav.') ? t(key as any) : key);
  const handleLogout = () => { logout(); navigate('/login'); };

  const link = ({ icon: Icon, labelKey, path }: NavItem) => (
    <NavLink key={path} to={path} end onClick={onClose}
      className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
      <span className="nav-icon"><Icon size={19} strokeWidth={1.8} /></span>
      <span className="nav-label">{label(labelKey)}</span>
    </NavLink>
  );

  const [counter, ...groups] = SECTIONS;

  return (
    <aside id="main-menu" className={`sidebar ${isOpen ? 'mobile-open' : ''}`} aria-label="Main menu">
      <div className="sidebar-head">
        <button className="menu-toggle menu-toggle-night" onClick={onToggle} aria-expanded="true" aria-controls="main-menu"
          aria-label="Hide menu" title="Hide menu">
          <Menu size={21} strokeWidth={2.2} />
        </button>
        <span className="sidebar-title">Menu</span>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-primary">{counter.items.filter(canSee).map(link)}</div>

        {groups.map(section => {
          const items = section.items.filter(canSee);
          if (items.length === 0) return null;
          const open = openGroups.includes(section.title);
          const id = `nav-group-${section.title.replace(/\s+/g, '-').toLowerCase()}`;
          return (
            <div className={`nav-group${open ? ' is-open' : ''}`} key={section.title}>
              <button type="button" className="nav-group-head" aria-expanded={open} aria-controls={id}
                onClick={() => toggleGroup(section.title)}>
                <span>{section.title}</span>
                <ChevronDown size={16} className="nav-group-chevron" aria-hidden="true" />
              </button>
              {open && <div id={id} className="nav-group-items">{items.map(link)}</div>}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-foot">
        <button className="sidebar-person" onClick={() => { onClose(); navigate('/profile'); }} title="Your profile">
          <span className="avatar" aria-hidden="true">{user?.name?.[0]?.toUpperCase()}</span>
          <span className="person-text">
            <span className="person-name">{user?.name}</span>
            <span className="person-role">{ROLE_LABEL[role ?? ''] ?? role}</span>
          </span>
          <ChevronRight size={16} className="person-go" aria-hidden="true" />
        </button>
        <NavLink to="/developer" onClick={onClose} className={({ isActive }) => `foot-link${isActive ? ' active' : ''}`}>
          <Code size={16} /> About
        </NavLink>
        <button className="foot-link danger" onClick={handleLogout}>
          <LogOut size={16} /> {t('nav.logout')}
        </button>
      </div>
    </aside>
  );
}
