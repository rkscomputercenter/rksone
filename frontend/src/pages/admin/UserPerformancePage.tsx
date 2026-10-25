import React, { useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import FloatingCalculator from '../../components/common/FloatingCalculator';
import { DayLine, MonthChart, Split } from '../../components/analytics/Figures';
import { istDate } from '../../components/sales/SalesLedger';
import { analyticsApi, usersApi } from '../../api';
import type { DailyAnalytics, MonthlyAnalytics, User } from '../../types';

export default function UserPerformancePage() {
  const today = istDate();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [tab, setTab] = useState<'daily' | 'monthly'>('daily');
  const [date, setDate] = useState(today);
  const [monthValue, setMonthValue] = useState(today.slice(0, 7));
  const [daily, setDaily] = useState<DailyAnalytics | null>(null);
  const [monthly, setMonthly] = useState<MonthlyAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    usersApi.list().then(res => {
      const list = (res.data.data || []).filter(u => u.username !== 'SYSTEM_AUTO');
      setUsers(list);
      if (list.length > 0) setSelectedUserId(list[0].id);
    }).catch(() => setError('The staff list didn’t load.'));
  }, []);

  useEffect(() => {
    if (!selectedUserId) return;
    setLoading(true); setError('');
    const [year, month] = monthValue.split('-').map(Number);
    const req = tab === 'daily'
      ? analyticsApi.daily(date, selectedUserId).then(r => setDaily(r.data.data!))
      : analyticsApi.monthly(year, month, selectedUserId).then(r => setMonthly(r.data.data!));
    req.catch(() => setError('The figures didn’t load. Try again.')).finally(() => setLoading(false));
  }, [tab, date, monthValue, selectedUserId]);

  const person = users.find(u => u.id === selectedUserId);

  return (
    <Layout title="Staff performance">
      <div className="page-header">
        <div>
          <div className="page-header-title">Staff performance</div>
          <div className="page-header-sub">Sales and expenses entered by one person.</div>
        </div>
      </div>

      <div className="toolbar">
        <select aria-label="Staff member" className="form-select" style={{ width: 240 }} value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}>
          {users.map(u => <option key={u.id} value={u.id}>{u.name}{u.isActive ? '' : ' (inactive)'}</option>)}
        </select>
        <div className="seg" role="group" aria-label="Period">
          <button type="button" aria-pressed={tab === 'daily'} onClick={() => setTab('daily')}>Day</button>
          <button type="button" aria-pressed={tab === 'monthly'} onClick={() => setTab('monthly')}>Month</button>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          {tab === 'daily'
            ? <input type="date" aria-label="Day" className="form-input" style={{ width: 170 }} value={date} max={today} onChange={e => setDate(e.target.value || today)} />
            : <input type="month" aria-label="Month" className="form-input" style={{ width: 170 }} value={monthValue} max={today.slice(0, 7)} onChange={e => setMonthValue(e.target.value || today.slice(0, 7))} />}
        </div>
      </div>

      {error && <div className="alert alert-error mb-16" role="alert">{error}</div>}
      {loading && <div className="page-loading"><div className="spinner spinner-lg" /></div>}

      {!loading && person && tab === 'daily' && daily && (
        <>
          <DayLine t={daily} period={date === today ? 'today' : 'that day'} />
          <div className="two-col"><Split t={daily} shop="" /></div>
        </>
      )}

      {!loading && person && tab === 'monthly' && monthly && (
        <>
          <DayLine t={monthly} period="this month" />
          <div className="two-col">
            <section className="card" aria-labelledby="pm-chart"><div className="card-header"><h2 id="pm-chart" className="card-title">{person.name}, day by day</h2></div><MonthChart monthly={monthly} /></section>
            <Split t={monthly} shop="" />
          </div>
        </>
      )}

      <FloatingCalculator />
    </Layout>
  );
}
