import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import { expensesApi, banksApi, expenseCategoriesApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { BankAccount, Shop } from '../../types';

export default function NewExpense() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('allRecords', 'write');
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [customCat, setCustomCat] = useState('');
  const [note, setNote] = useState('');
  const [bankId, setBankId] = useState('');
  const [shop, setShop] = useState<Shop>('SHOP_COMPUTER');
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (canManage) {
      banksApi.list().then(r => setBanks(r.data.data ?? []));
    }
    expenseCategoriesApi.list().then(r => setCategories(r.data.data ?? []));
  }, [canManage]);

  const finalCategory = category === '__custom__' ? customCat : category;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError('Enter a valid amount'); return; }
    if (!finalCategory.trim()) { setError('Category is required'); return; }
    if (canManage && !bankId) { setError('Please select a bank account'); return; }
    setError(''); setSubmitting(true);
    try {
      await expensesApi.create({ 
        amount: amt, 
        category: finalCategory,
        note: note || undefined,
        bankId: canManage ? bankId : undefined,
        shop
      });
      setSuccess(canManage ? 'Expense recorded and deducted from bank!' : 'Expense recorded! Pending admin approval.');
      setAmount(''); setCategory(''); setCustomCat(''); setNote(''); setBankId('');
      setTimeout(() => navigate('/expenses'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to record expense');
    } finally { setSubmitting(false); }
  };

  return (
    <Layout title="Add Expense">
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <div className="page-header">
          <div className="page-header-title">Add Expense</div>
          <button className="btn btn-ghost" onClick={() => navigate('/expenses')}>← Back</button>
        </div>

        {error && <div className="alert alert-error mb-16">{error}</div>}
        {success && <div className="alert alert-success mb-16">{success}</div>}

        <div className="card">
          <div className="alert alert-warning" style={{ marginBottom: 16, fontSize: 12 }}>
            ⚠️ Expenses added by operators are marked <strong>PENDING</strong> until approved by an admin.
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Amount (₹)</label>
              <input className="form-input" type="number" min="0.01" step="0.01" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
                <option value="">Select category...</option>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                <option value="__custom__">Other (type below)</option>
              </select>
            </div>
            {category === '__custom__' && (
              <div className="form-group">
                <label className="form-label">Custom Category</label>
                <input className="form-input" type="text" placeholder="Enter category name" value={customCat} onChange={e => setCustomCat(e.target.value)} />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Shop</label>
              <select className="form-select" value={shop} onChange={e => setShop(e.target.value as Shop)}>
                <option value="SHOP_COMPUTER">Shop Computer</option>
                <option value="SHOP_XEROX">Shop Xerox</option>
              </select>
            </div>
            {canManage && (
              <div className="form-group">
                <label className="form-label">Deduct from Bank</label>
                <select className="form-select" value={bankId} onChange={e => setBankId(e.target.value)} required>
                  <option value="">Select bank...</option>
                  {banks.map(b => (
                    <option key={b.id} value={b.id}>{b.name} (₹{Number(b.balance).toLocaleString('en-IN')})</option>
                  ))}
                </select>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Note (optional)</label>
              <input className="form-input" type="text" placeholder="Description or reference..." value={note} onChange={e => setNote(e.target.value)} />
            </div>
            <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={submitting}>
              {submitting ? 'Saving...' : 'Record Expense'}
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
