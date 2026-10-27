import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Wallet } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { expensesApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { istDate, money } from '../../components/sales/SalesLedger';
import type { Expense } from '../../types';
import { PageLoading } from '../../components/ui/Loading';

const SHOP_LABEL: Record<string, string> = { SHOP_COMPUTER: 'Computer', SHOP_XEROX: 'Xerox' };

export const statusBadge = (s: string) => {
  if (s === 'APPROVED') return <span className="badge badge-green">Approved</span>;
  if (s === 'REJECTED') return <span className="badge badge-red">Rejected</span>;
  return <span className="badge badge-yellow">Waiting</span>;
};

const time = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });

export default function ExpensesList() {
  const { hasPermission, user, isSuperAdmin } = useAuth();
  const canManage = hasPermission('allRecords');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(istDate());
  const [shop, setShop] = useState('');
  const [error, setError] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const multiShop = (user?.shopAccess?.length ?? 0) > 1;

  const load = () => {
    setLoading(true);
    expensesApi.list({ date, userId: user?.id, ...(shop && { shop }) })
      .then(r => setExpenses(r.data.data ?? []))
      .catch(() => setError('The list didn’t load. Check the connection and try again.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [date, shop]);

  // Only super admins can delete expenses (the server refuses everyone else).
  // Deleting an approved expense puts the money back into its bank.
  const handleDelete = async (id: string) => {
    try { setError(''); await expensesApi.delete(id); setConfirmId(null); load(); }
    catch (err: any) { setError(err.response?.data?.error || 'The expense was not deleted. Try again.'); }
  };

  const approvedTotal = expenses.filter(e => e.status === 'APPROVED').reduce((s, e) => s + Number(e.amount), 0);
  const waiting = expenses.filter(e => e.status === 'PENDING').length;

  const deleteControl = (e: Expense) => confirmId === e.id ? (
    <span className="flex gap-8" style={{ justifyContent: 'flex-end' }}>
      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(e.id)}>Delete{e.status === 'APPROVED' ? ' and refund' : ''}</button>
      <button className="btn btn-ghost btn-sm" onClick={() => setConfirmId(null)}>Keep</button>
    </span>
  ) : <button className="btn btn-ghost btn-sm" onClick={() => setConfirmId(e.id)}>Delete</button>;

  return (
    <Layout title="My expenses">
      <div className="page-header">
        <div>
          <div className="page-header-title">My expenses</div>
          <div className="page-header-sub">
            {canManage ? 'Your expenses are approved as you add them.' : 'An admin approves each expense before it counts.'}
          </div>
        </div>
        <Link to="/expenses/new" className="btn btn-primary"><Plus size={17} /> Add an expense</Link>
      </div>

      <div className="toolbar">
        {multiShop && canManage && (
          <div className="seg" role="group" aria-label="Shop">
            {[['', 'Both shops'], ['SHOP_COMPUTER', 'Computer'], ['SHOP_XEROX', 'Xerox']].map(([value, label]) => (
              <button key={value} type="button" aria-pressed={shop === value} onClick={() => setShop(value)}>{label}</button>
            ))}
          </div>
        )}
        <div style={{ marginLeft: 'auto' }}>
          {canManage
            ? <input type="date" aria-label="Date" className="form-input" style={{ width: 170 }} value={date} max={istDate()} onChange={e => setDate(e.target.value || istDate())} />
            : <span className="shop-tag">Today</span>}
        </div>
      </div>

      <div className="sumline">
        <span>{expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'}{waiting ? `, ${waiting} waiting for approval` : ''}</span>
        <span className="sumline-total" style={{ color: 'var(--stamp)' }}>₹{money(approvedTotal)}</span>
      </div>

      {error && <div className="alert alert-error mb-16" role="alert">{error}</div>}

      {loading ? <PageLoading /> : expenses.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon"><Wallet size={28} /></div>
          <div className="empty-state-title">No expenses on this day</div>
          <div className="empty-state-sub"><Link to="/expenses/new" className="btn-link">Add an expense</Link> when money goes out of the shop.</div>
        </div>
      ) : (
        <>
          <div className="table-wrapper hide-mobile">
            <table>
              <thead><tr>
                <th>Time</th><th>Category</th><th>Note</th>{multiShop && <th>Shop</th>}<th>Paid from</th><th>Status</th>
                <th className="amount">Amount</th>{isSuperAdmin && <th className="amount"><span className="sr-only">Actions</span></th>}
              </tr></thead>
              <tbody>
                {expenses.map(e => (
                  <tr key={e.id}>
                    <td className="text-muted">{time(e.createdAt)}</td>
                    <td style={{ fontWeight: 600 }}>{e.category}</td>
                    <td className="text-muted">{e.note || ''}</td>
                    {multiShop && <td>{SHOP_LABEL[e.shop ?? 'SHOP_COMPUTER']}</td>}
                    <td>{e.bank?.name || <span className="text-muted">Not yet</span>}</td>
                    <td>{statusBadge(e.status)}</td>
                    <td className="amount" style={{ fontWeight: 650, color: 'var(--stamp)' }}>₹{money(Number(e.amount))}</td>
                    {isSuperAdmin && <td className="amount">{deleteControl(e)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card hide-desktop" style={{ padding: '4px 14px' }}>
            <div className="ledger">
              {expenses.map(e => (
                <div key={e.id} className="ledger-row">
                  <div className="ledger-main">{e.category}</div>
                  <div className="ledger-amt amt-out">₹{money(Number(e.amount))}</div>
                  <div className="ledger-meta">
                    <span>{time(e.createdAt)}</span>
                    {statusBadge(e.status)}
                    {e.bank?.name && <span>{e.bank.name}</span>}
                  </div>
                  {e.note && <div className="text-xs text-muted" style={{ gridColumn: '1 / -1' }}>{e.note}</div>}
                  {isSuperAdmin && <div style={{ gridColumn: '1 / -1', paddingTop: 4 }}>{deleteControl(e)}</div>}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
