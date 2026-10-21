import React, { useEffect, useState } from 'react';
import Layout from '../../components/layout/Layout';
import { banksApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { BankAccount } from '../../types';

type ModalType = 'deposit' | 'adjust' | 'rename' | 'setBalance' | 'hardReset' | 'delete' | 'addBank' | null;

interface ModalState {
  type: ModalType;
  bank?: BankAccount;
}

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
      .catch(() => setError('Failed to load banks'))
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
          if (!newName.trim()) { setError('Name is required'); setSubmitting(false); return; }
          const bal = parseFloat(amount) || 0;
          await banksApi.create({ name: newName.trim(), balance: bal, isCash });
          showSuccess(`${isCash ? 'Cash account' : 'Bank'} '${newName}' created`);
          break;
        }
        case 'rename': {
          if (!bank || !newName.trim()) { setError('Name is required'); setSubmitting(false); return; }
          await banksApi.rename(bank.id, newName.trim());
          showSuccess(`Renamed to '${newName}'`);
          break;
        }
        case 'deposit': {
          if (!bank) break;
          const val = parseFloat(amount);
          if (!val || val <= 0) { setError('Enter a valid positive amount'); setSubmitting(false); return; }
          await banksApi.deposit(bank.id, val, note || undefined);
          showSuccess(`₹${val.toLocaleString()} deposited to ${bank.name}`);
          break;
        }
        case 'adjust': {
          if (!bank) break;
          const val = parseFloat(amount);
          if (!val || val === 0) { setError('Enter a non-zero amount (use negative to subtract)'); setSubmitting(false); return; }
          await banksApi.adjust(bank.id, val, note || undefined);
          showSuccess(`${bank.name} balance adjusted by ₹${val >= 0 ? '+' : ''}${val}`);
          break;
        }
        case 'setBalance': {
          if (!bank) break;
          const val = parseFloat(amount);
          if (isNaN(val) || val < 0) { setError('Enter a valid non-negative amount'); setSubmitting(false); return; }
          await banksApi.setBalance(bank.id, val, note || undefined);
          showSuccess(`${bank.name} balance set to ₹${val}`);
          break;
        }
        case 'hardReset': {
          if (!bank) break;
          await banksApi.hardReset(bank.id, note || undefined);
          showSuccess(`${bank.name} balance hard reset to ₹0.00`);
          break;
        }
        case 'delete': {
          if (!bank) break;
          await banksApi.delete(bank.id);
          showSuccess(`${bank.name} deleted`);
          break;
        }
      }
      closeModal();
      load();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Operation failed');
    } finally { setSubmitting(false); }
  };


  return (
    <Layout title="Bank Configuration">
      <div className="page-header">
        <div>
          <div className="page-header-title">Bank Configuration</div>
          <div className="page-header-sub">Manage bank accounts, balances, and settings</div>
        </div>
        {isSuperAdmin && (
          <button className="btn btn-primary" onClick={() => open('addBank')}>
            + Add Bank / Cash
          </button>
        )}
      </div>

      {error && !modal.type && <div className="alert alert-error mb-16">{error}</div>}
      {success && <div className="alert alert-success mb-16">✅ {success}</div>}

      {loading ? (
        <div className="page-loading"><div className="spinner spinner-lg" /></div>
      ) : (
        <>
          {/* All Banks + Cash unified */}
          <div className="cfg-section-title">All Accounts</div>
          <div className="cfg-grid">
            {banks.map(bank => (
              <div key={bank.id} className={`cfg-card ${bank.isCash ? 'cash-cfg-card' : ''}`}>
                <div className="cfg-card-top">
                  <div className="cfg-bank-icon">{bank.isCash ? '💵' : '🏦'}</div>
                  <div className="cfg-bank-info">
                    <div className="cfg-bank-name">{bank.name}</div>
                    {bank.isCash ? (
                      <div style={{ fontSize: 11, color: '#d97706', fontWeight: 700, marginTop: 4 }}>Cash Payment • No balance display</div>
                    ) : (
                      <div className="cfg-bank-balance">
                        ₹{Number(bank.balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    )}
                  </div>
                </div>
                <div className="cfg-actions">
                  <button className="btn btn-primary btn-sm" onClick={() => open('deposit', bank)}>
                    💰 Deposit
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => open('adjust', bank)}>
                    ↕ Adjust
                  </button>
                  {isSuperAdmin && (
                    <>
                      <button className="btn btn-ghost btn-sm" onClick={() => open('rename', bank)}>
                        ✏️ Rename
                      </button>
                      {!bank.isCash && (
                        <>
                          <button className="btn btn-ghost btn-sm" onClick={() => open('setBalance', bank)}>
                            📌 Set Absolute
                          </button>
                          <button className="btn btn-warning btn-sm" onClick={() => open('hardReset', bank)}>
                            🔄 Hard Reset
                          </button>
                        </>
                      )}
                      <button className="btn btn-danger btn-sm" onClick={() => open('delete', bank)}>
                        🗑 Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {banks.length === 0 && (
              <div className="empty-sub" style={{ gridColumn: '1/-1' }}>No bank accounts yet.</div>
            )}
          </div>
        </>
      )}

      {/* ═══ MODALS ═══════════════════════════════════════════ */}

      {modal.type && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <span className="modal-title">
                {modal.type === 'addBank' && '➕ Add New Account'}
                {modal.type === 'rename' && `✏️ Rename: ${modal.bank?.name}`}
                {modal.type === 'deposit' && `💰 Deposit → ${modal.bank?.name}`}
                {modal.type === 'adjust' && `↕ Adjust Balance: ${modal.bank?.name}`}
                {modal.type === 'setBalance' && `📌 Set Absolute Balance: ${modal.bank?.name}`}
                {modal.type === 'hardReset' && `🔄 Hard Reset: ${modal.bank?.name}`}
                {modal.type === 'delete' && `🗑 Delete: ${modal.bank?.name}`}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={closeModal}>✕</button>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-error mb-12">{error}</div>}

              {/* Add Bank */}
              {modal.type === 'addBank' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Account Name</label>
                    <input className="form-input" placeholder="e.g. Axis Bank, Petty Cash" value={newName} onChange={e => setNewName(e.target.value)} autoFocus />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <label className={`type-toggle ${!isCash ? 'active' : ''}`} onClick={() => setIsCash(false)}>
                        🏦 Bank (tracks balance)
                      </label>
                      <label className={`type-toggle ${isCash ? 'active' : ''}`} onClick={() => setIsCash(true)}>
                        💵 Cash (no balance)
                      </label>
                    </div>
                  </div>
                  {!isCash && (
                    <div className="form-group">
                      <label className="form-label">Opening Balance (₹)</label>
                      <input className="form-input" type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} />
                    </div>
                  )}
                </>
              )}

              {/* Rename */}
              {modal.type === 'rename' && (
                <div className="form-group">
                  <label className="form-label">New Name</label>
                  <input className="form-input" placeholder="Enter new name" value={newName} onChange={e => setNewName(e.target.value)} autoFocus />
                </div>
              )}

              {/* Deposit */}
              {modal.type === 'deposit' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Amount to Deposit (₹)</label>
                    <input className="form-input" type="number" placeholder="0.00" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} autoFocus />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Reference Note</label>
                    <input className="form-input" placeholder="e.g. Monthly salary, Client payment..." value={note} onChange={e => setNote(e.target.value)} />
                  </div>
                </>
              )}

              {/* Adjust */}
              {modal.type === 'adjust' && (
                <>
                  <div className="alert alert-info mb-12">
                    ℹ️ Use a <strong>positive</strong> value to add, <strong>negative</strong> to subtract.
                  </div>
                  <div className="form-group">
                    <label className="form-label">Adjustment Amount (₹)</label>
                    <input className="form-input" type="number" placeholder="+500 or -200" value={amount} onChange={e => setAmount(e.target.value)} autoFocus />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Reason</label>
                    <input className="form-input" placeholder="Why is this adjustment being made?" value={note} onChange={e => setNote(e.target.value)} />
                  </div>
                </>
              )}

              {/* Set Absolute Balance */}
              {modal.type === 'setBalance' && (
                <>
                  <div className="alert alert-warning mb-12">
                    ⚠️ This overrides the current balance entirely. Use for reconciliation only.
                  </div>
                  <div className="form-group">
                    <label className="form-label">New Absolute Balance (₹)</label>
                    <input className="form-input" type="number" placeholder="0.00" min="0" value={amount} onChange={e => setAmount(e.target.value)} autoFocus />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Reason</label>
                    <input className="form-input" placeholder="e.g. Bank statement reconciliation" value={note} onChange={e => setNote(e.target.value)} />
                  </div>
                </>
              )}

              {/* Hard Reset */}
              {modal.type === 'hardReset' && (
                <>
                  <div className="alert alert-error mb-12">
                    🔴 This will reset <strong>{modal.bank?.name}</strong>'s balance to ₹0.00. This cannot be undone.
                  </div>
                  <div className="form-group">
                    <label className="form-label">Reason (optional)</label>
                    <input className="form-input" placeholder="Why is this being reset?" value={note} onChange={e => setNote(e.target.value)} autoFocus />
                  </div>
                </>
              )}

              {/* Delete */}
              {modal.type === 'delete' && (
                <div className="alert alert-error">
                  🗑 Are you sure you want to delete <strong>{modal.bank?.name}</strong>?
                  This will fail if any expenses are linked to it.
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
              <button
                className={`btn ${modal.type === 'delete' || modal.type === 'hardReset' ? 'btn-danger' : 'btn-primary'}`}
                disabled={submitting}
                onClick={handleSubmit}
              >
                {submitting ? 'Processing...' : (
                  modal.type === 'addBank' ? 'Create Account' :
                  modal.type === 'rename' ? 'Rename' :
                  modal.type === 'deposit' ? 'Confirm Deposit' :
                  modal.type === 'adjust' ? 'Apply Adjustment' :
                  modal.type === 'setBalance' ? 'Update Balance' :
                  modal.type === 'hardReset' ? '⚠ Reset to ₹0' :
                  modal.type === 'delete' ? 'Delete Account' : 'Confirm'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .cfg-section-title { font-size: 14px; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px; }
        .cfg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
        .cfg-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 20px; }
        .cash-cfg-card { border: 2px dashed #d97706; background: rgba(251,191,36,0.04); }
        .cfg-card-top { display: flex; align-items: center; gap: 14px; margin-bottom: 16px; }
        .cfg-bank-icon { font-size: 28px; }
        .cfg-bank-name { font-weight: 800; font-size: 15px; color: var(--text-primary); }
        .cfg-bank-balance { font-size: 22px; font-weight: 900; color: var(--color-accent); margin-top: 4px; }
        .cfg-actions { display: flex; flex-wrap: wrap; gap: 8px; }
        .btn-warning { background: rgba(251,191,36,0.15); color: #d97706; border: 1px solid rgba(251,191,36,0.3); }
        .btn-warning:hover { background: rgba(251,191,36,0.25); }
        .type-toggle { flex: 1; padding: 10px; border: 2px solid var(--border-color); border-radius: 8px; text-align: center; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s; color: var(--text-muted); }
        .type-toggle.active { border-color: var(--color-primary); background: rgba(var(--color-primary-rgb, 99,102,241), 0.08); color: var(--color-primary); }
        .mb-12 { margin-bottom: 12px; }
        .empty-sub { padding: 24px; text-align: center; color: var(--text-muted); font-size: 13px; background: var(--bg-secondary); border-radius: 8px; border: 1px dashed var(--border-color); }
      `}</style>
    </Layout>
  );
}
