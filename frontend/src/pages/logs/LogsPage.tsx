import React, { useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import { logsApi, usersApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { PageLoading } from '../../components/ui/Loading';
import Pager from '../../components/ui/Pager';
import { istDate } from '../../components/sales/SalesLedger';
import type { Log } from '../../types';

const LIMIT = 30;

const ACTION: Record<string, { label: string; cls: string }> = {
  CREATE: { label: 'Added', cls: 'badge-green' },
  UPDATE: { label: 'Changed', cls: 'badge-yellow' },
  DELETE: { label: 'Deleted', cls: 'badge-red' },
};
const WHAT: Record<string, string> = {
  transactions: 'Sale', expenses: 'Expense', bank_accounts: 'Bank account', auto_transactions: 'Automatic entry',
  services: 'Service', users: 'User', bills: 'Bill',
};
const TABLES = [['', 'Everything'], ['transactions', 'Sales'], ['expenses', 'Expenses'], ['bank_accounts', 'Bank accounts'], ['auto_transactions', 'Automatic entries'], ['services', 'Services'], ['users', 'Users']];

const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function LogsPage() {
  const { isAdmin, hasPermission } = useAuth();
  // Someone who may see records but not the system logs only has sales and expenses to look at
  const systemLogs = hasPermission('salaryLogs');
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState({ action: '', tableName: '', date: '', userId: '' });
  const [users, setUsers] = useState<Array<{ id: string; name: string; username: string }>>([]);
  const [cleaning, setCleaning] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    usersApi.directory().then(r => setUsers(r.data.data ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    let current = true;
    setLoading(true); setError('');
    logsApi.list({ page, limit: LIMIT, ...Object.fromEntries(Object.entries(filter).filter(([, v]) => v)) })
      .then(r => { if (current) { setLogs(r.data.data ?? []); setTotal(r.data.meta?.total ?? 0); } })
      .catch(() => { if (current) setError('The logs didn’t load. Check the connection and try again.'); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [page, filter, reload]);

  const set = (patch: Partial<typeof filter>) => { setFilter(f => ({ ...f, ...patch })); setPage(1); };

  const handleCleanup = async () => {
    setCleaning(true); setMsg(''); setError('');
    try {
      const r = await logsApi.cleanup();
      setMsg(r.data.message || 'Old entries deleted.');
      setPage(1); setReload(n => n + 1);
    } catch { setError('The old entries were not deleted. Try again.'); }
    finally { setCleaning(false); }
  };

  const anyFilter = Object.values(filter).some(Boolean);
  const tables = systemLogs ? TABLES : TABLES.filter(([v]) => v === '' || v === 'transactions' || v === 'expenses');

  return (
    <Layout title="Audit log">
      <div className="page-header">
        <div>
          <div className="page-header-title">Audit log</div>
          <div className="page-header-sub">Who added, changed or deleted what. {total} {total === 1 ? 'entry' : 'entries'}{anyFilter ? ' match' : ''}.</div>
        </div>
        {isAdmin && (
          <button className="btn btn-ghost" onClick={handleCleanup} disabled={cleaning} title="Removes entries older than the retention period">
            {cleaning ? 'Deleting' : 'Delete old entries'}
          </button>
        )}
      </div>

      {msg && <div className="alert alert-success mb-16" aria-live="polite">{msg}</div>}
      {error && <div className="alert alert-error mb-16" role="alert">{error}</div>}

      <div className="filters">
        <input type="date" aria-label="Date" className="form-input" style={{ width: 160 }} value={filter.date} max={istDate()} onChange={e => set({ date: e.target.value })} />
        <select aria-label="What happened" className="form-select" style={{ width: 150 }} value={filter.action} onChange={e => set({ action: e.target.value })}>
          <option value="">Any change</option>
          <option value="CREATE">Added</option>
          <option value="UPDATE">Changed</option>
          <option value="DELETE">Deleted</option>
        </select>
        <select aria-label="Which records" className="form-select" style={{ width: 170 }} value={filter.tableName} onChange={e => set({ tableName: e.target.value })}>
          {tables.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select aria-label="Who" className="form-select" style={{ width: 170 }} value={filter.userId} onChange={e => set({ userId: e.target.value })}>
          <option value="">Anyone</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        {anyFilter && <button className="btn btn-ghost filters-wide" onClick={() => { setFilter({ action: '', tableName: '', date: '', userId: '' }); setPage(1); }}>Clear filters</button>}
      </div>

      {loading ? <PageLoading /> : logs.length === 0 ? (
        <div className="card empty-state"><div className="empty-state-title">Nothing to show</div><div className="empty-state-sub">{anyFilter ? 'No entries match these filters.' : 'Nothing has been logged yet.'}</div></div>
      ) : (
        <>
          <div className="table-wrapper hide-mobile">
            <table>
              <thead><tr><th>When</th><th>Who</th><th>What happened</th><th>Record</th></tr></thead>
              <tbody>
                {logs.map(l => {
                  const a = ACTION[l.action];
                  return (
                    <tr key={l.id}>
                      <td className="text-muted" style={{ whiteSpace: 'nowrap' }}>{when(l.createdAt)}</td>
                      <td style={{ fontWeight: 600 }}>{l.user?.name}</td>
                      <td><span className={`badge ${a?.cls ?? ''}`}>{a?.label ?? l.action}</span></td>
                      <td>{WHAT[l.tableName] ?? l.tableName} <span className="text-xs text-muted">…{l.recordId.slice(-6)}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="rec-list hide-desktop">
            {logs.map(l => {
              const a = ACTION[l.action];
              return (
                <article className="rec" key={l.id}>
                  <div className="rec-top">
                    <span className="rec-title">{WHAT[l.tableName] ?? l.tableName}</span>
                    <span className={`badge ${a?.cls ?? ''}`}>{a?.label ?? l.action}</span>
                  </div>
                  <div className="rec-meta"><span>{l.user?.name}</span><span>{when(l.createdAt)}</span><span>…{l.recordId.slice(-6)}</span></div>
                </article>
              );
            })}
          </div>

          <Pager page={page} pages={Math.ceil(total / LIMIT)} onPage={setPage} />
        </>
      )}
    </Layout>
  );
}
