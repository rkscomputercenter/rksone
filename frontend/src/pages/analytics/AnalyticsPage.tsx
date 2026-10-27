import React, { useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import FloatingCalculator from '../../components/common/FloatingCalculator';
import { analyticsApi } from '../../api';
import { DayLine, MonthChart, Split } from '../../components/analytics/Figures';
import { CAT_LABEL, istDate, money } from '../../components/sales/SalesLedger';
import type { DailyAnalytics, MonthlyAnalytics } from '../../types';
import { PageLoading } from '../../components/ui/Loading';

export default function AnalyticsPage() {
  const today = istDate();
  const [tab, setTab] = useState<'daily' | 'monthly'>('daily');
  const [date, setDate] = useState(today);
  const [monthValue, setMonthValue] = useState(today.slice(0, 7)); // YYYY-MM, IST
  const [daily, setDaily] = useState<DailyAnalytics | null>(null);
  const [monthly, setMonthly] = useState<MonthlyAnalytics | null>(null);
  const [shopFilter, setShopFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true); setError('');
    const [year, month] = monthValue.split('-').map(Number);
    const req = tab === 'daily'
      ? analyticsApi.daily(date, undefined, shopFilter).then(r => setDaily(r.data.data!))
      : analyticsApi.monthly(year, month, undefined, shopFilter).then(r => setMonthly(r.data.data!));
    req.catch(() => setError('The figures didn’t load. Check the connection and try again.')).finally(() => setLoading(false));
  }, [tab, date, monthValue, shopFilter]);


  return (
    <Layout title="Analytics">
      <div className="page-header">
        <div>
          <div className="page-header-title">Analytics</div>
          <div className="page-header-sub">Sales, expenses and net for a day or a month.</div>
        </div>
      </div>

      <div className="toolbar">
        <div className="seg" role="group" aria-label="Period">
          <button type="button" aria-pressed={tab === 'daily'} onClick={() => setTab('daily')}>Day</button>
          <button type="button" aria-pressed={tab === 'monthly'} onClick={() => setTab('monthly')}>Month</button>
        </div>
        <div className="seg" role="group" aria-label="Shop">
          {[['', 'Both shops'], ['SHOP_COMPUTER', 'Computer'], ['SHOP_XEROX', 'Xerox']].map(([v, l]) => (
            <button key={v} type="button" aria-pressed={shopFilter === v} onClick={() => setShopFilter(v)}>{l}</button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto' }}>
          {tab === 'daily'
            ? <input type="date" aria-label="Day" className="form-input" style={{ width: 170 }} value={date} max={today} onChange={e => setDate(e.target.value || today)} />
            : <input type="month" aria-label="Month" className="form-input" style={{ width: 170 }} value={monthValue} max={today.slice(0, 7)} onChange={e => setMonthValue(e.target.value || today.slice(0, 7))} />}
        </div>
      </div>

      {error && <div className="alert alert-error mb-16" role="alert">{error}</div>}
      {loading && <PageLoading />}

      {!loading && tab === 'daily' && daily && (
        <>
          <DayLine t={daily} period={date === today ? 'today' : 'that day'} />
          <div className="two-col">
            <Split t={daily} shop={shopFilter} />
            <section className="table-wrapper" aria-labelledby="staff-title">
              <div style={{ padding: '14px 16px 10px' }}><h2 id="staff-title" className="card-title">By staff</h2></div>
              {daily.userBreakdown.length === 0 ? <div className="empty-state" style={{ padding: 24 }}>No sales on this day.</div> : (
                <table>
                  <thead><tr><th>Name</th><th className="amount">Entries</th><th className="amount">Sales</th></tr></thead>
                  <tbody>
                    {daily.userBreakdown.map((u, i) => (
                      <tr key={i}><td>{u.user?.name}</td><td className="amount">{u.count}</td><td className="amount" style={{ fontWeight: 600 }}>₹{money(u.revenue)}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>

          {daily.topServices.length > 0 && (
            <section className="table-wrapper mb-24" aria-labelledby="top-title">
              <div style={{ padding: '14px 16px 10px' }}><h2 id="top-title" className="card-title">Services that earned the most</h2></div>
              <table>
                <thead><tr><th>Service</th><th>Category</th><th className="amount">Times</th><th className="amount">Sales</th></tr></thead>
                <tbody>
                  {daily.topServices.map((ts, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{ts.service?.name}</td>
                      <td className="text-muted">{CAT_LABEL[ts.service?.category] ?? ts.service?.category}</td>
                      <td className="amount">{ts.count}</td>
                      <td className="amount" style={{ fontWeight: 650, color: 'var(--cash)' }}>₹{money(ts.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}

      {!loading && tab === 'monthly' && monthly && (
        <>
          <DayLine t={monthly} period="this month" />
          <div className="two-col">
            <section className="card" aria-labelledby="chart-title">
              <div className="card-header"><h2 id="chart-title" className="card-title">Day by day</h2></div>
              <MonthChart monthly={monthly} />
            </section>
            <Split t={monthly} shop={shopFilter} />
          </div>
        </>
      )}

      <FloatingCalculator />
    </Layout>
  );
}
