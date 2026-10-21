import React, { useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import { analyticsApi, usersApi } from '../../api';
import type { DailyAnalytics, MonthlyAnalytics, User } from '../../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import FloatingCalculator from '../../components/common/FloatingCalculator';

export default function UserPerformancePage() {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  
  const [tab, setTab] = useState<'daily' | 'monthly'>('daily');
  const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const nowIST = new Date();
  const [date, setDate] = useState(todayIST);
  const [year, setYear] = useState(nowIST.getFullYear());
  const [month, setMonth] = useState(nowIST.getMonth() + 1);
  
  const [daily, setDaily] = useState<DailyAnalytics | null>(null);
  const [monthly, setMonthly] = useState<MonthlyAnalytics | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    usersApi.list().then(res => {
      const activeUsers = res.data.data || [];
      setUsers(activeUsers);
      if (activeUsers.length > 0) setSelectedUserId(activeUsers[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedUserId) return;
    setLoading(true);
    if (tab === 'daily') {
      analyticsApi.daily(date, selectedUserId).then(r => setDaily(r.data.data!)).finally(() => setLoading(false));
    } else {
      analyticsApi.monthly(year, month, selectedUserId).then(r => setMonthly(r.data.data!)).finally(() => setLoading(false));
    }
  }, [tab, date, year, month, selectedUserId]);

  const StatCard = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <div className="stat-card" style={{ '--stat-color': color } as React.CSSProperties}>
      <div className="stat-label">{label}</div>
      <div className="stat-value currency">{value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
    </div>
  );

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <Layout title="User Performance">
      <div className="page-header">
        <div>
          <div className="page-header-title">User Performance</div>
          <div className="page-header-sub">Track revenue and expenses recorded by specific users</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`btn ${tab === 'daily' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('daily')}>Daily</button>
          <button className={`btn ${tab === 'monthly' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('monthly')}>Monthly</button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label className="form-label" style={{ marginBottom: 0 }}>Target User:</label>
          <select className="form-select" style={{ width: 220 }} value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name} ({u.username})</option>
            ))}
          </select>
        </div>

        {tab === 'daily' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label className="form-label" style={{ marginBottom: 0 }}>Date:</label>
            <input type="date" className="form-input" style={{ width: 180 }} value={date} max={todayIST} onChange={e => setDate(e.target.value)} />
          </div>
        )}

        {tab === 'monthly' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label className="form-label" style={{ marginBottom: 0 }}>Year / Month:</label>
            <select className="form-select" style={{ width: 100 }} value={year} onChange={e => setYear(Number(e.target.value))}>
              {[...Array(5)].map((_, i) => <option key={i} value={nowIST.getFullYear() - i}>{nowIST.getFullYear() - i}</option>)}
            </select>
            <select className="form-select" style={{ width: 120 }} value={month} onChange={e => setMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
        )}
      </div>

      {loading && <div className="page-loading"><div className="spinner spinner-lg" /></div>}

      {!loading && !selectedUserId && (
        <div className="empty-state">
          <div className="empty-state-icon">👤</div>
          <div className="empty-state-title">Select a user</div>
          <div className="empty-state-sub">Please select a user to view their performance metrics</div>
        </div>
      )}

      {!loading && selectedUserId && tab === 'daily' && daily && (() => {
        const selectedUser = users.find(u => u.id === selectedUserId);
        const hasComputer = selectedUser?.shopAccess?.includes('SHOP_COMPUTER') || selectedUser?.role === 'ADMIN' || selectedUser?.role === 'SUPER_ADMIN';
        const hasXerox = selectedUser?.shopAccess?.includes('SHOP_XEROX') || selectedUser?.role === 'ADMIN' || selectedUser?.role === 'SUPER_ADMIN';

        return (
          <div className="stat-grid">
            <StatCard label="Total Income Logged" value={daily.income} color="var(--green)" />
            <StatCard label="Shop Computer Cash" value={daily.computerCash || 0} color="#10B981" />
            <StatCard label="Shop Computer Online" value={daily.computerOnline || 0} color="#3B82F6" />
            <StatCard label="Shop Xerox Cash" value={daily.xeroxCash || 0} color="#059669" />
            <StatCard label="Shop Xerox Online" value={daily.xeroxOnline || 0} color="#2563EB" />
            <StatCard label="Shop Xerox (Direct)" value={daily.shopXeroxDirect || 0} color="#8B5CF6" />
            <StatCard label="Other Collected" value={daily.otherIncome || 0} color="#F59E0B" />
            <StatCard label="Expenses Approved" value={daily.expenses} color="var(--red)" />
            <StatCard label={`Net Profit ${daily.profit < 0 ? '(Loss)' : ''}`} value={daily.profit} color={daily.profit >= 0 ? 'var(--green)' : 'var(--red)'} />
            <div className="stat-card" style={{ '--stat-color': 'var(--blue)' } as React.CSSProperties}>
              <div className="stat-label">Transactions Made</div>
              <div className="stat-value">{daily.transactionCount}</div>
            </div>
          </div>
        );
      })()}

      {!loading && selectedUserId && tab === 'monthly' && monthly && (() => {
        const selectedUser = users.find(u => u.id === selectedUserId);
        const hasComputer = selectedUser?.shopAccess?.includes('SHOP_COMPUTER') || selectedUser?.role === 'ADMIN' || selectedUser?.role === 'SUPER_ADMIN';
        const hasXerox = selectedUser?.shopAccess?.includes('SHOP_XEROX') || selectedUser?.role === 'ADMIN' || selectedUser?.role === 'SUPER_ADMIN';

        return (
        <>
          <div className="stat-grid">
            <StatCard label="Monthly Income Logged" value={monthly.income} color="var(--green)" />
            <StatCard label="Shop Computer Cash" value={monthly.computerCash || 0} color="#10B981" />
            <StatCard label="Shop Computer Online" value={monthly.computerOnline || 0} color="#3B82F6" />
            <StatCard label="Shop Xerox Cash" value={monthly.xeroxCash || 0} color="#059669" />
            <StatCard label="Shop Xerox Online" value={monthly.xeroxOnline || 0} color="#2563EB" />
            <StatCard label="Shop Xerox (Direct)" value={monthly.shopXeroxDirect || 0} color="#8B5CF6" />
            <StatCard label="Monthly Other" value={monthly.otherIncome || 0} color="#F59E0B" />
            <StatCard label="Monthly Expenses" value={monthly.expenses} color="var(--red)" />
            <StatCard label="Monthly Profit" value={monthly.profit} color={monthly.profit >= 0 ? 'var(--green)' : 'var(--red)'} />
            <div className="stat-card" style={{ '--stat-color': 'var(--blue)' } as React.CSSProperties}>
              <div className="stat-label">Total Transactions</div>
              <div className="stat-value">{monthly.transactionCount}</div>
            </div>
          </div>

          {monthly.daily.length > 0 && (
            <div className="card">
              <div className="card-title" style={{ marginBottom: 20 }}>Daily Income vs Expenses for User</div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthly.daily} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#606080' }} tickFormatter={d => d.slice(8)} />
                  <YAxis tick={{ fontSize: 11, fill: '#606080' }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`, '']} contentStyle={{ background: '#1A1A24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} labelStyle={{ color: '#A0A0B8' }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="computerCash" name="Computer Cash" stackId="income" fill="#10B981" />
                  <Bar dataKey="computerOnline" name="Computer Online" stackId="income" fill="#3B82F6" />
                  <Bar dataKey="xeroxCash" name="Xerox Cash" stackId="income" fill="#059669" />
                  <Bar dataKey="xeroxOnline" name="Xerox Online" stackId="income" fill="#2563EB" />
                  <Bar dataKey="shopXeroxDirect" name="Shop Xerox (Direct)" stackId="income" fill="#8B5CF6" />
                  <Bar dataKey="otherIncome" name="Other Income" stackId="income" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses Logged" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
        );
      })()}

      <FloatingCalculator />
    </Layout>
  );
}
