import React, { useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import { systemApi } from '../../api';

interface AutoTx {
  id: string;
  type: string;
  amount: number;
  date: string;
  bankName: string;
  createdAt: string;
}

export default function AutomaticTransactionsPage() {
  const [transactions, setTransactions] = useState<AutoTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await systemApi.getAutoTransactions({ page, limit: 20 });
      if (res.data.success) {
        setTransactions(res.data.data || []);
        // The API returns meta.totalPages but the ApiResponse interface might not have it strictly defined.
        // We can cast it to any.
        setTotalPages((res.data.meta as any)?.totalPages || 1);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch automatic transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [page]);

  const handleTrigger = async () => {
    if (!window.confirm('Are you sure you want to run the end-of-day bank reconciliations now?')) return;
    
    try {
      setLoading(true);
      const res = await systemApi.triggerReconciliation();
      if (res.data.success) {
        alert('Reconciliations completed successfully!');
        setPage(1);
        fetchTransactions();
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to trigger reconciliation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Automatic Transactions">
      <div className="page-header">
        <div>
          <div className="page-header-title">Automatic Transactions</div>
          <div className="page-header-sub">System generated end-of-day bank reconciliations</div>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={handleTrigger} disabled={loading}>
            <span className="icon">⚡</span> Run Reconciliations Now
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error mb-16">{error}</div>}

      <div className="card">
        {loading ? (
          <div className="page-loading"><div className="spinner spinner-lg" /></div>
        ) : transactions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">⚙️</div>
            <div className="empty-state-title">No automatic transactions yet</div>
            <div className="empty-state-sub">Cron jobs run at 8:00 PM and 11:59 PM daily.</div>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Bank Account</th>
                    <th>Processed At</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(tx => (
                    <tr key={tx.id}>
                      <td style={{ fontWeight: 600 }}>{new Date(tx.date).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
                      <td>
                        {tx.type === 'CASH_RECONCILIATION' ? (
                          <span className="badge badge-purple">CASH RECONCILIATION</span>
                        ) : (
                          <span className="badge badge-blue">ONLINE RECONCILIATION</span>
                        )}
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--green)' }}>₹{Number(tx.amount).toFixed(2)}</td>
                      <td style={{ fontWeight: 600 }}>{tx.bankName}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                        {new Date(tx.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {totalPages > 1 && (
              <div className="pagination" style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</button>
                <span style={{ padding: '4px 12px', background: 'var(--bg-secondary)', borderRadius: 6 }}>Page {page} of {totalPages}</span>
                <button className="btn btn-ghost btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
