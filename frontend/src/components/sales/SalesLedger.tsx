import React, { useState } from 'react';
import type { Transaction } from '../../types';

export const PAY_LABEL: Record<string, string> = { CASH: 'Cash', ONLINE: 'Online', OTHER: 'Other', SHOP_XEROX: 'Xerox counter' };
export const CAT_LABEL: Record<string, string> = { GOVT: 'Government', PRINTING: 'Printing', CARDS: 'Cards', OTHER: 'Other' };
const SHOP_LABEL: Record<string, string> = { SHOP_COMPUTER: 'Computer', SHOP_XEROX: 'Xerox' };

export const istDate = (d: string | Date = new Date()) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
export const isTodayIST = (iso: string) => istDate(iso) === istDate();
export const money = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const time = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });

interface Props {
  transactions: Transaction[];
  canDelete: (t: Transaction) => boolean;
  onDelete: (id: string) => Promise<void>;
  showShop?: boolean;
}

/** Sales as ledger lines: a table on wide screens, stacked rows on phones. Delete asks once, inline. */
export default function SalesLedger({ transactions, canDelete, onDelete, showShop }: Props) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const remove = async (id: string) => {
    setBusyId(id);
    try { await onDelete(id); } finally { setBusyId(null); setConfirmId(null); }
  };

  const actions = (t: Transaction) => {
    if (!canDelete(t)) return <span className="text-xs text-muted">Locked</span>;
    if (confirmId === t.id) {
      return (
        <span className="flex gap-8" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-danger btn-sm" disabled={busyId === t.id} onClick={() => remove(t.id)}>
            {busyId === t.id ? 'Deleting' : 'Delete sale'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setConfirmId(null)}>Keep</button>
        </span>
      );
    }
    return <button className="btn btn-ghost btn-sm" onClick={() => setConfirmId(t.id)}>Delete</button>;
  };

  return (
    <>
      <div className="table-wrapper hide-mobile">
        <table>
          <thead>
            <tr>
              <th>Time</th><th>Service</th><th>Paid by</th>{showShop && <th>Shop</th>}
              <th className="amount">Qty</th><th className="amount">Price</th><th className="amount">Total</th>
              <th>Entered by</th><th className="amount"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(t => (
              <tr key={t.id}>
                <td className="text-muted">{time(t.createdAt)}</td>
                <td>
                  <div style={{ fontWeight: 600 }}>{t.service?.name}</div>
                  <div className="text-xs text-muted">{CAT_LABEL[t.service?.category] ?? t.service?.category}{t.notes ? `, ${t.notes}` : ''}</div>
                </td>
                <td>{PAY_LABEL[t.paymentMethod] ?? t.paymentMethod}</td>
                {showShop && <td>{SHOP_LABEL[t.shop ?? 'SHOP_COMPUTER']}</td>}
                <td className="amount">{t.quantity}</td>
                <td className="amount text-muted">₹{money(Number(t.unitPrice))}</td>
                <td className="amount" style={{ fontWeight: 650, color: 'var(--cash)' }}>₹{money(Number(t.totalPrice))}</td>
                <td className="text-muted">{t.user?.name}</td>
                <td className="amount">{actions(t)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card hide-desktop" style={{ padding: '4px 14px' }}>
        <div className="ledger">
          {transactions.map(t => (
            <div key={t.id} className="ledger-row">
              <div className="ledger-main">{t.service?.name}{t.quantity > 1 ? ` × ${t.quantity}` : ''}</div>
              <div className="ledger-amt amt-in">₹{money(Number(t.totalPrice))}</div>
              <div className="ledger-meta">
                <span>{time(t.createdAt)}</span>
                <span>{PAY_LABEL[t.paymentMethod] ?? t.paymentMethod}</span>
                {showShop && <span>{SHOP_LABEL[t.shop ?? 'SHOP_COMPUTER']}</span>}
                <span>{t.user?.name}</span>
              </div>
              {t.notes && <div className="text-xs text-muted" style={{ gridColumn: '1 / -1' }}>{t.notes}</div>}
              {canDelete(t) && <div style={{ gridColumn: '1 / -1', paddingTop: 4 }}>{actions(t)}</div>}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
