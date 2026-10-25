import React, { useEffect, useState } from 'react';
import { Banknote, Landmark, Plus } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { banksApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { BankAccount } from '../../types';

type ModalType = 'deposit' | 'adjust' | 'rename' | 'setBalance' | 'hardReset' | 'delete' | 'addBank' | null;

interface ModalState {
  type: ModalType;
  bank?: BankAccount;
}

const inr = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function BankConfig() {
  const { isSuperAdmin } = useAuth();
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [modal, setModal] = useState<ModalState>({ type: null });

  // Form fields
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [newName, setNewName] = useState('');
  const [isCash, setIsCash] = useState(false);

  const load = () => {
    setLoading(true);
    banksApi.list()
      .then(r => setBanks(r.data.data ?? []))
      .catch(() => setError('The accounts didn’t load. Check the connection and try again.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const closeModal = () => {
    setModal({ type: null });
    setAmount(''); setNote(''); setNewName(''); setIsCash(false);
  };

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 4000);
  };

  const open = (type: ModalType, bank?: BankAccount) => {
    setModal({ type, bank });
    setError('');
    if (type === 'rename' && bank) setNewName(bank.name);
    else { setNewName(''); setAmount(''); setNote(''); }
  };

  const handleSubmit = async () => {
    if (!modal.type) return;
    const bank = modal.bank;
    setSubmitting(true);
    setError('');
    try {
      switch (modal.type) {
        case 'addBank': {
          if (!newName.trim()) { setError('Give the account a name.'); setSubmitting(false); return; }
          await banksApi.create({ name: newName.trim(), balance: parseFloat(amount) || 0, isCash });
          showSuccess(`Added ${newName.trim()}.`);
          break;
        }
        case 'rename': {
          if (!bank || !newName.trim()) { setError('Enter the new name.'); setSubmitting(false); return; }
          await banksApi.rename(bank.id, newName.trim());
          showSuccess(`Renamed to ${newName.trim()}.`);
          break;
        }
        case 'deposit': {
          if (!bank) break;
          const val = parseFloat(amount);
          if (!val || val <= 0) { setError('Enter an amount greater than 0.'); setSubmitting(false); return; }
          await banksApi.deposit(bank.id, val, note || undefined);
          showSuccess(`Added ₹${inr(val)} to ${bank.name}.`);
          break;
        }
        case 'adjust': {
          if (!bank) break;
          const val = parseFloat(amount);
          if (!val) { setError('Enter a positive amount to add, or a negative amount to take out.'); setSubmitting(false); return; }
          await banksApi.adjust(bank.id, val, note || undefined);
          showSuccess(`${bank.name} adjusted by ${val >= 0 ? '+' : '−'}₹${inr(Math.abs(val))}.`);
          break;
        }
        case 'setBalance': {
          if (!bank) break;
          const val = parseFloat(amount);
          if (isNaN(val) || val < 0) { setError('Enter a balance of 0 or more.'); setSubmitting(false); return; }
          await banksApi.setBalance(bank.id, val, note || undefined);
          showSuccess(`${bank.name} balance set to ₹${inr(val)}.`);
          break;
        }
        case 'hardReset': {
          if (!bank) break;
          await banksApi.hardReset(bank.id, note || undefined);
          showSuccess(`${bank.name} reset to ₹0.`);
          break;
        }
        case 'delete': {
          if (!bank) break;
          await banksApi.delete(bank.id);
          showSuccess(`${bank.name} deleted.`);
          break;
        }
      }
      closeModal();
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'That didn’t go through. Nothing was changed; try again.');
    } finally { setSubmitting(false); }
  };

  const name = modal.bank?.name ?? '';
  const TITLES: Record<Exclude<ModalType, null>, string> = {
    addBank: 'Add an account',
    rename: `Rename ${name}`,
    deposit: `Add money to ${name}`,
    adjust: `Adjust ${name}`,
    setBalance: `Correct the balance of ${name}`,
    hardReset: `Reset ${name} to ₹0`,
    delete: `Delete ${name}`,
  };
  const BUTTONS: Record<Exclude<ModalType, null>, string> = {
    addBank: 'Add account', rename: 'Rename', deposit: 'Add money', adjust: 'Apply adjustment',
    setBalance: 'Set balance', hardReset: 'Reset to ₹0', delete: 'Delete account',
  };
  const danger = modal.type === 'delete' || modal.type === 'hardReset' || modal.type === 'setBalance';
  const amountLabel = modal.type === 'deposit' ? 'Amount to add (₹)' : modal.type === 'adjust' ? 'Adjustment (₹)' : 'Correct balance (₹)';

  return (
    <Layout title="Bank settings">
      <div className="page-header">
        <div>
          <div className="page-header-title">Bank settings</div>
          <div className="page-header-sub">Add, rename or remove accounts, and correct balances.</div>
        </div>
        {isSuperAdmin && (
          <button className="btn btn-primary" onClick={() => open('addBank')}><Plus size={17} /> Add an account</button>
        )}
      </div>

      {error && !modal.type && <div className="alert alert-error mb-16" role="alert">{error}</div>}
      {success && <div className="alert alert-success mb-16" aria-live="polite">{success}</div>}

      {loading ? (
        <div className="page-loading"><div className="spinner spinner-lg" /></div>
      ) : banks.length === 0 ? (
        <div className="card empty-state"><div className="empty-state-title">No accounts yet</div></div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Account</th><th>Type</th><th className="amount">Balance</th><th className="amount"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {banks.map(bank => (
                <tr key={bank.id}>
                  <td style={{ fontWeight: 600 }}>
                    <span className="flex gap-8" style={{ alignItems: 'center' }}>
                      {bank.isCash ? <Banknote size={16} color="var(--graphite-3)" /> : <Landmark size={16} color="var(--graphite-3)" />}
                      {bank.name}
                    </span>
                  </td>
                  <td className="text-muted">{bank.isCash ? 'Cash, balance hidden' : 'Bank'}</td>
                  <td className="amount" style={{ fontWeight: 600 }}>{bank.isCash ? '' : `₹${inr(Number(bank.balance))}`}</td>
                  <td className="amount">
                    <span className="flex gap-8" style={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => open('deposit', bank)}>Add money</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => open('adjust', bank)}>Adjust</button>
                      {isSuperAdmin && <button className="btn btn-ghost btn-sm" onClick={() => open('rename', bank)}>Rename</button>}
                      {isSuperAdmin && !bank.isCash && <button className="btn btn-ghost btn-sm" onClick={() => open('setBalance', bank)}>Correct balance</button>}
                      {isSuperAdmin && !bank.isCash && <button className="btn btn-ghost btn-sm" onClick={() => open('hardReset', bank)}>Reset</button>}
                      {isSuperAdmin && <button className="btn btn-danger btn-sm" onClick={() => open('delete', bank)}>Delete</button>}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal.type && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="cfg-title" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h2 id="cfg-title" className="modal-title">{TITLES[modal.type]}</h2>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-error" role="alert">{error}</div>}

              {modal.type === 'addBank' && (
                <>
                  <div className="form-group">
                    <label className="form-label" htmlFor="cfg-name">Account name</label>
                    <input id="cfg-name" className="form-input" placeholder="e.g. Axis Bank, petty cash" value={newName} onChange={e => setNewName(e.target.value)} autoFocus />
                  </div>
                  <div className="form-group">
                    <span className="form-label" id="cfg-type">Type</span>
                    <div className="seg seg-lg" role="group" aria-labelledby="cfg-type">
                      <button type="button" aria-pressed={!isCash} onClick={() => setIsCash(false)}>Bank, tracks balance</button>
                      <button type="button" aria-pressed={isCash} onClick={() => setIsCash(true)}>Cash</button>
                    </div>
                  </div>
                  {!isCash && (
                    <div className="form-group">
                      <label className="form-label" htmlFor="cfg-open">Opening balance (₹)</label>
                      <input id="cfg-open" className="form-input" type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
                    </div>
                  )}
                </>
              )}

              {modal.type === 'rename' && (
                <>
                  <div className="alert alert-warning">The end-of-day cash and online totals go to the accounts named CASH-BALANCE and CANARA BANK. Renaming either one stops those totals.</div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="cfg-rename">New name</label>
                    <input id="cfg-rename" className="form-input" value={newName} onChange={e => setNewName(e.target.value)} autoFocus />
                  </div>
                </>
              )}

              {(modal.type === 'deposit' || modal.type === 'adjust' || modal.type === 'setBalance') && (
                <>
                  {modal.type === 'adjust' && <div className="alert alert-info">Enter a positive amount to add, or a negative amount to take out.</div>}
                  {modal.type === 'setBalance' && <div className="alert alert-warning">Replaces the balance with the number you enter. Use only to match the bank statement.</div>}
                  <div className="form-group">
                    <label className="form-label" htmlFor="cfg-amount">{amountLabel}</label>
                    <input id="cfg-amount" className="form-input" type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} autoFocus
                      style={{ minHeight: 50, fontSize: 'var(--fs-xl)', fontWeight: 650 }} />
                    {modal.bank && !modal.bank.isCash && <span className="form-hint">Now ₹{inr(Number(modal.bank.balance))}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="cfg-note">{modal.type === 'deposit' ? 'Note (optional)' : 'Reason'}</label>
                    <input id="cfg-note" className="form-input" value={note} onChange={e => setNote(e.target.value)} />
                  </div>
                </>
              )}

              {modal.type === 'hardReset' && (
                <>
                  <div className="alert alert-error">The balance of {name} becomes ₹0.00. The reset is logged, but it can’t be undone.</div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="cfg-reason">Reason (optional)</label>
                    <input id="cfg-reason" className="form-input" value={note} onChange={e => setNote(e.target.value)} autoFocus />
                  </div>
                </>
              )}

              {modal.type === 'delete' && (
                <div className="alert alert-error">Delete {name}? This is refused while any expense is linked to it.</div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
              <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} disabled={submitting} onClick={handleSubmit}>
                {submitting ? <><span className="spinner" /> Saving</> : BUTTONS[modal.type]}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
