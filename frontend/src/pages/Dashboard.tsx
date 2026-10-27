import React, { lazy, Suspense, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, ListOrdered, Wallet, ReceiptText, BarChart3, Wrench, Users, FileClock, ChevronRight } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { analyticsApi, banksApi, transactionsApi } from '../api';
import type { BankAccount, TodaySummary, Transaction, MonthlyAnalytics } from '../types';
import { PageLoading } from '../components/ui/Loading';

// The charts library is the heaviest part of the app; staff who never see the chart never download it
const MonthBars = lazy(() => import('../components/analytics/MonthBars'));

const money = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
const PAY_LABEL: Record<string, string> = { CASH: 'Cash', ONLINE: 'Online', OTHER: 'Other', SHOP_XEROX: 'Xerox counter' };

function Figure({ value, loading }: { value: number; loading: boolean }) {
  return <div className="dayline-value">{loading ? '–' : <><span className="cur">₹</span>{money(value)}</>}</div>;
}

export default function Dashboard() {
  const { user, hasPermission, isSuperAdmin } = useAuth();
  // Each panel follows the permission that matters for it (admins hold all of them)
  const canViewAnalytics = hasPermission('analytics');
  const canViewBanks = hasPermission('banks');
  const canViewRecords = hasPermission('allRecords');
  const canReviewExpenses = hasPermission('allRecords', 'write');
  const showMoney = canViewAnalytics || canViewRecords;
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<TodaySummary | null>(null);
  const [monthly, setMonthly] = useState<MonthlyAnalytics | null>(null);
  const [recentTx, setRecentTx] = useState<Transaction[]>([]);
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [sumRes, txRes, monRes, bankRes] = await Promise.all([
          analyticsApi.todaySummary(),
          canViewRecords ? transactionsApi.list({ limit: 6 }) : Promise.resolve(null),
          canViewAnalytics ? analyticsApi.monthly() : Promise.resolve(null),
          canViewBanks ? banksApi.list() : Promise.resolve(null),
        ]);
        setSummary(sumRes.data.data!);
        if (txRes) setRecentTx(txRes.data.data || []);
        if (monRes) setMonthly(monRes.data.data!);
        if (bankRes) setBanks(bankRes.data.data || []);
      } catch (err) {
        console.error(err);
        setLoadError('Today’s figures didn’t load. Pull to refresh or open the page again.');
      } finally {
        setLoading(false);
      }
    })();
  }, [canViewRecords, canViewAnalytics, canViewBanks]);

  const s = summary;
  const cash = s ? s.computerCash + s.xeroxCash + s.shopXeroxDirect : 0;
  const online = s ? s.computerOnline + s.xeroxOnline : 0;
  const firstName = user?.name?.split(' ')[0] ?? '';
  const todayLabel = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'long' });
  const chartData = monthly?.daily.map(d => ({ day: Number(d.date.split('-')[2]), Sales: d.income, Expenses: d.expenses })) || [];
  const bankTotal = banks.reduce((sum, b) => sum + Number(b.balance), 0);

  const shortcuts = [
    { icon: Plus, label: t('nav.newEntry' as any), to: '/transactions/new', show: true },
    { icon: ListOrdered, label: t('nav.myTransactions' as any), to: '/transactions', show: true },
    { icon: ReceiptText, label: t('dashboard.addExpense' as any), to: '/expenses/new', show: true },
    { icon: Wallet, label: t('nav.myExpenses' as any), to: '/expenses', show: true },
    { icon: BarChart3, label: t('nav.analytics' as any), to: '/analytics', show: canViewAnalytics },
    { icon: Wrench, label: t('nav.services' as any), to: '/services', show: hasPermission('services') },
    { icon: Users, label: t('nav.users' as any), to: '/users', show: isSuperAdmin },
    { icon: FileClock, label: t('nav.auditLogs' as any), to: '/logs', show: hasPermission('salaryLogs') },
  ].filter(x => x.show);

  return (
    <Layout title={t('nav.dashboard' as any)}>
      <div className="page-header">
        <div>
          <div className="page-header-title">{todayLabel}</div>
          <div className="page-header-sub">{t('dashboard.welcome' as any)}, {firstName}.</div>
        </div>
        <Link to="/transactions/new" className="btn btn-primary btn-lg hide-mobile">
          <Plus size={19} /> {t('nav.newEntry' as any)}
        </Link>
      </div>

      {loadError && <div className="alert alert-error mb-16">{loadError}</div>}

      <h2 className="sr-only">{t('dashboard.quickActions' as any)}</h2>
      <div className="quick-actions">
        {shortcuts.map(({ icon: Icon, label, to }) => (
          <Link key={to} to={to} className="quick-action-card">
            <span className="quick-action-icon"><Icon size={18} /></span>
            <span className="quick-action-label">{label}</span>
          </Link>
        ))}
      </div>

      {showMoney ? (
        <>
          <div className="dayline" aria-label="Today’s money">
            <div className="dayline-cell" style={{ '--cell-color': 'var(--cash)' } as React.CSSProperties}>
              <div className="dayline-label">Cash in</div>
              <Figure value={cash} loading={loading} />
              <div className="dayline-sub">{s?.transactionCount ?? 0} sales today</div>
            </div>
            <div className="dayline-cell" style={{ '--cell-color': 'var(--info)' } as React.CSSProperties}>
              <div className="dayline-label">Online in</div>
              <Figure value={online} loading={loading} />
              <div className="dayline-sub">{s && s.otherIncome > 0 ? `₹${money(s.otherIncome)} paid another way` : 'UPI and cards'}</div>
            </div>
            <div className="dayline-cell" style={{ '--cell-color': 'var(--stamp)' } as React.CSSProperties}>
              <div className="dayline-label">{t('dashboard.todayExpenses' as any)}</div>
              <Figure value={s?.expenses ?? 0} loading={loading} />
              <div className="dayline-sub">{t('dashboard.approvedOnly' as any)}</div>
            </div>
            <div className="dayline-cell net" style={{ '--cell-color': 'var(--ink)' } as React.CSSProperties}>
              <div className="dayline-label">{t('dashboard.todayProfit' as any)}</div>
              <div className="dayline-value" style={{ color: s && s.profit < 0 ? 'var(--stamp)' : 'var(--graphite)' }}>
                {loading ? '–' : <><span className="cur">₹</span>{money(s?.profit ?? 0)}</>}
              </div>
              <div className="dayline-sub">{t('dashboard.profitSub' as any)}</div>
            </div>
          </div>

          {canReviewExpenses && s && s.pendingExpenseCount > 0 && (
            <Link to="/admin/expenses" className="alert alert-warning mb-24" style={{ alignItems: 'center' }}>
              <span style={{ flex: 1 }}>
                <strong>{s.pendingExpenseCount} {s.pendingExpenseCount === 1 ? 'expense is' : 'expenses are'} waiting for approval.</strong>
              </span>
              <span style={{ fontWeight: 650, display: 'inline-flex', alignItems: 'center', gap: 2 }}>Review <ChevronRight size={16} /></span>
            </Link>
          )}

          <div className="two-col">
            {canViewAnalytics && <section className="card" aria-labelledby="month-title">
              <div className="card-header">
                <h2 id="month-title" className="card-title">This month, day by day</h2>
                {monthly && <span className="text-sm text-muted num">Net ₹{money(monthly.profit)}</span>}
              </div>
              <div style={{ height: 250, marginLeft: -12 }}>
                <Suspense fallback={<PageLoading height={250} />}>
                  <MonthBars data={chartData} />
                </Suspense>
              </div>
            </section>}

            {canViewRecords && <section className="card" aria-labelledby="recent-title">
              <div className="card-header">
                <h2 id="recent-title" className="card-title">Latest sales</h2>
                <Link to="/admin/transactions" className="btn-link text-sm">See all</Link>
              </div>
              {loading ? <PageLoading height={160} />
                : recentTx.length === 0 ? <div className="empty-state" style={{ padding: 24 }}>No sales recorded yet.</div>
                : (
                  <div className="ledger">
                    {recentTx.map(tx => (
                      <div key={tx.id} className="ledger-row">
                        <div className="ledger-main">{tx.service.name}{tx.quantity > 1 ? ` × ${tx.quantity}` : ''}</div>
                        <div className="ledger-amt amt-in">₹{money(Number(tx.totalPrice))}</div>
                        <div className="ledger-meta">
                          <span>{PAY_LABEL[tx.paymentMethod] ?? tx.paymentMethod}</span>
                          <span>{new Date(tx.createdAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}</span>
                          {tx.user?.name && <span>{tx.user.name}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </section>}
          </div>

          {canViewBanks && banks.length > 0 && (
            <section className="table-wrapper mb-24" aria-labelledby="banks-title">
              <div className="flex-between" style={{ padding: '14px 16px 10px' }}>
                <h2 id="banks-title" className="card-title">Bank balances</h2>
                <Link to="/banks" className="btn-link text-sm">Open bank book</Link>
              </div>
              <table>
                <thead><tr><th>Account</th><th className="amount">Balance</th></tr></thead>
                <tbody>
                  {banks.map(b => (
                    <tr key={b.id} style={{ cursor: 'pointer' }} onClick={() => navigate('/banks')}>
                      <td>{b.name}{b.isCash && <span className="badge" style={{ marginLeft: 8 }}>Cash</span>}</td>
                      <td className="amount" style={{ fontWeight: 600, color: Number(b.balance) < 0 ? 'var(--stamp)' : undefined }}>₹{money(Number(b.balance))}</td>
                    </tr>
                  ))}
                  <tr style={{ background: 'var(--sheet-2)' }}>
                    <td style={{ fontWeight: 650 }}>All accounts</td>
                    <td className="amount" style={{ fontWeight: 700 }}>₹{money(bankTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </section>
          )}
        </>
      ) : (
        <div className="dayline" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }} aria-label="Your sales today">
          <div className="dayline-cell" style={{ '--cell-color': 'var(--cash)' } as React.CSSProperties}>
            <div className="dayline-label">{t('dashboard.todayIncome' as any)}</div>
            <Figure value={s?.income ?? 0} loading={loading} />
            <div className="dayline-sub">Entered by you</div>
          </div>
          <div className="dayline-cell" style={{ '--cell-color': 'var(--ink)', borderTop: 'none', borderLeft: '1px solid var(--rule)' } as React.CSSProperties}>
            <div className="dayline-label">Entries</div>
            <div className="dayline-value">{loading ? '–' : s?.transactionCount ?? 0}</div>
            <div className="dayline-sub">{s?.expenseCount ? `${s.expenseCount} expenses too` : 'No expenses today'}</div>
          </div>
        </div>
      )}
    </Layout>
  );
}
