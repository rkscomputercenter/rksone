import React, { useEffect, useMemo, useState } from 'react';
import { Search, ListOrdered } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import SalesLedger, { CAT_LABEL, isTodayIST, istDate, money } from '../../components/sales/SalesLedger';
import { transactionsApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import type { Transaction } from '../../types';
import { PageLoading } from '../../components/ui/Loading';

export default function AdminTransactions() {
  const { isSuperAdmin, user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(istDate());
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    transactionsApi.list({ date, limit: 200 })
      .then(r => setTransactions(r.data.data ?? []))
      .catch(() => setError('The list didn’t load. Check the connection and try again.'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [date]);

  const handleDelete = async (id: string) => {
    try { setError(''); await transactionsApi.delete(id); load(); }
    catch (err: any) { setError(err.response?.data?.error || 'The sale was not deleted. Try again.'); }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter(t =>
      (!q || t.service.name.toLowerCase().includes(q) || t.user.name.toLowerCase().includes(q) || (t.notes ?? '').toLowerCase().includes(q)) &&
      (!categoryFilter || t.service.category === categoryFilter));
  }, [transactions, search, categoryFilter]);

  const filteredTotal = filtered.reduce((s, t) => s + Number(t.totalPrice), 0);

  return (
    <Layout title="All sales">
      <div className="page-header">
        <div>
          <div className="page-header-title">All sales</div>
          <div className="page-header-sub">Sales by every staff member. Super admins can delete older sales.</div>
        </div>
        <input type="date" aria-label="Date" className="form-input" style={{ width: 170 }} value={date} max={istDate()} onChange={e => setDate(e.target.value || istDate())} />
      </div>

      <div className="toolbar">
        <div className="search-box" style={{ flex: 1, minWidth: 220 }}>
          <span className="search-icon"><Search size={16} /></span>
          <input className="form-input search-input" placeholder="Search by service, staff or note" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="seg" role="group" aria-label="Category">
          {['', 'GOVT', 'PRINTING', 'CARDS', 'OTHER'].map(c => (
            <button key={c} type="button" aria-pressed={categoryFilter === c} onClick={() => setCategoryFilter(c)}>{c ? CAT_LABEL[c] : 'All'}</button>
          ))}
        </div>
      </div>

      <div className="sumline">
        <span>{filtered.length} of {transactions.length} sales</span>
        <span className="sumline-total">₹{money(filteredTotal)}</span>
      </div>

      {error && <div className="alert alert-error mb-16" role="alert">{error}</div>}

      {loading ? <PageLoading /> : filtered.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon"><ListOrdered size={28} /></div>
          <div className="empty-state-title">{transactions.length ? 'Nothing matches these filters' : 'No sales on this day'}</div>
        </div>
      ) : (
        <SalesLedger
          transactions={filtered}
          showShop={(user?.shopAccess?.length ?? 0) > 1}
          canDelete={t => isSuperAdmin || isTodayIST(t.createdAt)}
          onDelete={handleDelete}
        />
      )}
    </Layout>
  );
}
