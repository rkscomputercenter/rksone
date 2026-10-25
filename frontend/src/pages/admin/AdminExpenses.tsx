import React, { useEffect, useState } from 'react';
import { ClipboardList, Check } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { expensesApi, banksApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { istDate, money } from '../../components/sales/SalesLedger';
import { statusBadge } from '../expenses/ExpensesList';
import type { BankAccount, Expense } from '../../types';

const time = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });

function EditModal({ expense, onClose, onSaved }: { expense: Expense; onClose: () => void; onSaved: () => void }) {
  const [amount, setAmount] = useState(String(expense.amount));
  const [category, setCategory] = useState(expense.category);
  const [note, setNote] = useState(expense.note || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await expensesApi.update(expense.id, { updatedAt: expense.updatedAt, amount: parseFloat(amount), category, note });
      onSaved();
    } catch (err: any) {
      setError(err.response?.data?.error || 'The change was not saved. Try again.');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal" role="dialog" aria-modal="true" aria-labelledby="edit-title" onClick={e => e.stopPropagation()} onSubmit={submit}>
        <div className="modal-header"><h2 id="edit-title" className="modal-title">Edit expense</h2></div>
        <div className="modal-body">
          {expense.status === 'APPROVED' && <div className="alert alert-info">Changing the amount moves only the difference in {expense.bank?.name ?? 'its account'}.</div>}
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          <div className="form-group">
            <label className="form-label" htmlFor="edit-amount">Amount (₹)</label>
            <input id="edit-amount" className="form-input" type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="edit-cat">Category</label>
            <input id="edit-cat" className="form-input" value={category} onChange={e => setCategory(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="edit-note">Note</label>
            <input id="edit-note" className="form-input" value={note} onChange={e => setNote(e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving' : 'Save changes'}</button>
        </div>
      </form>
    </div>
  );
}

/** One waiting expense: choose the account it was paid from, then approve, or reject. */
function ReviewRow({ expense, banks, onDone, onError }: {
  expense: Expense; banks: BankAccount[]; onDone: () => void; onError: (m: string) => void;
}) {
  const [bankId, setBankId] = useState('');
  const [busy, setBusy] = useState<'' | 'APPROVED' | 'REJECTED'>('');
  const bank = banks.find(b => b.id === bankId);
  const short = !!bank && !bank.isCash && Number(bank.balance) < Number(expense.amount);

  const act = async (status: 'APPROVED' | 'REJECTED') => {
    setBusy(status);
    try { await expensesApi.approve(expense.id, status, status === 'APPROVED' ? bankId : undefined); onDone(); }
    catch (err: any) { onError(err.response?.data?.error || 'That didn’t go through. Refresh and try again.'); }
    finally { setBusy(''); }
  };

  return (
    <div className="review-row">
      <div className="review-what">
        <div className="flex-between" style={{ alignItems: 'baseline' }}>
          <span style={{ fontWeight: 650 }}>{expense.category}</span>
          <span className="money" style={{ fontWeight: 650, fontSize: 'var(--fs-lg)', color: 'var(--stamp)' }}>₹{money(Number(expense.amount))}</span>
        </div>
        <div className="text-sm text-muted">{expense.user.name}, {time(expense.createdAt)}{expense.note ? `. ${expense.note}` : ''}</div>
      </div>
      <div className="review-how">
        <select aria-label="Paid from" className="form-select" value={bankId} onChange={e => setBankId(e.target.value)}>
          <option value="">Paid from…</option>
          {banks.map(b => <option key={b.id} value={b.id}>{b.name}{b.isCash ? '' : `, ₹${money(Number(b.balance))}`}</option>)}
        </select>
        <button className="btn btn-success" disabled={!bankId || short || !!busy} onClick={() => act('APPROVED')}>
          <Check size={16} /> {busy === 'APPROVED' ? 'Approving' : 'Approve'}
        </button>
        <button className="btn btn-ghost" disabled={!!busy} onClick={() => act('REJECTED')}>{busy === 'REJECTED' ? 'Rejecting' : 'Reject'}</button>
      </div>
      {short && <div className="form-error" style={{ gridColumn: '1 / -1' }}>{bank!.name} has only ₹{money(Number(bank!.balance))}.</div>}
    </div>
  );
}

export default function AdminExpenses() {
  const { isSuperAdmin } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(istDate());
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Expense | null>(null);
  const [confirm, setConfirm] = useState<{ id: string; kind: 'delete' | 'reject' } | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([expensesApi.list({ date }), banksApi.list()])
      .then(([expRes, bankRes]) => {
        setExpenses(expRes.data.data ?? []);
        setBanks(bankRes.data.data ?? []);
      })
      .catch(() => setError('The expenses didn’t load. Check the connection and try again.'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [date]);

  const runConfirmed = async (e: Expense) => {
    if (!confirm) return;
    try {
      setError('');
      if (confirm.kind === 'delete') await expensesApi.delete(e.id);
      else await expensesApi.approve(e.id, 'REJECTED');
      setConfirm(null); load();
    } catch (err: any) { setError(err.response?.data?.error || 'That didn’t go through. Try again.'); }
  };

  const waiting = expenses.filter(e => e.status === 'PENDING');
  const reviewed = expenses.filter(e => e.status !== 'PENDING' && (!statusFilter || e.status === statusFilter));
  const approvedTotal = expenses.filter(e => e.status === 'APPROVED').reduce((s, e) => s + Number(e.amount), 0);

  const rowActions = (e: Expense) => {
    if (confirm?.id === e.id) {
      const refund = e.status === 'APPROVED' && e.bank ? ` and refund ${e.bank.name}` : '';
      return (
        <span className="flex gap-8" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-danger btn-sm" onClick={() => runConfirmed(e)}>{confirm.kind === 'delete' ? 'Delete' : 'Reject'}{refund}</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setConfirm(null)}>Keep</button>
        </span>
      );
    }
    return (
      <span className="flex gap-8" style={{ justifyContent: 'flex-end' }}>
        {e.status === 'APPROVED' && <button className="btn btn-ghost btn-sm" onClick={() => setConfirm({ id: e.id, kind: 'reject' })}>Reject</button>}
        {isSuperAdmin && <button className="btn btn-ghost btn-sm" onClick={() => setEditing(e)}>Edit</button>}
        {isSuperAdmin && <button className="btn btn-ghost btn-sm" onClick={() => setConfirm({ id: e.id, kind: 'delete' })}>Delete</button>}
      </span>
    );
  };

  return (
    <Layout title="All expenses">
      {editing && <EditModal expense={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}

      <div className="page-header">
        <div>
          <div className="page-header-title">All expenses</div>
          <div className="page-header-sub">Approve what staff spent, and choose the account it was paid from.</div>
        </div>
        <input type="date" aria-label="Date" className="form-input" style={{ width: 170 }} value={date} max={istDate()} onChange={e => setDate(e.target.value || istDate())} />
      </div>

      {error && <div className="alert alert-error mb-16" role="alert">{error}</div>}

      {loading ? <div className="page-loading"><div className="spinner spinner-lg" /></div> : (
        <>
          <section className="mb-24" aria-labelledby="waiting-title">
            <h2 id="waiting-title" className="section-title">
              Waiting for approval {waiting.length > 0 && <span className="badge badge-yellow" style={{ marginLeft: 6, verticalAlign: 'middle' }}>{waiting.length}</span>}
            </h2>
            {waiting.length === 0 ? (
              <div className="card text-muted" style={{ padding: 16 }}>Nothing to review for this day.</div>
            ) : (
              <div className="card" style={{ padding: 0 }}>
                {waiting.map(e => (
                  <ReviewRow key={e.id} expense={e} banks={banks} onDone={load} onError={setError} />
                ))}
              </div>
            )}
          </section>

          <section aria-labelledby="reviewed-title">
            <div className="flex-between mb-12" style={{ flexWrap: 'wrap' }}>
              <h2 id="reviewed-title" className="section-title" style={{ margin: 0 }}>Reviewed</h2>
              <div className="seg" role="group" aria-label="Status">
                {[['', 'All'], ['APPROVED', 'Approved'], ['REJECTED', 'Rejected']].map(([v, l]) => (
                  <button key={v} type="button" aria-pressed={statusFilter === v} onClick={() => setStatusFilter(v)}>{l}</button>
                ))}
              </div>
            </div>
            <div className="sumline">
              <span>{reviewed.length} {reviewed.length === 1 ? 'expense' : 'expenses'}</span>
              <span className="sumline-total" style={{ color: 'var(--stamp)' }}>₹{money(approvedTotal)} approved</span>
            </div>
            {reviewed.length === 0 ? (
              <div className="card empty-state"><div className="empty-state-icon"><ClipboardList size={28} /></div><div className="empty-state-title">No reviewed expenses on this day</div></div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Time</th><th>Category</th><th>Note</th><th>Spent by</th><th>Paid from</th><th>Status</th><th className="amount">Amount</th><th className="amount"><span className="sr-only">Actions</span></th></tr></thead>
                  <tbody>
                    {reviewed.map(e => (
                      <tr key={e.id}>
                        <td className="text-muted">{time(e.createdAt)}</td>
                        <td style={{ fontWeight: 600 }}>{e.category}</td>
                        <td className="text-muted">{e.note || ''}</td>
                        <td>{e.user.name}</td>
                        <td>{e.bank?.name || <span className="text-muted">None</span>}</td>
                        <td>{statusBadge(e.status)}</td>
                        <td className="amount" style={{ fontWeight: 650, color: e.status === 'APPROVED' ? 'var(--stamp)' : 'var(--graphite-3)' }}>₹{money(Number(e.amount))}</td>
                        <td className="amount">{rowActions(e)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      <style>{`
        .review-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px 20px; align-items: center; padding: 14px 18px; border-bottom: 1px solid var(--rule-soft); }
        .review-row:last-child { border-bottom: none; }
        .review-how { display: flex; gap: 8px; align-items: center; }
        .review-how .form-select { width: 230px; }
        @media (max-width: 860px) {
          .review-row { grid-template-columns: 1fr; }
          .review-how { flex-wrap: wrap; }
          .review-how .form-select { width: 100%; }
          .review-how .btn { flex: 1; }
        }
      `}</style>
    </Layout>
  );
}
