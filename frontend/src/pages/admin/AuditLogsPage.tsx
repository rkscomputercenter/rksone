import React, { useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import { logsApi, usersApi } from '../../api';
import { PageLoading } from '../../components/ui/Loading';
import Pager from '../../components/ui/Pager';
import { istDate, money } from '../../components/sales/SalesLedger';
import type { Log } from '../../types';

const LIMIT = 30;

const ACTION: Record<string, { label: string; cls: string }> = {
  CREATE: { label: 'Added', cls: 'badge-green' },
  UPDATE: { label: 'Changed', cls: 'badge-yellow' },
  DELETE: { label: 'Deleted', cls: 'badge-red' },
};

const time = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit' });
const rupees = (v: unknown) => `₹${money(Number(v) || 0)}`;

/** What happened to a sale, in a sentence or two. */
function describe(log: Log): React.ReactNode {
  const before = (log.oldValue ?? null) as Record<string, any> | null;
  const after = (log.newValue ?? null) as Record<string, any> | null;
  if (log.action === 'DELETE' && before) return <>Deleted a sale worth <b>{rupees(before.totalPrice)}</b>.</>;
  if (log.action === 'CREATE' && after) return <>Added a sale worth <b>{rupees(after.totalPrice)}</b>, quantity {after.quantity}.</>;
  if (log.action === 'UPDATE' && before && after) {
    const parts: string[] = [];
    if (before.quantity !== after.quantity) parts.push(`quantity ${before.quantity} to ${after.quantity}`);
    if (before.totalPrice !== after.totalPrice) parts.push(`total ${rupees(before.totalPrice)} to ${rupees(after.totalPrice)}`);
    if ((before.notes ?? '') !== (after.notes ?? '')) parts.push(`note “${before.notes || 'none'}” to “${after.notes || 'none'}”`);
    return parts.length ? <>Changed {parts.join(', ')}.</> : 'Saved without a visible change.';
  }
  return '';
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<Array<{ id: string; name: string; username: string }>>([]);
  const [error, setError] = useState('');

  // Filters
  const [date, setDate] = useState(istDate());
  const [userId, setUserId] = useState('');
  const [action, setAction] = useState('UPDATE,DELETE');

  useEffect(() => {
    usersApi.directory().then(r => setUsers(r.data.data ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    let current = true;
    setLoading(true); setError('');
    logsApi.list({ tableName: 'transactions', date, page, limit: LIMIT, details: true, ...(userId && { userId }), ...(action && { action }) })
      .then(r => { if (current) { setLogs(r.data.data ?? []); setTotal(r.data.meta?.total ?? 0); } })
      .catch(() => { if (current) setError('The log didn’t load. Check the connection and try again.'); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [date, userId, action, page]);

  return (
    <Layout title="Transaction log">
      <div className="page-header">
        <div>
          <div className="page-header-title">Transaction log</div>
          <div className="page-header-sub">Sales that were added, changed or deleted on this day.</div>
        </div>
      </div>

      <div className="filters">
        <input type="date" aria-label="Date" className="form-input" style={{ width: 160 }} value={date} max={istDate()}
          onChange={e => { setDate(e.target.value || istDate()); setPage(1); }} />
        <select aria-label="Who" className="form-select" style={{ minWidth: 150 }} value={userId} onChange={e => { setUserId(e.target.value); setPage(1); }}>
          <option value="">Anyone</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select aria-label="What happened" className="form-select filters-wide" style={{ minWidth: 150 }} value={action} onChange={e => { setAction(e.target.value); setPage(1); }}>
          <option value="UPDATE,DELETE">Changes and deletions</option>
          <option value="UPDATE">Changes only</option>
          <option value="DELETE">Deletions only</option>
          <option value="CREATE">Additions</option>
        </select>
      </div>

      {error && <div className="alert alert-error mb-16" role="alert">{error}</div>}

      {loading ? <PageLoading /> : logs.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-title">Nothing on this day</div>
          <div className="empty-state-sub">No sales were {action === 'CREATE' ? 'added' : 'changed or deleted'} that match.</div>
        </div>
      ) : (
        <>
          <div className="table-wrapper hide-mobile">
            <table>
              <thead><tr><th>Time</th><th>Who</th><th>What happened</th><th>Details</th></tr></thead>
              <tbody>
                {logs.map(l => {
                  const a = ACTION[l.action];
                  return (
                    <tr key={l.id}>
                      <td className="text-muted" style={{ whiteSpace: 'nowrap' }}>{time(l.createdAt)}</td>
                      <td style={{ fontWeight: 600 }}>{l.user?.name}</td>
                      <td><span className={`badge ${a?.cls ?? ''}`}>{a?.label ?? l.action}</span></td>
                      <td className="text-sm">{describe(l)} <span className="text-xs text-muted">…{l.recordId.slice(-6)}</span></td>
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
                    <span className="rec-title">{l.user?.name}</span>
                    <span className={`badge ${a?.cls ?? ''}`}>{a?.label ?? l.action}</span>
                  </div>
                  <div className="rec-body">{describe(l)}</div>
                  <div className="rec-meta"><span>{time(l.createdAt)}</span><span>…{l.recordId.slice(-6)}</span></div>
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
