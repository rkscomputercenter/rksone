import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Minus, Plus } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { analyticsApi, servicesApi, transactionsApi } from '../../api';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import type { Service, ServiceCategory } from '../../types';
import FloatingCalculator from '../../components/common/FloatingCalculator';
import { PageLoading } from '../../components/ui/Loading';

const CATS: ServiceCategory[] = ['GOVT', 'PRINTING', 'CARDS', 'OTHER'];
const CAT_LABELS: Record<ServiceCategory, string> = { GOVT: 'Government', PRINTING: 'Printing', CARDS: 'Cards', OTHER: 'Other' };
const SHOP_LABEL: Record<string, string> = { SHOP_COMPUTER: 'Computer shop', SHOP_XEROX: 'Xerox shop' };

type Pay = 'CASH' | 'ONLINE';
type QuickPay = 'CASH' | 'ONLINE' | 'OTHER';

const rupees = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function NewTransaction() {
  const { t } = useLanguage();
  const { activeShop } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Service | null>(null);
  const [quantity, setQuantity] = useState<number | ''>(1);
  const [unitPrice, setUnitPrice] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<Pay | ''>('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<{ no: number; text: string } | null>(null);
  // Entry number on the slip: today's count + 1 (own sales for staff, the shop's for admins)
  const [entryNo, setEntryNo] = useState<number | null>(null);

  // Quick entry without a listed service ("Others")
  const [othersAmount, setOthersAmount] = useState<number | ''>('');
  const [othersName, setOthersName] = useState('');
  const [othersPayment, setOthersPayment] = useState<QuickPay | ''>('');
  const [othersSubmitting, setOthersSubmitting] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);
  const shop = activeShop || 'SHOP_COMPUTER';

  useEffect(() => {
    servicesApi.list({ active: true })
      .then(r => setServices(r.data.data ?? []))
      .finally(() => setLoading(false));
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    analyticsApi.todaySummary()
      .then(r => setEntryNo((r.data.data?.transactionCount ?? 0) + 1))
      .catch(() => setEntryNo(null));
  }, [activeShop]);

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = services.filter(s => !q || s.name.toLowerCase().includes(q) || CAT_LABELS[s.category].toLowerCase().includes(q));
    return CATS.map(cat => [cat, filtered.filter(s => s.category === cat)] as const).filter(([, items]) => items.length > 0);
  }, [services, search]);

  const total = selected && unitPrice !== '' ? Number(unitPrice) * (Number(quantity) || 0) : 0;

  const flashSaved = (text: string) => {
    setSaved({ no: entryNo ?? 0, text });
    setEntryNo(n => (n === null ? n : n + 1));
    setTimeout(() => setSaved(null), 2600);
  };

  const handleSelect = (s: Service) => {
    setSelected(s);
    setQuantity(1);
    setUnitPrice(Number(s.price));
    setPaymentMethod('');
    setError('');
    setTimeout(() => qtyRef.current?.select(), 50);
  };

  const resetSale = () => {
    setSelected(null);
    setQuantity(1);
    setUnitPrice('');
    setNotes('');
    setSearch('');
    setPaymentMethod('');
    setTimeout(() => searchRef.current?.focus(), 50);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selected) { setError(t('newTx.errorSelect' as any)); return; }
    if (quantity === '' || quantity < 1) { setError(t('newTx.errorQuantity' as any)); return; }
    if (unitPrice === '' || unitPrice < 0) { setError(t('newTx.errorPrice' as any)); return; }
    if (!paymentMethod) { setError('Choose how the customer paid: cash or online.'); return; }

    setError('');
    setSubmitting(true);
    try {
      await transactionsApi.create({
        serviceId: selected.id,
        quantity: Number(quantity),
        unitPrice: Number(unitPrice),
        paymentMethod,
        shop,
        notes: notes || undefined,
      });
      flashSaved(`${selected.name} × ${quantity}, ₹${rupees(total)} ${paymentMethod === 'CASH' ? 'cash' : 'online'}`);
      resetSale();
    } catch (err: any) {
      setError(err.response?.data?.error || 'The sale was not saved. Check the connection and try again.');
    } finally { setSubmitting(false); }
  };

  const handleOthersSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!othersAmount || othersAmount <= 0) { setError('Enter an amount for the quick entry.'); return; }
    if (!othersPayment) { setError('Choose how the customer paid for the quick entry.'); return; }

    setOthersSubmitting(true);
    setError('');
    try {
      await transactionsApi.create({
        serviceName: 'Others',
        quantity: 1,
        unitPrice: Number(othersAmount),
        paymentMethod: othersPayment,
        shop,
        notes: othersName || undefined,
      });
      flashSaved(`${othersName || 'Others'}, ₹${rupees(Number(othersAmount))}`);
      setOthersAmount('');
      setOthersName('');
      setOthersPayment('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'The quick entry was not saved. Try again.');
    } finally { setOthersSubmitting(false); }
  };

  const onEnterSave = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); }
  };

  const today = new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <Layout title={t('newTx.title' as any)}>
      <div className="sale-page">
        <form className="slip" onSubmit={handleSubmit} aria-labelledby="sale-title">
          {saved && <div className="stamp" aria-hidden="true">Saved</div>}

          <div className="slip-head">
            <div>
              <h2 id="sale-title" className="slip-title">{t('newTx.title' as any)}</h2>
              <div className="slip-meta">{today}, {SHOP_LABEL[shop] ?? shop}</div>
            </div>
            {entryNo !== null && (
              <div className="slip-no" aria-label={`Entry number ${entryNo} today`}>
                <small>No.</small>
                <span>{String(entryNo).padStart(3, '0')}</span>
              </div>
            )}
          </div>

          <div aria-live="polite">
            {saved && <div className="alert alert-success mb-16">Saved entry {String(saved.no).padStart(3, '0')}: {saved.text}</div>}
            {error && <div className="alert alert-error mb-16" role="alert">{error}</div>}
          </div>

          {!selected ? (
            <div className="form-group">
              <label className="form-label" htmlFor="service-search">{t('newTx.searchLabel' as any)}</label>
              <div className="search-box">
                <span className="search-icon"><Search size={17} /></span>
                <input id="service-search" ref={searchRef} className="form-input search-input" style={{ minHeight: 48 }}
                  placeholder={t('newTx.searchPlaceholder' as any)} value={search} autoComplete="off"
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => {
                    const first = grouped[0]?.[1][0];
                    if (e.key === 'Enter' && first) { e.preventDefault(); handleSelect(first); }
                  }} />
              </div>
              {loading ? (
                <PageLoading height={140} />
              ) : (
                <div className="service-list" role="listbox" aria-label="Services">
                  {grouped.length === 0 && (
                    <div className="empty-state" style={{ padding: 24 }}>
                      {t('newTx.noServices' as any)} “{search}”. Use the quick entry below for anything not on the list.
                    </div>
                  )}
                  {grouped.map(([cat, items]) => (
                    <div key={cat} role="group" aria-label={CAT_LABELS[cat]}>
                      <div className="service-group-title">{CAT_LABELS[cat]}</div>
                      {items.map(s => (
                        <button type="button" role="option" aria-selected={false} key={s.id} className="service-item" onClick={() => handleSelect(s)}>
                          <span className="service-item-name">{s.name}</span>
                          <span className="service-item-price">₹{rupees(Number(s.price))}</span>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="slip-line">
                <div>
                  <div style={{ fontSize: 'var(--fs-lg)', fontWeight: 650, color: 'var(--graphite)' }}>{selected.name}</div>
                  <div className="text-xs">{CAT_LABELS[selected.category]}, list price ₹{rupees(Number(selected.price))}</div>
                </div>
                <button type="button" className="btn btn-ghost btn-sm" onClick={resetSale}>{t('newTx.clear' as any)}</button>
              </div>

              <div className="sale-fields">
                <div className="form-group">
                  <label className="form-label" htmlFor="qty">{t('newTx.quantity' as any)}</label>
                  <div className="stepper">
                    <button type="button" aria-label="One less" onClick={() => setQuantity(q => Math.max(1, (Number(q) || 1) - 1))}><Minus size={18} /></button>
                    <input id="qty" ref={qtyRef} className="form-input" type="number" inputMode="numeric" min={1} value={quantity}
                      onChange={e => setQuantity(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1))}
                      onKeyDown={onEnterSave} />
                    <button type="button" aria-label="One more" onClick={() => setQuantity(q => (Number(q) || 0) + 1)}><Plus size={18} /></button>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="price">{t('newTx.unitPrice' as any)}</label>
                  <input id="price" className="form-input" type="number" inputMode="decimal" min={0} step="0.01" value={unitPrice}
                    style={{ minHeight: 48 }}
                    onChange={e => setUnitPrice(e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value)))}
                    onKeyDown={onEnterSave} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="note">{t('newTx.notes' as any)}</label>
                <input id="note" className="form-input" type="text" value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Customer name, page count…" onKeyDown={onEnterSave} />
              </div>

              <div className="form-group">
                <span className="form-label" id="pay-label">Paid by</span>
                <div className="seg seg-lg" role="group" aria-labelledby="pay-label">
                  <button type="button" aria-pressed={paymentMethod === 'CASH'} onClick={() => setPaymentMethod('CASH')}>Cash</button>
                  <button type="button" aria-pressed={paymentMethod === 'ONLINE'} onClick={() => setPaymentMethod('ONLINE')}>Online / UPI</button>
                </div>
              </div>

              <div className="slip-total">
                <span className="slip-total-label">{t('newTx.totalAmount' as any)}</span>
                <span className="slip-total-value"><span className="cur">₹</span>{rupees(total)}</span>
              </div>

              <button type="submit" className="btn btn-primary btn-lg btn-full" style={{ marginTop: 14 }}
                disabled={!paymentMethod || submitting}>
                {submitting ? <><span className="spinner" /> {t('newTx.saving' as any)}</> : `${t('newTx.saveBtn' as any)}, ₹${rupees(total)}`}
              </button>
            </>
          )}
        </form>

        <aside className="card quick-entry" aria-labelledby="quick-title">
          <h3 id="quick-title">Something not on the list</h3>
          <p className="text-sm text-muted" style={{ margin: '2px 0 14px' }}>Saved as “Others” with your note.</p>
          <form onSubmit={handleOthersSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label" htmlFor="others-amount">Amount (₹)</label>
                <input id="others-amount" className="form-input" type="number" inputMode="decimal" min={0} step="0.01"
                  value={othersAmount} onChange={e => setOthersAmount(e.target.value === '' ? '' : Math.max(0, parseFloat(e.target.value)))} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="others-name">What was it?</label>
                <input id="others-name" className="form-input" value={othersName} onChange={e => setOthersName(e.target.value)} placeholder="Optional" />
              </div>
            </div>
            <div className="form-group" style={{ marginTop: 14 }}>
              <span className="form-label" id="quick-pay-label">Paid by</span>
              <div className="seg" role="group" aria-labelledby="quick-pay-label" style={{ width: '100%' }}>
                {(['CASH', 'ONLINE', 'OTHER'] as QuickPay[]).map(p => (
                  <button key={p} type="button" style={{ flex: 1 }} aria-pressed={othersPayment === p} onClick={() => setOthersPayment(p)}>
                    {p === 'CASH' ? 'Cash' : p === 'ONLINE' ? 'Online' : 'Other'}
                  </button>
                ))}
              </div>
            </div>
            <button type="submit" className="btn btn-ghost btn-full" style={{ marginTop: 6 }}
              disabled={!othersAmount || !othersPayment || othersSubmitting}>
              {othersSubmitting ? <><span className="spinner" /> Saving</> : 'Save quick entry'}
            </button>
          </form>
          <hr style={{ margin: '18px 0 12px' }} />
          <Link to="/transactions" className="btn-link text-sm">{t('newTx.viewList' as any)}</Link>
        </aside>
      </div>
      <FloatingCalculator />

      <style>{`
        .sale-page { display: grid; grid-template-columns: minmax(0, 620px) minmax(260px, 340px); gap: 28px; align-items: start; justify-content: center; }
        .sale-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 16px; }
        .stepper { display: grid; grid-template-columns: 48px 1fr 48px; border: 1px solid var(--rule); border-radius: var(--radius-md); overflow: hidden; background: var(--sheet); }
        .stepper:focus-within { border-color: var(--ink); box-shadow: var(--focus-ring); }
        .stepper button { display: grid; place-items: center; color: var(--ink); background: var(--sheet-2); min-height: 46px; }
        .stepper button:hover { background: var(--ink-wash); }
        .stepper .form-input { border: none; border-radius: 0; text-align: center; font-size: var(--fs-lg); font-weight: 650; box-shadow: none; min-height: 46px; }
        .quick-entry { position: sticky; top: 0; }
        @media (max-width: 960px) {
          .sale-page { grid-template-columns: minmax(0, 1fr); max-width: 620px; margin: 0 auto; }
          .quick-entry { position: static; }
        }
        @media (max-width: 480px) { .sale-fields { grid-template-columns: 1fr; } }
      `}</style>
    </Layout>
  );
}
