import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { expensesApi, banksApi, expenseCategoriesApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { money } from '../../components/sales/SalesLedger';
import { BankAccount, Shop } from '../../types';

const SHOP_LABEL: Record<Shop, string> = { SHOP_COMPUTER: 'Computer', SHOP_XEROX: 'Xerox' };

export default function NewExpense() {
  const { hasPermission, user, activeShop } = useAuth();
  const canManage = hasPermission('allRecords', 'write');
  const navigate = useNavigate();
  const shops = (user?.shopAccess ?? ['SHOP_COMPUTER']) as Shop[];
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [customCat, setCustomCat] = useState('');
  const [note, setNote] = useState('');
  const [bankId, setBankId] = useState('');
  const [shop, setShop] = useState<Shop>((activeShop as Shop) || shops[0]);
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (canManage) banksApi.list().then(r => setBanks(r.data.data ?? []));
    expenseCategoriesApi.list().then(r => setCategories(r.data.data ?? []));
  }, [canManage]);

  const finalCategory = category === '__custom__' ? customCat : category;
  const selectedBank = banks.find(b => b.id === bankId);
  const amt = parseFloat(amount);
  const overdraw = !!selectedBank && amt > Number(selectedBank.balance);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amt || amt <= 0) { setError('Enter the amount that was paid.'); return; }
    if (!finalCategory.trim()) { setError('Choose what the money was for.'); return; }
    if (canManage && !bankId) { setError('Choose the account the money came out of.'); return; }
    setError(''); setSubmitting(true);
    try {
      await expensesApi.create({
        amount: amt,
        category: finalCategory,
        note: note || undefined,
        bankId: canManage ? bankId : undefined,
        shop,
      });
      setSuccess(canManage
        ? `Saved. ₹${money(amt)} taken from ${selectedBank?.name}.`
        : 'Saved. It will count once an admin approves it.');
      setAmount(''); setCategory(''); setCustomCat(''); setNote(''); setBankId('');
      setTimeout(() => navigate('/expenses'), 1600);
    } catch (err: any) {
      setError(err.response?.data?.error || 'The expense was not saved. Try again.');
    } finally { setSubmitting(false); }
  };

  return (
    <Layout title="Add an expense">
      <div className="form-page">
        <Link to="/expenses" className="btn-link text-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 10 }}>
          <ArrowLeft size={15} /> My expenses
        </Link>
        <div className="page-header">
          <div>
            <div className="page-header-title">Add an expense</div>
            <div className="page-header-sub">
              {canManage ? 'Money you paid out of the shop. It is taken from the account you choose.' : 'Money you paid out of the shop. An admin approves it before it counts.'}
            </div>
          </div>
        </div>

        <div aria-live="polite">
          {error && <div className="alert alert-error mb-16" role="alert">{error}</div>}
          {success && <div className="alert alert-success mb-16">{success}</div>}
        </div>

        <form className="card" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="exp-amount">Amount (₹)</label>
            <input id="exp-amount" className="form-input" type="number" inputMode="decimal" min="0.01" step="0.01"
              value={amount} onChange={e => setAmount(e.target.value)} autoFocus
              style={{ minHeight: 52, fontSize: 'var(--fs-xl)', fontWeight: 650 }} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="exp-cat">What was it for?</label>
            <select id="exp-cat" className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">Choose a category</option>
              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              <option value="__custom__">Something else</option>
            </select>
          </div>
          {category === '__custom__' && (
            <div className="form-group">
              <label className="form-label" htmlFor="exp-custom">Category name</label>
              <input id="exp-custom" className="form-input" type="text" value={customCat} onChange={e => setCustomCat(e.target.value)} />
            </div>
          )}
          {shops.length > 1 && (
            <div className="form-group">
              <span className="form-label" id="exp-shop">Shop</span>
              <div className="seg" role="group" aria-labelledby="exp-shop" style={{ width: '100%' }}>
                {shops.map(s => (
                  <button key={s} type="button" style={{ flex: 1 }} aria-pressed={shop === s} onClick={() => setShop(s)}>{SHOP_LABEL[s]}</button>
                ))}
              </div>
            </div>
          )}
          {canManage && (
            <div className="form-group">
              <label className="form-label" htmlFor="exp-bank">Paid from</label>
              <select id="exp-bank" className="form-select" value={bankId} onChange={e => setBankId(e.target.value)}>
                <option value="">Choose an account</option>
                {banks.map(b => <option key={b.id} value={b.id}>{b.name}, ₹{money(Number(b.balance))}</option>)}
              </select>
              {overdraw && <div className="form-error">{selectedBank!.name} has only ₹{money(Number(selectedBank!.balance))}. Choose another account.</div>}
            </div>
          )}
          <div className="form-group">
            <label className="form-label" htmlFor="exp-note">Note (optional)</label>
            <input id="exp-note" className="form-input" type="text" placeholder="Shop, bill number, who was paid" value={note} onChange={e => setNote(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={submitting || overdraw} style={{ marginTop: 6 }}>
            {submitting ? <><span className="spinner" /> Saving</> : `Save expense${amt > 0 ? `, ₹${money(amt)}` : ''}`}
          </button>
        </form>
      </div>
    </Layout>
  );
}
