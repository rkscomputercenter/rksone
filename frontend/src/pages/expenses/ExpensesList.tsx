import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import { expensesApi, banksApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import type { Expense, BankAccount } from '../../types';

const statusBadge = (s: string) => {
  if (s === 'APPROVED') return <span className="badge badge-green">Approved</span>;
  if (s === 'REJECTED') return <span className="badge badge-red">Rejected</span>;
  return <span className="badge badge-yellow">Pending</span>;
};

function isToday(dateStr: string) {
  return dateStr.startsWith(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
}



export default function ExpensesList() {
  const { hasPermission, user } = useAuth();
  const canManage = hasPermission('allRecords');
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
  const [shop, setShop] = useState('');
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    const promises: Promise<any>[] = [expensesApi.list({ date, userId: user?.id, ...(shop && { shop }) })];
    // Only users with permission can access the banks API
    if (canManage) promises.push(banksApi.list());

    Promise.all(promises).then(([expRes, bankRes]) => {
      setExpenses(expRes.data.data ?? []);
      if (bankRes) setBanks(bankRes.data.data ?? []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [date, shop]);



  const handleDelete = async (id: string) => {
    if (!confirm('Delete this expense?')) return;
    try { await expensesApi.delete(id); load(); }
    catch (err: any) { setError(err.response?.data?.error || 'Delete failed'); }
  };

  const total = expenses.filter(e => e.status === 'APPROVED').reduce((s, e) => s + Number(e.amount), 0);
  const pending = expenses.filter(e => e.status === 'PENDING');
  const totalBankBalance = banks.reduce((s, b) => s + Number(b.balance), 0);

  return (
    <Layout title="Expenses">
      <div className="page-header">
        <div>
          <div className="page-header-title">Expenses</div>
          <div className="page-header-sub">Daily expense tracking</div>
        </div>
        <div className="page-actions" style={{ display: 'flex', gap: 12 }}>
          {canManage && (
            <select className="form-select" value={shop} onChange={e => setShop(e.target.value)}>
              <option value="">All Shops</option>
              <option value="SHOP_COMPUTER">Computer Only</option>
              <option value="SHOP_XEROX">Xerox Only</option>
            </select>
          )}
          {canManage ? (
            <input type="date" className="form-input" style={{ width: 160 }} value={date} onChange={e => setDate(e.target.value)} max={new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })} />
          ) : (
            <div className="badge badge-blue" style={{ padding: '8px 12px' }}>Today: {date}</div>
          )}
          <button className="btn btn-primary" onClick={() => navigate('/expenses/new')}>+ Add Expense</button>
        </div>
      </div>

      {error && <div className="alert alert-error mb-16">{error}</div>}

      <div className="card" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{expenses.length} records — {pending.length} pending</span>

        {/* Bank balance summary — authorized only, Cash balance hidden */}
        {canManage && banks.length > 0 && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {banks.map(b => (
              <div key={b.id} style={{ background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border-color)', textAlign: 'center', minWidth: 100 }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>{b.name}</div>
                {b.isCash ? (
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-muted)' }}>Cash</div>
                ) : (
                  <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--color-accent)' }}>₹{Number(b.balance).toLocaleString('en-IN')}</div>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ textAlign: 'right', paddingLeft: 16, borderLeft: '1px solid var(--border-color)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase' }}>Approved Total</div>
          <div style={{ fontWeight: 800, fontSize: 20, color: 'var(--red)' }}>₹{total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
        </div>
      </div>

      {loading ? <div className="page-loading"><div className="spinner spinner-lg" /></div> : expenses.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">💸</div><div className="empty-state-title">No expenses for this date</div></div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead><tr>
              <th>Category</th><th>Shop</th><th>Amount</th><th>Note</th><th>By</th><th>Bank</th><th>Status</th><th>Time</th>
              {canManage && <th>Actions</th>}
            </tr></thead>
            <tbody>
              {expenses.map(e => (
                <tr key={e.id}>
                  <td style={{ fontWeight: 600 }}>{e.category}</td>
                  <td>
                    <span className="badge" style={{ background: e.shop === 'SHOP_XEROX' ? '#fde68a' : '#bfdbfe', color: '#1f2937' }}>
                      {e.shop?.replace('SHOP_', '') || 'COMPUTER'}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--red)' }}>₹{Number(e.amount).toFixed(2)}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{e.note || '—'}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{e.user.name}</td>
                  <td style={{ fontSize: 12 }}>{e.bank?.name || <span className="text-muted">—</span>}</td>
                  <td>{statusBadge(e.status)}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {new Date(e.createdAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  {canManage && (
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {isToday(e.createdAt) && <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(e.id)}>🗑</button>}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
