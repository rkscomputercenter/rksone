import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Printer } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { servicesApi, systemApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { Service } from '../types';

interface BillItem {
  id: string;
  name: string;
  qty: string;
  rate: string;
}

type Footer = 'DISCLAIMER' | 'SEAL_SIGN';

const SHOP = {
  name: 'RKS Xerox and Computer Center',
  address: 'Opposite Taluk Office, Harur, Tamil Nadu 636903',
  phone: '9942891322',
  email: 'rksxerox@gmail.com',
};

const newItem = (): BillItem => ({ id: `${Date.now()}-${Math.random()}`, name: '', qty: '1', rate: '' });
const amountOf = (i: BillItem) => (parseFloat(i.qty) || 0) * (parseFloat(i.rate) || 0);
const inr = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** IST date (YYYY-MM-DD) and 24-hour time (HH:mm), the formats the date and time inputs use. */
function istNow() {
  const now = new Date();
  return {
    date: now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
    time: now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }),
  };
}

const displayDate = (ymd: string) => { const [y, m, d] = ymd.split('-'); return d && m && y ? `${d}/${m}/${y}` : ymd; };
const displayTime = (hm: string) => {
  const [h, m] = hm.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hm;
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
};

export default function BillingPage() {
  const { user, isSuperAdmin } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [footer, setFooter] = useState<Footer>('DISCLAIMER');
  const [colour, setColour] = useState(false);
  const [{ date, time }, setWhen] = useState(istNow);
  const [items, setItems] = useState<BillItem[]>([newItem()]);
  const [printing, setPrinting] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    servicesApi.list({ active: true })
      .then(res => setServices(res.data.data ?? []))
      .catch(console.error);
  }, []);

  const update = (id: string, field: keyof Omit<BillItem, 'id'>, value: string) => {
    setItems(list => list.map(item => {
      if (item.id !== id) return item;
      const next = { ...item, [field]: value };
      // Picking a service from the list fills in its price
      if (field === 'name') {
        const service = services.find(s => s.name === value);
        if (service) next.rate = String(service.price);
      }
      return next;
    }));
  };

  const lines = items.filter(i => i.name.trim() || amountOf(i) > 0);
  const total = items.reduce((sum, i) => sum + amountOf(i), 0);

  const handlePrint = async () => {
    setPrinting(true);
    setNotice('');
    try {
      await systemApi.logBill({
        customerName: customerName.trim() || 'Walk-in customer',
        total,
        items: lines.map(i => ({ name: i.name, qty: Number(i.qty) || 0, rate: Number(i.rate) || 0, amount: String(amountOf(i)) })),
        date: `${date} ${displayTime(time)}`,
      });
    } catch {
      // The bill still prints; it just won't appear in Printed bills
      setNotice('Printed, but the bill could not be saved to Printed bills. Check the connection.');
    }
    setPrinting(false);
    setTimeout(() => window.print(), 50);
  };

  const reset = () => { setItems([newItem()]); setCustomerName(''); setWhen(istNow()); setNotice(''); };

  return (
    <Layout title="Print a bill">
      <div className="page-header no-print">
        <div>
          <div className="page-header-title">Print a bill</div>
          <div className="page-header-sub">Add what the customer took. The bill on the right is exactly what prints.</div>
        </div>
        <button className="btn btn-ghost" onClick={reset}>Start a new bill</button>
      </div>

      {notice && <div className="alert alert-warning mb-16 no-print">{notice}</div>}

      <div className="bill-layout">
        <section className="card bill-editor no-print" aria-labelledby="bill-edit-title">
          <h2 id="bill-edit-title" className="sr-only">Bill details</h2>
          <div className="form-group">
            <label className="form-label" htmlFor="bill-customer">Customer</label>
            <input id="bill-customer" className="form-input" placeholder="Walk-in customer" value={customerName} onChange={e => setCustomerName(e.target.value)} />
          </div>
          <div className="form-grid" style={{ marginBottom: 18 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="bill-date">Date</label>
              <input id="bill-date" type="date" className="form-input" value={date} disabled={!isSuperAdmin}
                onChange={e => setWhen(w => ({ ...w, date: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="bill-time">Time</label>
              <input id="bill-time" type="time" className="form-input" value={time} disabled={!isSuperAdmin}
                onChange={e => setWhen(w => ({ ...w, time: e.target.value }))} />
            </div>
          </div>
          {!isSuperAdmin && <p className="form-hint" style={{ marginTop: -10, marginBottom: 16 }}>Date and time are set to now. A super admin can change them.</p>}

          <datalist id="services-list">
            {services.map(s => <option key={s.id} value={s.name} />)}
          </datalist>

          <div className="bill-lines-head" aria-hidden="true">
            <span>Item</span><span>Qty</span><span>Rate (₹)</span><span />
          </div>
          <div className="bill-lines">
            {items.map((item, i) => (
              <div key={item.id} className="bill-line">
                <input className="form-input" aria-label={`Item ${i + 1}`} placeholder="Service or anything else" list="services-list"
                  value={item.name} onChange={e => update(item.id, 'name', e.target.value)} />
                <input className="form-input" aria-label={`Quantity of item ${i + 1}`} type="number" inputMode="numeric" min={1}
                  value={item.qty} onChange={e => update(item.id, 'qty', e.target.value)} />
                <input className="form-input" aria-label={`Rate of item ${i + 1}`} type="number" inputMode="decimal" min={0} step="0.01"
                  value={item.rate} onChange={e => update(item.id, 'rate', e.target.value)} />
                <button type="button" className="icon-btn" aria-label={`Remove item ${i + 1}`} disabled={items.length === 1}
                  onClick={() => setItems(list => list.filter(x => x.id !== item.id))}>
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={() => setItems(list => [...list, newItem()])}>
            <Plus size={15} /> Add a line
          </button>

          <hr style={{ margin: '20px 0 16px' }} />

          <div className="form-group">
            <span className="form-label" id="bill-ink">Print in</span>
            <div className="seg" role="group" aria-labelledby="bill-ink" style={{ width: '100%' }}>
              <button type="button" style={{ flex: 1 }} aria-pressed={!colour} onClick={() => setColour(false)}>Black and white</button>
              <button type="button" style={{ flex: 1 }} aria-pressed={colour} onClick={() => setColour(true)}>Colour</button>
            </div>
          </div>
          <div className="form-group">
            <span className="form-label" id="bill-foot">Bottom of the bill</span>
            <div className="seg" role="group" aria-labelledby="bill-foot" style={{ width: '100%' }}>
              <button type="button" style={{ flex: 1 }} aria-pressed={footer === 'DISCLAIMER'} onClick={() => setFooter('DISCLAIMER')}>System bill, no signature</button>
              <button type="button" style={{ flex: 1 }} aria-pressed={footer === 'SEAL_SIGN'} onClick={() => setFooter('SEAL_SIGN')}>Seal and signature</button>
            </div>
          </div>

          <button className="btn btn-primary btn-lg btn-full" style={{ marginTop: 6 }} disabled={total === 0 || printing} onClick={handlePrint}>
            <Printer size={18} /> {printing ? 'Preparing' : `Print bill, ₹${inr(total)}`}
          </button>
        </section>

        {/* The bill: shown as a preview on screen, and the only thing that prints */}
        <div className="bill-stage">
          <article className={`bill-paper print-target${colour ? ' is-colour' : ''}`} aria-label="Bill preview">
            <header className="bill-head">
              <div className="bill-shop">{SHOP.name}</div>
              <div className="bill-shop-sub">{SHOP.address}</div>
              <div className="bill-shop-sub">Phone {SHOP.phone}, {SHOP.email}</div>
            </header>

            <div className="bill-meta">
              <div>
                <div><span>Bill to</span> {customerName.trim() || 'Walk-in customer'}</div>
                <div><span>Prepared by</span> {user?.name}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div><span>Date</span> {displayDate(date)}</div>
                <div><span>Time</span> {displayTime(time)}</div>
              </div>
            </div>

            <table className="bill-table">
              <thead>
                <tr><th style={{ width: '8%' }}>No.</th><th style={{ textAlign: 'left' }}>Particulars</th><th style={{ width: '10%' }}>Qty</th><th style={{ width: '16%' }}>Rate</th><th style={{ width: '20%' }}>Amount (₹)</th></tr>
              </thead>
              <tbody>
                {(lines.length ? lines : [items[0]]).map((item, i) => (
                  <tr key={item.id}>
                    <td style={{ textAlign: 'center' }}>{i + 1}</td>
                    <td>{item.name || <span className="bill-blank">Item</span>}</td>
                    <td style={{ textAlign: 'center' }}>{item.qty || ''}</td>
                    <td style={{ textAlign: 'right' }}>{item.rate ? inr(parseFloat(item.rate) || 0) : ''}</td>
                    <td style={{ textAlign: 'right' }}>{inr(amountOf(item))}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td colSpan={4} style={{ textAlign: 'right' }}>Total</td><td style={{ textAlign: 'right' }}>₹{inr(total)}</td></tr>
              </tfoot>
            </table>

            <footer className="bill-foot">
              {footer === 'DISCLAIMER' ? (
                <>
                  <p><strong>Disclaimer:</strong> Applicable to whomsoever it may concern.</p>
                  <p><em>System generated bill. No signature required.</em></p>
                </>
              ) : (
                <div className="bill-signs">
                  <div>Customer signature</div>
                  <div>Authorised seal and signature</div>
                </div>
              )}
            </footer>
          </article>
        </div>
      </div>

      <style>{`
        .bill-layout { display: grid; grid-template-columns: minmax(320px, 440px) minmax(0, 1fr); gap: 24px; align-items: start; }
        .bill-lines-head, .bill-line { display: grid; grid-template-columns: minmax(0, 1fr) 64px 96px 36px; gap: 8px; align-items: center; }
        .bill-lines-head { font-size: var(--fs-xs); font-weight: 600; color: var(--graphite-3); padding: 0 2px 4px; }
        .bill-lines { display: flex; flex-direction: column; gap: 8px; }
        .bill-line .form-input[type=number] { padding-left: 8px; padding-right: 8px; text-align: right; }

        /* The preview: an A4 sheet on the desk */
        .bill-stage { position: sticky; top: 0; background: var(--sheet-3); border-radius: var(--radius-lg); padding: 24px; }
        .bill-paper {
          --bill-ink: #111;
          --bill-accent: #111;
          --bill-rule: #111;
          --bill-head-bg: #F2F2F2;
          background: #fff; color: var(--bill-ink);
          max-width: 640px; margin: 0 auto; aspect-ratio: 210 / 297;
          padding: 40px 44px; box-shadow: 0 1px 3px rgba(30, 36, 48, 0.12), 0 12px 32px rgba(30, 36, 48, 0.1);
          font-size: 13px; line-height: 1.5; display: flex; flex-direction: column;
        }
        .bill-paper.is-colour { --bill-accent: #1F3A93; --bill-rule: #1F3A93; --bill-head-bg: #E8EDFA; }
        .bill-head { text-align: center; padding-bottom: 14px; border-bottom: 2px solid var(--bill-rule); margin-bottom: 16px; }
        .bill-shop { font-size: 22px; font-weight: 700; font-stretch: 85%; color: var(--bill-accent); letter-spacing: 0.01em; }
        .bill-shop-sub { font-size: 12px; color: #333; }
        .bill-meta { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
        .bill-meta span { color: #555; margin-right: 4px; }
        .bill-table { width: 100%; border-collapse: collapse; }
        .bill-table th, .bill-table td { border: 1px solid var(--bill-rule); padding: 7px 9px; font-size: 12.5px; }
        .bill-table th { background: var(--bill-head-bg); color: var(--bill-accent); font-weight: 650; text-align: center; }
        .bill-table tfoot td { font-weight: 700; font-size: 14px; color: var(--bill-accent); }
        .bill-table tbody tr:hover { background: none; }
        .bill-blank { color: #aaa; }
        .bill-foot { margin-top: auto; padding-top: 18px; border-top: 1px dashed #bbb; text-align: center; font-size: 11.5px; color: #333; }
        .bill-signs { display: flex; justify-content: space-between; gap: 24px; padding-top: 48px; }
        .bill-signs div { flex: 1; max-width: 200px; border-top: 1px solid #111; padding-top: 6px; }

        @media (max-width: 1100px) {
          .bill-layout { grid-template-columns: 1fr; }
          .bill-stage { position: static; padding: 12px; }
          .bill-paper { padding: 24px 20px; aspect-ratio: auto; min-height: 520px; }
        }

        @media print {
          @page { size: A4 portrait; margin: 14mm; }
          body { background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          /* the app's scroll containers would clip or offset the sheet: let it flow from the top-left */
          html, body, #root, .app-layout, .main-content, .page-content, .page-inner, .bill-layout, .bill-stage {
            height: auto !important; overflow: visible !important; position: static !important;
            display: block !important; margin: 0 !important; padding: 0 !important; background: none !important;
          }
          .sidebar, .topbar, .bottom-nav, .no-print { display: none !important; }
          body * { visibility: hidden; }
          .print-target, .print-target * { visibility: visible; }
          .print-target {
            position: absolute; left: 0; top: 0; width: 100%; max-width: none;
            margin: 0; padding: 0; box-shadow: none; aspect-ratio: auto; min-height: calc(297mm - 28mm);
          }
        }
      `}</style>
    </Layout>
  );
}
