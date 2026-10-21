import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { analyticsApi, transactionsApi } from '../api';
import type { TodaySummary, Transaction, MonthlyAnalytics } from '../types';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const fmt = (n: number) => '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });

export default function Dashboard() {
  const { user, hasPermission, isSuperAdmin, isAdmin } = useAuth();
  const canViewAnalytics = hasPermission('analytics');
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<TodaySummary | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyAnalytics | null>(null);
  const [recentTx, setRecentTx] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sumRes, txRes, monRes] = await Promise.all([
          analyticsApi.todaySummary(),
          isAdmin ? transactionsApi.list({ limit: 5 }) : Promise.resolve({ data: { data: [] } } as any),
          isAdmin ? analyticsApi.monthly() : Promise.resolve(null)
        ]);
        setSummary(sumRes.data.data!);
        if (isAdmin) {
          setRecentTx(txRes.data.data || []);
          if (monRes) setMonthlyData(monRes.data.data!);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isAdmin]);

  const title = t('nav.dashboard' as any);
  const chartData = monthlyData?.daily.map(d => ({
    name: d.date.split('-')[2], // Day of month
    Income: d.income,
    Expenses: d.expenses
  })) || [];

  return (
    <Layout title={title}>
      <div className="page-header" style={{ animation: 'slideUpSaaS 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}>
        <div>
          <div className="page-header-title">{t('dashboard.welcome' as any)}, {user?.name?.split(' ')[0]} 👋</div>
          <div className="page-header-sub">{new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stat-grid" style={{ animation: 'slideUpSaaS 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards', animationDelay: '0.1s', opacity: 0 }}>
        <div className="stat-card" style={{ '--stat-color': 'var(--green)' } as React.CSSProperties}>
          <div className="stat-icon">💰</div>
          <div className="stat-label">{t('dashboard.todayIncome' as any)}</div>
          <div className="stat-value currency">{loading ? '—' : (summary?.income ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
          <div className="stat-sub">{summary?.transactionCount ?? 0} {t('dashboard.transactionsCount' as any)}</div>
        </div>

        {isAdmin && (
          <>
            <div className="stat-card" style={{ '--stat-color': 'var(--red)' } as React.CSSProperties}>
              <div className="stat-icon">📤</div>
              <div className="stat-label">{t('dashboard.todayExpenses' as any)}</div>
              <div className="stat-value currency">{loading ? '—' : (summary?.expenses ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
              <div className="stat-sub">{t('dashboard.approvedOnly' as any)}</div>
            </div>
            <div className="stat-card" style={{ '--stat-color': summary && summary.profit >= 0 ? 'var(--green)' : 'var(--red)' } as React.CSSProperties}>
              <div className="stat-icon">📈</div>
              <div className="stat-label">{t('dashboard.todayProfit' as any)}</div>
              <div className="stat-value currency" style={{ color: summary && summary.profit >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {loading ? '—' : (summary?.profit ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </div>
              <div className="stat-sub">{t('dashboard.profitSub' as any)}</div>
            </div>
          </>
        )}

        {isAdmin && summary && summary.pendingExpenseCount > 0 && (
          <div className="stat-card" style={{ '--stat-color': 'var(--yellow)' } as React.CSSProperties}>
            <div className="stat-icon">⏳</div>
            <div className="stat-label">{t('dashboard.pendingApprovals' as any)}</div>
            <div className="stat-value" style={{ color: 'var(--yellow)' }}>{summary.pendingExpenseCount}</div>
            <div className="stat-sub">{t('dashboard.pendingSub' as any)}</div>
          </div>
        )}
      </div>

      {/* Analytics & Transactions Grid */}
      {isAdmin && (
        <div className="form-grid" style={{ marginBottom: 24, animation: 'slideUpSaaS 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards', animationDelay: '0.2s', opacity: 0 }}>
          <div className="card" style={{ padding: '24px 20px 10px 10px' }}>
            <div className="card-header" style={{ paddingLeft: 10 }}>
              <div className="card-title">Revenue & Expenses (This Month)</div>
            </div>
            <div style={{ height: 260, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--green)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--green)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--red)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--red)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: '12px', backdropFilter: 'blur(16px)' }}
                    itemStyle={{ color: 'var(--text-primary)', fontSize: '13px' }}
                  />
                  <Area type="monotone" dataKey="Income" stroke="var(--green)" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                  <Area type="monotone" dataKey="Expenses" stroke="var(--red)" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="card">
            <div className="card-header">
              <div className="card-title">Recent Transactions</div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/transactions')}>View All</button>
            </div>
            <div className="service-list" style={{ border: 'none', padding: 0 }}>
              {loading ? <div style={{ textAlign: 'center', padding: 20 }}><div className="spinner" /></div> : recentTx.length === 0 ? <div className="text-muted" style={{ padding: 20, textAlign: 'center' }}>No transactions today</div> : recentTx.map(tx => (
                <div key={tx.id} className="service-item" onClick={() => navigate('/transactions')} style={{ borderBottom: '1px solid var(--border-subtle)', borderRadius: 0, padding: '14px 8px' }}>
                  <div>
                    <div className="service-item-name">{tx.service.name}</div>
                    <div className="service-item-cat">{tx.paymentMethod} • {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <div className="service-item-price text-success">+{fmt(tx.totalPrice)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="section-title" style={{ animation: 'slideUpSaaS 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards', animationDelay: '0.3s', opacity: 0 }}>{t('dashboard.quickActions' as any)}</div>
      <div className="quick-actions" style={{ animation: 'slideUpSaaS 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards', animationDelay: '0.4s', opacity: 0 }}>
        <div className="quick-action-card" onClick={() => navigate('/transactions/new')}>
          <div className="quick-action-icon">＋</div>
          <div className="quick-action-label">{t('nav.newEntry' as any)}</div>
        </div>
        <div className="quick-action-card" onClick={() => navigate('/transactions')}>
          <div className="quick-action-icon">📋</div>
          <div className="quick-action-label">{t('nav.myTransactions' as any)}</div>
        </div>
        <div className="quick-action-card" onClick={() => navigate('/expenses/new')}>
          <div className="quick-action-icon">💸</div>
          <div className="quick-action-label">{t('dashboard.addExpense' as any)}</div>
        </div>
        <div className="quick-action-card" onClick={() => navigate('/expenses')}>
          <div className="quick-action-icon">📑</div>
          <div className="quick-action-label">{t('nav.myExpenses' as any)}</div>
        </div>
        {canViewAnalytics && (
          <>
            <div className="quick-action-card" onClick={() => navigate('/analytics')}>
              <div className="quick-action-icon">📊</div>
              <div className="quick-action-label">{t('nav.analytics' as any)}</div>
            </div>
            <div className="quick-action-card" onClick={() => navigate('/services')}>
              <div className="quick-action-icon">🛠</div>
              <div className="quick-action-label">{t('nav.services' as any)}</div>
            </div>
          </>
        )}
        {isSuperAdmin && (
          <>
            <div className="quick-action-card" onClick={() => navigate('/users')}>
              <div className="quick-action-icon">👥</div>
              <div className="quick-action-label">{t('nav.users' as any)}</div>
            </div>
            <div className="quick-action-card" onClick={() => navigate('/logs')}>
              <div className="quick-action-icon">📜</div>
              <div className="quick-action-label">{t('nav.auditLogs' as any)}</div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
