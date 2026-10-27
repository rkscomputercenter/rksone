import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { logsApi } from '../../api';
import { PageLoading } from '../../components/ui/Loading';
import Pager from '../../components/ui/Pager';
import { money } from '../../components/sales/SalesLedger';
import type { Log } from '../../types';

const LIMIT = 30;
const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function BillLogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let current = true;
    setLoading(true); setError('');
    logsApi.list({ page, limit: LIMIT, tableName: 'bills', details: true })
      .then(res => { if (current) { setLogs(res.data.data ?? []); setTotal(res.data.meta?.total ?? 0); } })
      .catch(() => { if (current) setError('The bills didn’t load. Check the connection and try again.'); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [page, reload]);

  const billOf = (log: Log) => (log.newValue ?? {}) as { customerName?: string; total?: number; items?: unknown[]; date?: string };

  return (
    <Layout title="Bill log">
      <div className="page-header">
        <div>
          <div className="page-header-title">Bill log</div>
          <div className="page-header-sub">Every bill that was printed. {total} so far.</div>
        </div>
        <button className="btn btn-ghost" onClick={() => setReload(n => n + 1)} aria-label="Refresh"><RefreshCw size={16} /></button>
      </div>

      {error && <div className="alert alert-error mb-16" role="alert">{error}</div>}

      {loading ? <PageLoading /> : logs.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-title">No bills printed yet</div>
          <div className="empty-state-sub">Bills made on the Print a bill page will be listed here.</div>
        </div>
      ) : (
        <>
          <div className="table-wrapper hide-mobile">
            <table>
              <thead><tr><th>When</th><th>Printed by</th><th>Customer</th><th>Items</th><th>Date on the bill</th><th className="amount">Total</th></tr></thead>
              <tbody>
                {logs.map(log => {
                  const bill = billOf(log);
                  return (
                    <tr key={log.id}>
                      <td className="text-muted" style={{ whiteSpace: 'nowrap' }}>{when(log.createdAt)}</td>
                      <td style={{ fontWeight: 600 }}>{log.user?.name}</td>
                      <td>{bill.customerName || 'Walk-in customer'}</td>
                      <td>{bill.items?.length ?? 0}</td>
                      <td className="text-muted">{bill.date}</td>
                      <td className="amount" style={{ fontWeight: 650 }}>₹{money(Number(bill.total) || 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="rec-list hide-desktop">
            {logs.map(log => {
              const bill = billOf(log);
              return (
                <article className="rec" key={log.id}>
                  <div className="rec-top">
                    <span className="rec-title">{bill.customerName || 'Walk-in customer'}</span>
                    <span style={{ fontWeight: 650 }}>₹{money(Number(bill.total) || 0)}</span>
                  </div>
                  <div className="rec-meta">
                    <span>{log.user?.name}</span><span>{when(log.createdAt)}</span><span>{bill.items?.length ?? 0} items</span>
                    {bill.date && <span>Bill dated {bill.date}</span>}
                  </div>
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
