import React, { useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import { logsApi, usersApi } from '../../api';
import type { Log, User } from '../../types';

const actionBadge = (a: string) => {
  const cls = a === 'CREATE' ? 'badge-green' : a === 'DELETE' ? 'badge-red' : 'badge-yellow';
  return <span className={`badge ${cls}`}>{a}</span>;
};

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState({ action: '', tableName: '', date: '', userId: '' });
  const [users, setUsers] = useState<User[]>([]);
  const [cleaning, setCleaning] = useState(false);
  const [msg, setMsg] = useState('');
  const LIMIT = 50;

  const load = () => {
    setLoading(true);
    logsApi.list({ page, limit: LIMIT, ...filter })
      .then(r => { setLogs(r.data.data ?? []); setTotal(r.data.meta?.total ?? 0); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    usersApi.list().then(r => setUsers(r.data.data || []));
  }, []);

  useEffect(() => { load(); }, [page, filter]);

  const handleCleanup = async () => {
    if (!confirm('Delete logs older than retention period?')) return;
    setCleaning(true);
    try {
      const r = await logsApi.cleanup();
      setMsg(r.data.message || 'Cleanup complete');
      load();
    } catch { setMsg('Cleanup failed'); }
    finally { setCleaning(false); }
  };

  const pages = Math.ceil(total / LIMIT);

  return (
    <Layout title="Audit Logs">
      <div className="page-header">
        <div>
          <div className="page-header-title">Audit Logs</div>
          <div className="page-header-sub">{total} total records</div>
        </div>
        <button className="btn btn-danger" onClick={handleCleanup} disabled={cleaning}>
          {cleaning ? 'Cleaning...' : '🗑 Run Cleanup'}
        </button>
      </div>

      {msg && <div className="alert alert-info mb-16">{msg}</div>}

      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <input 
          type="date" 
          className="form-input" 
          style={{ width: 160 }} 
          value={filter.date} 
          onChange={e => { setFilter(f => ({ ...f, date: e.target.value })); setPage(1); }} 
          max={new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })}
        />
        <select className="form-select" style={{ width: 150 }} value={filter.action} onChange={e => { setFilter(f => ({ ...f, action: e.target.value })); setPage(1); }}>
          <option value="">All Actions</option>
          <option value="CREATE">CREATE</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
        </select>
        <select className="form-select" style={{ width: 170 }} value={filter.tableName} onChange={e => { setFilter(f => ({ ...f, tableName: e.target.value })); setPage(1); }}>
          <option value="">All Tables</option>
          <option value="transactions">Transactions</option>
          <option value="expenses">Expenses</option>
          <option value="bank_accounts">Bank Accounts</option>
          <option value="auto_transactions">Auto Transactions</option>
          <option value="services">Services</option>
          <option value="users">Users</option>
        </select>
        <select className="form-select" style={{ width: 150 }} value={filter.userId} onChange={e => { setFilter(f => ({ ...f, userId: e.target.value })); setPage(1); }}>
          <option value="">All Users</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.username})</option>)}
        </select>
        <button className="btn btn-ghost" onClick={() => setFilter({ action: '', tableName: '', date: '', userId: '' })}>Clear</button>
      </div>

      {loading ? <div className="page-loading"><div className="spinner spinner-lg" /></div> : logs.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">📜</div><div className="empty-state-title">No logs found</div></div>
      ) : (
        <>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Table</th><th>Record ID</th></tr></thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id}>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(l.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td style={{ fontWeight: 600 }}>{l.user?.name}</td>
                    <td>{actionBadge(l.action)}</td>
                    <td><span className="badge badge-blue">{l.tableName}</span></td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{l.recordId.slice(0, 8)}…</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center' }}>
              <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
              <span style={{ lineHeight: '32px', fontSize: 13, color: 'var(--text-muted)' }}>Page {page} of {pages}</span>
              <button className="btn btn-ghost btn-sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
