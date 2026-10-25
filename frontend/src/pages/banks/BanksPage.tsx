import React, { useEffect, useState } from 'react';
import { Landmark, Banknote, Plus, RefreshCw } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { banksApi, expensesApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { istDate, money } from '../../components/sales/SalesLedger';
import { BankAccount } from '../../types';

type Mode = 'deposit' | 'deduct' | 'misc' | 'set' | 'create';

const MODE_COPY: Record<Mode, { title: (b?: string) => string; amountLabel: string; button: string; help?: string; tone: 'primary' | 'danger' }> = {
  deposit: { title: b => `Add money to ${b}`, amountLabel: 'Amount to add (₹)', button: 'Add money', tone: 'primary' },
  deduct: { title: b => `Take money out of ${b}`, amountLabel: 'Amount to take out (₹)', button: 'Take out', tone: 'danger',
    help: 'Use this for transfers between accounts. It does not create an expense.' },
  misc: { title: b => `Record a bank charge on ${b}`, amountLabel: 'Amount (₹)', button: 'Record charge', tone: 'danger',
    help: 'Saved as a “Miscellaneous” expense, paid from this account.' },
  set: { title: b => `Correct the balance of ${b}`, amountLabel: 'Correct balance (₹)', button: 'Set balance', tone: 'danger',
    help: 'Replaces the balance with the number you enter. Use only to match the bank statement; the change is logged.' },
  create: { title: () => 'Add an account', amountLabel: 'Opening balance (₹)', button: 'Add account', tone: 'primary' },
};

/** One line of Bank Activity, from the audit row the server writes for every balance change. */
function describe(log: NonNullable<BankAccount['logs']>[number]) {
  const v: any = { ...(log.oldValue || {}), ...(log.newValue || {}) };
  const amount = Math.abs(Number(v.amount || 0) || Number(v.balance || 0));
  switch (v.action) {
    case 'DEPOSIT': return { label: 'Money added', amount, sign: 1, detail: v.note };
    case 'ADJUST_UP': return { label: 'Adjusted up', amount, sign: 1, detail: v.note };
    case 'ADJUST_DOWN': return { label: 'Taken out', amount, sign: -1, detail: v.note };
    case 'EXPENSE_DEDUCTION': return { label: 'Expense paid', amount, sign: -1, detail: v.category };
    case 'EXPENSE_REFUND': {
      const why: Record<string, string> = {
        EXPENSE_DELETED: 'expense deleted', REJECTED_AFTER_APPROVAL: 'expense rejected',
        EDITED_BACK_TO_PENDING: 'expense sent back for approval', AMOUNT_REDUCED: 'expense amount reduced',
      };
      return { label: 'Expense refunded', amount, sign: 1, detail: [v.category, why[v.reason]].filter(Boolean).join(', ') };
    }
    case 'CASH_RECONCILIATION': return { label: 'Cash sales added', amount, sign: Number(v.amount) < 0 ? -1 : 1, detail: 'end of day' };
    case 'ONLINE_RECONCILIATION': return { label: 'Online sales added', amount, sign: Number(v.amount) < 0 ? -1 : 1, detail: 'end of day' };
    case 'SET_BALANCE': return { label: 'Balance corrected', amount: Number(v.balance ?? amount), sign: 0, detail: v.note };
    case 'HARD_RESET': return { label: 'Balance reset', amount: Number(v.balance ?? 0), sign: 0, detail: v.note };
    case 'RENAME': return { label: 'Account renamed', amount: 0, sign: 0, detail: v.name };
    default:
      if (log.action === 'AUTO_TRANS') return { label: 'Automatic entry', amount, sign: 1, detail: v.date };
      return { label: v.action ? String(v.action).toLowerCase().replace(/_/g, ' ') : 'Balance changed', amount, sign: 0, detail: v.note };
  }
}

const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export default function BanksPage() {
  const { isSuperAdmin } = useAuth();
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(istDate());
  const [view, setView] = useState<'activity' | 'expenses'>('activity');
  const [error, setError] = useState('');

  const [mode, setMode] = useState<Mode | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [newName, setNewName] = useState('');
  const [newIsCash, setNewIsCash] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const load = () => {
    setLoading(true);
    banksApi.analytics({ date })
      .then(r => {
        const list = r.data.data ?? [];
        setBanks(list);
        setSelectedId(id => (id && list.some(b => b.id === id) ? id : list[0]?.id ?? null));
      })
      .catch(() => setError('The bank book didn’t load. Check the connection and try again.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [date]);

  const bank = banks.find(b => b.id === selectedId) ?? null;
  const total = banks.filter(b => !b.isCash).reduce((s, b) => s + Number(b.balance), 0);

  const open = (m: Mode) => { setMode(m); setAmount(''); setNote(''); setNewName(''); setNewIsCash(false); setFormError(''); };
  const close = () => { if (!submitting) setMode(null); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (mode === 'create') {
      if (!newName.trim()) { setFormError('Give the account a name.'); return; }
    } else if (mode === 'set' ? (isNaN(val) || val < 0) : (!val || val <= 0)) {
      setFormError('Enter an amount greater than 0.'); return;
    }
    setSubmitting(true); setFormError('');
    try {
      if (mode === 'create') await banksApi.create({ name: newName.trim(), balance: val || 0, isCash: newIsCash });
      else if (bank && mode === 'deposit') await banksApi.deposit(bank.id, val, note);
      else if (bank && mode === 'deduct') await banksApi.adjust(bank.id, -val, note || `Taken out of ${bank.name}`);
      else if (bank && mode === 'set') await banksApi.setBalance(bank.id, val, note);
      else if (bank && mode === 'misc') await expensesApi.create({ amount: val, category: 'Miscellaneous', note: note || `Bank charge, ${bank.name}`, bankId: bank.id });
      setMode(null);
      load();
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'That didn’t go through. Nothing was changed; try again.');
    } finally { setSubmitting(false); }
  };

  const copy = mode ? MODE_COPY[mode] : null;

  return (
    <Layout title="Bank book">
      <div className="page-header">
        <div>
          <div className="page-header-title">Bank book</div>
          <div className="page-header-sub">Balances of every account, and what changed them.</div>
        </div>
        <div className="page-actions">
          <input type="date" aria-label="Activity date" className="form-input" style={{ width: 170 }} value={date} max={istDate()} onChange={e => setDate(e.target.value || istDate())} />
          <button className="btn btn-ghost" onClick={load} aria-label="Refresh"><RefreshCw size={16} /></button>
          {isSuperAdmin && <button className="btn btn-primary" onClick={() => open('create')}><Plus size={17} /> Add an account</button>}
        </div>
      </div>

      {error && <div className="alert alert-error mb-16" role="alert">{error}</div>}

      {loading && banks.length === 0 ? <div className="page-loading"><div className="spinner spinner-lg" /></div> : (
        <div className="bankbook">
          <section className="table-wrapper bank-list" aria-label="Accounts">
            <table>
              <thead><tr><th>Account</th><th className="amount">Balance</th></tr></thead>
              <tbody>
                {banks.map(b => (
                  <tr key={b.id} className={b.id === selectedId ? 'is-selected' : ''} onClick={() => setSelectedId(b.id)}
                    style={{ cursor: 'pointer' }} aria-selected={b.id === selectedId}>
                    <td>
                      <button type="button" className="bank-name" onClick={() => setSelectedId(b.id)}>
                        {b.isCash ? <Banknote size={16} /> : <Landmark size={16} />} {b.name}
                      </button>
                    </td>
                    <td className="amount" style={{ fontWeight: 600 }}>
                      {b.isCash ? <span className="text-muted text-sm">Cash</span> : <>₹{money(Number(b.balance))}</>}
                    </td>
                  </tr>
                ))}
                <tr className="bank-total">
                  <td>Bank accounts</td>
                  <td className="amount">₹{money(total)}</td>
                </tr>
              </tbody>
            </table>
          </section>

          {bank && (
            <section className="card bank-detail" aria-labelledby="bank-title">
              <div className="flex-between" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div>
                  <h2 id="bank-title" className="card-title" style={{ fontSize: 'var(--fs-lg)' }}>{bank.name}</h2>
                  <div className="text-sm text-muted">
                    {bank.isCash ? 'Cash account' : `₹${money(Number(bank.totalDeducted || 0))} paid out for expenses so far`}
                  </div>
                </div>
                {!bank.isCash && (
                  <div className="bank-balance"><span className="cur">₹</span>{money(Number(bank.balance))}</div>
                )}
              </div>

              <div className="bank-actions">
                <button className="btn btn-primary" onClick={() => open('deposit')}>Add money</button>
                <button className="btn btn-ghost" onClick={() => open('deduct')}>Take out</button>
                <button className="btn btn-ghost" onClick={() => open('misc')}>Bank charge</button>
                {isSuperAdmin && !bank.isCash && <button className="btn btn-ghost" onClick={() => open('set')}>Correct balance</button>}
              </div>

              <div className="flex-between" style={{ margin: '18px 0 6px' }}>
                <div className="seg" role="group" aria-label="Show">
                  <button type="button" aria-pressed={view === 'activity'} onClick={() => setView('activity')}>Activity</button>
                  <button type="button" aria-pressed={view === 'expenses'} onClick={() => setView('expenses')}>Expenses ({bank._count?.expenses || 0})</button>
                </div>
                <span className="text-xs text-muted">{date === istDate() ? 'Today' : date}</span>
              </div>

              {view === 'activity' ? (
                bank.logs && bank.logs.length > 0 ? (
                  <div className="ledger">
                    {bank.logs.map(log => {
                      const d = describe(log);
                      return (
                        <div key={log.id} className="ledger-row">
                          <div className="ledger-main">{d.label}</div>
                          <div className={`ledger-amt ${d.sign > 0 ? 'amt-in' : d.sign < 0 ? 'amt-out' : ''}`}>
                            {d.sign > 0 ? '+' : d.sign < 0 ? '−' : ''}₹{money(d.amount)}
                          </div>
                          <div className="ledger-meta">
                            <span>{when(log.createdAt)}</span>
                            <span>{['SYSTEM_AUTO', 'System Auto'].includes(log.user?.name) ? 'Automatic' : log.user?.name}</span>
                            {d.detail && <span>{d.detail}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : <div className="empty-state" style={{ padding: 28 }}>No changes to this account on this day.</div>
              ) : (
                bank.expenses && bank.expenses.length > 0 ? (
                  <div className="ledger">
                    {bank.expenses.map(exp => (
                      <div key={exp.id} className="ledger-row">
                        <div className="ledger-main">{exp.category}</div>
                        <div className="ledger-amt amt-out">−₹{money(Number(exp.amount))}</div>
                        <div className="ledger-meta">
                          <span>{when(exp.createdAt)}</span>
                          <span>{exp.user?.name}</span>
                          {exp.note && <span>{exp.note}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <div className="empty-state" style={{ padding: 28 }}>No expenses paid from this account on this day.</div>
              )}
            </section>
          )}
        </div>
      )}

      {mode && copy && (
        <div className="modal-overlay" onClick={close}>
          <form className="modal" role="dialog" aria-modal="true" aria-labelledby="money-title" onClick={e => e.stopPropagation()} onSubmit={submit}>
            <div className="modal-header">
              <h2 id="money-title" className="modal-title">{copy.title(bank?.name)}</h2>
            </div>
            <div className="modal-body">
              {copy.help && <div className={`alert ${mode === 'set' ? 'alert-warning' : 'alert-info'}`}>{copy.help}</div>}
              {formError && <div className="alert alert-error" role="alert">{formError}</div>}
              {mode === 'create' && (
                <div className="form-group">
                  <label className="form-label" htmlFor="bank-name">Account name</label>
                  <input id="bank-name" className="form-input" placeholder="e.g. HDFC Bank" value={newName} onChange={e => setNewName(e.target.value)} autoFocus />
                </div>
              )}
              <div className="form-group">
                <label className="form-label" htmlFor="money-amount">{copy.amountLabel}</label>
                <input id="money-amount" className="form-input" type="number" inputMode="decimal" min="0" step="0.01"
                  value={amount} onChange={e => setAmount(e.target.value)} autoFocus={mode !== 'create'}
                  style={{ minHeight: 50, fontSize: 'var(--fs-xl)', fontWeight: 650 }} />
                {bank && mode !== 'create' && !bank.isCash && (
                  <span className="form-hint">Now ₹{money(Number(bank.balance))}</span>
                )}
              </div>
              {mode === 'create' ? (
                <label className="flex gap-8" style={{ alignItems: 'center', cursor: 'pointer' }}>
                  <input type="checkbox" checked={newIsCash} onChange={e => setNewIsCash(e.target.checked)} />
                  <span>This is a cash account</span>
                </label>
              ) : (
                <div className="form-group">
                  <label className="form-label" htmlFor="money-note">{mode === 'deposit' ? 'Note (optional)' : 'Reason'}</label>
                  <input id="money-note" className="form-input" value={note} onChange={e => setNote(e.target.value)}
                    placeholder={mode === 'deposit' ? 'Where the money came from' : 'Why the balance changes'} />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-ghost" onClick={close}>Cancel</button>
              <button type="submit" className={`btn ${copy.tone === 'danger' ? 'btn-danger' : 'btn-primary'}`} disabled={submitting}>
                {submitting ? <><span className="spinner" /> Saving</> : copy.button}
              </button>
            </div>
          </form>
        </div>
      )}

      <style>{`
        .bankbook { display: grid; grid-template-columns: minmax(260px, 360px) minmax(0, 1fr); gap: 16px; align-items: start; }
        .bank-list tr.is-selected { background: var(--ink-wash); }
        .bank-list tr.is-selected td:first-child { box-shadow: inset 3px 0 0 var(--ink); }
        .bank-name { display: inline-flex; align-items: center; gap: 8px; font-weight: 600; text-align: left; }
        .bank-name svg { color: var(--graphite-3); flex-shrink: 0; }
        .bank-total td { background: var(--sheet-2); font-weight: 700; border-top: 2px solid var(--graphite); }
        .bank-balance { font-size: var(--fs-3xl); font-weight: 650; font-stretch: 82%; font-variant-numeric: tabular-nums; line-height: 1.1; }
        .bank-balance .cur { font-size: 0.55em; color: var(--graphite-3); font-weight: 500; margin-right: 3px; }
        .bank-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; padding-bottom: 16px; border-bottom: 1px solid var(--rule); }
        @media (max-width: 900px) { .bankbook { grid-template-columns: 1fr; } }
      `}</style>
    </Layout>
  );
}
