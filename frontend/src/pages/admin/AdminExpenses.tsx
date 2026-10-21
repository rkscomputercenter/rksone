import React, { useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import { expensesApi, banksApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import type { Expense } from '../../types';

const statusBadge = (s: string) => {
  if (s === 'APPROVED') return <span className="badge badge-green">Approved</span>;
  if (s === 'REJECTED') return <span className="badge badge-red">Rejected</span>;
  return <span className="badge badge-yellow">Pending</span>;
};

interface EditModalProps {
  expense: Expense;
  onClose: () => void;
  onSave: () => void;
}

function ExpenseEditModal({ expense, onClose, onSave }: EditModalProps) {
  const [amount, setAmount] = useState(expense.amount.toString());
  const [category, setCategory] = useState(expense.category);
  const [note, setNote] = useState(expense.note || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await expensesApi.update(expense.id, {
        updatedAt: expense.updatedAt,
        amount: parseFloat(amount),
        category,
        note
      });
      onSave();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Edit Expense</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error mb-16">{error}</div>}
            <div className="form-group">
              <label className="form-label">Amount (₹)</label>
              <input className="form-input" type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <input className="form-input" value={category} onChange={e => setCategory(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Note</label>
              <input className="form-input" value={note} onChange={e => setNote(e.target.value)} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface ApproveModalProps {
  expense: Expense;
  onClose: () => void;
  onConfirm: (bankId: string) => void;
}

function ApproveModal({ expense, onClose, onConfirm }: ApproveModalProps) {
  const [banks, setBanks] = useState<any[]>([]);
  const [bankId, setBankId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    banksApi.list().then(r => {
      setBanks(r.data.data ?? []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Approve Expense</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="mb-16">
            <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>Amount</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--red)' }}>₹{Number(expense.amount).toFixed(2)}</div>
            <div style={{ fontSize: 14, marginTop: 8 }}>{expense.category} — {expense.note || 'No note'}</div>
          </div>
          <div className="form-group">
            <label className="form-label">Deduct from Bank</label>
            {loading ? <div className="spinner spinner-sm" /> : (
              <select className="form-select" value={bankId} onChange={e => setBankId(e.target.value)}>
                <option value="">Select bank...</option>
                {banks.map(b => (
                  <option key={b.id} value={b.id}>{b.name} (₹{Number(b.balance).toLocaleString('en-IN')})</option>
                ))}
              </select>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!bankId} onClick={() => onConfirm(bankId)}>Confirm Approval</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminExpenses() {
  const { isSuperAdmin } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [approveExpense, setApproveExpense] = useState<Expense | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      expensesApi.list({ date, ...(statusFilter && { status: statusFilter }) }),
      banksApi.list()
    ]).then(([expRes, bankRes]) => {
      setExpenses(expRes.data.data ?? []);
      setBanks(bankRes.data.data ?? []);
    }).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [date, statusFilter]);

  const handleApprove = async (id: string, status: 'APPROVED' | 'REJECTED', bankId?: string) => {
    try { 
      await expensesApi.approve(id, status, bankId); 
      setApproveExpense(null);
      load(); 
    }
    catch (err: any) { setError(err.response?.data?.error || 'Action failed'); }
  };

  const handleDelete = async (expense: Expense) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    try {
      await expensesApi.delete(expense.id);
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Delete failed');
    }
  };

  const approvedTotal = expenses.filter(e => e.status === 'APPROVED').reduce((s, e) => s + Number(e.amount), 0);
  const pending = expenses.filter(e => e.status === 'PENDING');
  const totalBankBalance = banks.reduce((s, b) => s + Number(b.balance), 0);

  return (
    <Layout title="All Expenses">
      {editExpense && (
        <ExpenseEditModal 
          expense={editExpense} 
          onClose={() => setEditExpense(null)} 
          onSave={() => { setEditExpense(null); load(); }} 
        />
      )}
      {approveExpense && (
        <ApproveModal
          expense={approveExpense}
          onClose={() => setApproveExpense(null)}
          onConfirm={(bankId) => handleApprove(approveExpense.id, 'APPROVED', bankId)}
        />
      )}
      <div className="page-header">
        <div className="page-header-title">All Expenses</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <select className="form-select" style={{ width: 140 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <input type="date" className="form-input" style={{ width: 160 }} value={date} onChange={e => setDate(e.target.value)} max={new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })} />
        </div>
      </div>

      {error && <div className="alert alert-error mb-16">{error}</div>}
      {pending.length > 0 && <div className="alert alert-warning mb-16">⚠️ {pending.length} expense(s) need approval</div>}

      <div className="card" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{expenses.length} expenses — {pending.length} pending</span>
        
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {banks.map(b => (
            <div key={b.id} style={{ background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border-color)', textAlign: 'center', minWidth: 100 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>{b.name}</div>
              <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--color-accent)' }}>₹{Number(b.balance).toLocaleString('en-IN')}</div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'right', paddingLeft: 16, borderLeft: '1px solid var(--border-color)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase' }}>Approved Total</div>
          <div style={{ fontWeight: 800, fontSize: 20, color: 'var(--red)' }}>₹{approvedTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
        </div>
      </div>

      {loading ? <div className="page-loading"><div className="spinner spinner-lg" /></div> : expenses.length === 0 ? (
        <div className="empty-state"><div className="empty-state-icon">💸</div><div className="empty-state-title">No expenses found</div></div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Category</th><th>Amount</th><th>Note</th><th>By</th><th>Bank</th><th>Status</th><th>Time</th><th>Actions</th></tr></thead>
            <tbody>
              {expenses.map(e => (
                <tr key={e.id}>
                  <td style={{ fontWeight: 600 }}>{e.category}</td>
                  <td style={{ fontWeight: 700, color: 'var(--red)' }}>₹{Number(e.amount).toFixed(2)}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{e.note || '—'}</td>
                  <td>{e.user.name}</td>
                  <td style={{ fontSize: 12 }}>{e.bank?.name || <span className="text-muted">—</span>}</td>
                  <td>{statusBadge(e.status)}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(e.createdAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {e.status === 'PENDING' && (
                        <>
                          <button className="btn btn-success btn-sm" onClick={() => setApproveExpense(e)}>✓ Approve</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleApprove(e.id, 'REJECTED')}>✕</button>
                        </>
                      )}
                      {isSuperAdmin && (
                        <>
                          <button className="btn btn-ghost btn-sm" onClick={() => setEditExpense(e)} title="Edit">✏</button>
                          <button className="btn btn-ghost btn-sm text-red" onClick={() => handleDelete(e)} title="Delete">🗑</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}
