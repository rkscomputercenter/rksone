import React, { useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import { transactionsApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import type { Transaction } from '../../types';

export default function AdminTransactions() {
  const { isSuperAdmin } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    transactionsApi.list({ date, limit: 200 })
      .then(r => {
        const data = r.data.data ?? [];
        setTransactions(data);
      })
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [date]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this transaction?')) return;
    try { await transactionsApi.delete(id); load(); }
    catch (err: any) { setError(err.response?.data?.error || 'Delete failed'); }
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.service.name.toLowerCase().includes(search.toLowerCase()) || 
                          t.user.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter ? t.service.category === categoryFilter : true;
    return matchesSearch && matchesCategory;
  });

  const filteredTotal = filteredTransactions.reduce((s, t) => s + Number(t.totalPrice), 0);

  return (
    <Layout title="All Transactions">
      <div className="page-header">
        <div className="page-header-title">All Transactions</div>
        <input type="date" className="form-input" style={{ width: 160 }} value={date} onChange={e => setDate(e.target.value)} max={new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })} />
      </div>
      {error && <div className="alert alert-error mb-16">{error}</div>}
      
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
          <div className="search-box" style={{ flex: 1, minWidth: 200 }}>
            <span className="search-icon">🔍</span>
            <input className="form-input search-input" placeholder="Search service or operator..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-select" style={{ width: 160 }} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
            <option value="">All Categories</option>
            <option value="GOVT">🏛 Govt</option>
            <option value="PRINTING">🖨 Printing</option>
            <option value="CARDS">🪪 Cards</option>
            <option value="OTHER">🔧 Other</option>
          </select>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{filteredTransactions.length} transactions found</span>
          <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--color-accent)' }}>Filtered Total: ₹{filteredTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
        </div>
      </div>

      {loading ? <div className="page-loading"><div className="spinner spinner-lg" /></div> : filteredTransactions.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">📋</div><div className="empty-state-title">No transactions found</div></div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Service</th><th>Category</th><th>Qty</th><th>Unit</th><th>Total</th><th>Operator</th><th>Time</th><th>Actions</th></tr></thead>
            <tbody>
              {filteredTransactions.map(t => {
                const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
                const editable = t.createdAt.startsWith(todayStr);
                return (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600 }}>{t.service.name}</td>
                    <td><span className="badge badge-purple">{t.service.category}</span></td>
                    <td>{t.quantity}</td>
                    <td>₹{Number(t.unitPrice).toFixed(2)}</td>
                    <td style={{ fontWeight: 700, color: 'var(--green)' }}>₹{Number(t.totalPrice).toFixed(2)}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{t.user.name}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(t.createdAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}</td>
                    <td>{(editable || isSuperAdmin) ? <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t.id)}>Delete</button> : <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Read-only</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
