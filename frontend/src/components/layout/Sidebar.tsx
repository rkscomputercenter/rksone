import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { 
  FcHome, FcPlus, FcFile, FcRules, FcList, FcMoneyTransfer, 
  FcComboChart, FcOpenedFolder, FcSurvey, FcBriefcase, FcLibrary, 
  FcServices, FcBookmark, FcKindle, FcNews, FcProcess, FcPackage, 
  FcAdvertising, FcKey, FcConferenceCall, FcPrivacy, FcGlobe, FcDatabase, 
  FcDataBackup, FcUpRight, FcLineChart, FcMindMap, FcImport, FcTimeline
} from 'react-icons/fc';

interface NavItem {
  icon: React.ReactNode;
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

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, role, isAdmin, isSuperAdmin, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const SECTIONS: NavSection[] = [
    {
      title: 'Main',
      items: [
        { icon: <FcHome size={18} />, labelKey: 'nav.dashboard', path: '/dashboard' },
        { icon: <FcPlus size={18} />, labelKey: 'nav.newEntry', path: '/transactions/new' },
        { icon: <FcFile size={18} />, labelKey: 'nav.billing', path: '/billing' },
        { icon: <FcRules size={18} />, labelKey: 'nav.terms', path: '/terms' },
        { icon: <FcList size={18} />, labelKey: 'nav.myTransactions', path: '/transactions' },
        { icon: <FcMoneyTransfer size={18} />, labelKey: 'nav.myExpenses', path: '/expenses' },
      ]
    },
    {
      title: 'Finance & Analytics',
      items: [
        { icon: <FcComboChart size={18} />, labelKey: 'nav.analytics', path: '/analytics', permKey: 'analytics' },
        { icon: <FcOpenedFolder size={18} />, labelKey: 'nav.allTransactions', path: '/admin/transactions', permKey: 'allRecords' },
        { icon: <FcSurvey size={18} />, labelKey: 'nav.allExpenses', path: '/admin/expenses', permKey: 'allRecords' },

        { icon: <FcLibrary size={18} />, labelKey: 'nav.banks', path: '/banks', permKey: 'banks' },
        { icon: <FcServices size={18} />, labelKey: 'nav.bankConfig', path: '/admin/bank-config', permKey: 'banks' },
        { icon: <FcLineChart size={18} />, labelKey: 'User Performance', path: '/admin/user-performance', adminOnly: true },
      ]
    },
    {
      title: 'Services & Config',
      items: [
        { icon: <FcServices size={18} />, labelKey: 'nav.services', path: '/services', permKey: 'services' },
        { icon: <FcBookmark size={18} />, labelKey: 'nav.expenseCats', path: '/admin/expense-categories', permKey: 'expenseCategories' },
      ]
    },
    {
      title: 'Logs & Reports',
      items: [
        { icon: <FcTimeline size={18} />, labelKey: 'Transaction Logs', path: '/admin/audit-logs', permKey: 'allRecords' },
        { icon: <FcKindle size={18} />, labelKey: 'nav.auditLogs', path: '/logs', permKey: 'salaryLogs' },
        { icon: <FcNews size={18} />, labelKey: 'nav.billLogs', path: '/admin/bill-logs', permKey: 'salaryLogs' },
        { icon: <FcProcess size={18} />, labelKey: 'Automatic Transactions', path: '/admin/auto-transactions', adminOnly: true },
        { icon: <FcPackage size={18} />, labelKey: 'nav.dataExports', path: '/admin/exports', permKey: 'analytics' },
      ]
    },
    {
      title: 'System & Users',
      items: [
        { icon: <FcAdvertising size={18} />, labelKey: 'System Alerts', path: '/admin/alerts', superOnly: true },
          { icon: <FcKey size={18} />, labelKey: 'Password Requests', path: '/admin/password-requests', superOnly: true },
        { icon: <FcConferenceCall size={18} />, labelKey: 'nav.users', path: '/users', superOnly: true },
        { icon: <FcPrivacy size={18} />, labelKey: 'Roles', path: '/admin/roles', superOnly: true },
        { icon: <FcGlobe size={18} />, labelKey: 'nav.serverMgmt', path: '/admin/system', superOnly: true },
        { icon: <FcDatabase size={18} />, labelKey: 'nav.storageMgmt', path: '/admin/storage', superOnly: true },
        { icon: <FcDataBackup size={18} />, labelKey: 'nav.renderMgmt', path: '/admin/render', superOnly: true },
        { icon: <FcUpRight size={18} />, labelKey: 'nav.incomeMgmt', path: '/admin/income-management', superOnly: true },
      ]
    }
  ];

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside className={`sidebar ${isOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-logo flex-center" style={{ padding: '24px 18px 20px', alignItems: 'center' }}>
        <img src="/logo.png" alt="RKS Logo" style={{ height: 96, width: 'auto', objectFit: 'contain' }} />
        <button className="sidebar-close-btn text-muted" onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, fontSize: '20px', padding: '4px' }}>
          ✕
        </button>
      </div>

      <nav className="sidebar-nav">
        {SECTIONS.map((section, idx) => {
          const visibleItems = section.items.filter(item => {
            if (item.superOnly) return isSuperAdmin;
            if (item.adminOnly) return isAdmin || isSuperAdmin;

            // Main section items (no permKey, no superOnly, no adminOnly) are visible to everyone
            if (!item.permKey && !item.superOnly && !item.adminOnly) return true;

            // Otherwise, it's an admin/custom permission item
            if (isAdmin || isSuperAdmin) return true;
            if (role === 'MANAGER') return ['services', 'expenseCategories'].includes(item.permKey || '');
            if (role === 'CUSTOM' && item.permKey) {
              return user?.customPermissions?.[item.permKey]?.read;
            }
            return false;
          });

          if (visibleItems.length === 0) return null;

          return (
            <div className="nav-section" key={idx}>
              <div className="nav-section-title">{section.title}</div>
              {visibleItems.map(item => (
                <NavLink key={item.path} to={item.path} end
                  className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                  onClick={onClose}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {item.labelKey.startsWith('nav.') ? t(item.labelKey as any) : item.labelKey}
                </NavLink>
              ))}
            </div>
          );
        })}

        <div className="nav-section" style={{ marginTop: 'auto' }}>
          <NavLink to="/developer" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} onClick={onClose}>
            <span className="nav-icon"><FcMindMap size={18} /></span>
            Developer Info
          </NavLink>
        </div>

        <div className="nav-section">
          <button className="nav-item" style={{ color: 'var(--red)' }} onClick={handleLogout}>
            <span className="nav-icon"><FcImport size={18} /></span>
            {t('nav.logout')}
          </button>
        </div>
      </nav>

      <div 
        className="sidebar-user" 
        style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
        onClick={() => navigate('/profile')}
      >
        <div className="avatar" style={{ background: 'var(--color-primary)', color: 'white', fontWeight: 800 }}>
          {user?.name?.[0]?.toUpperCase()}
        </div>
        <div className="user-info">
          <div className="user-name" style={{ fontWeight: 700 }}>{user?.name}</div>
          <div className="text-muted text-xs">View Profile</div>
        </div>
        <div style={{ marginLeft: 'auto', opacity: 0.5, fontSize: 12 }}>›</div>
      </div>
    </aside>
  );
}

