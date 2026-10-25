import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTokens } from '../../hooks/useTokens';
import { money } from '../sales/SalesLedger';
import type { DailyAnalytics, MonthlyAnalytics } from '../../types';

type Totals = Pick<DailyAnalytics, 'income' | 'computerCash' | 'computerOnline' | 'xeroxCash' | 'xeroxOnline' | 'otherIncome' | 'shopXeroxDirect' | 'expenses' | 'profit' | 'transactionCount'>;

export function DayLine({ t, period }: { t: Totals; period: string }) {
  return (
    <div className="dayline">
      <div className="dayline-cell" style={{ '--cell-color': 'var(--cash)' } as React.CSSProperties}>
        <div className="dayline-label">Sales</div>
        <div className="dayline-value"><span className="cur">₹</span>{money(t.income)}</div>
        <div className="dayline-sub">{t.transactionCount} entries {period}</div>
      </div>
      <div className="dayline-cell" style={{ '--cell-color': 'var(--stamp)' } as React.CSSProperties}>
        <div className="dayline-label">Expenses</div>
        <div className="dayline-value"><span className="cur">₹</span>{money(t.expenses)}</div>
        <div className="dayline-sub">Approved only</div>
      </div>
      <div className="dayline-cell" style={{ '--cell-color': 'var(--info)' } as React.CSSProperties}>
        <div className="dayline-label">Cash share</div>
        <div className="dayline-value">{t.income ? Math.round(((t.computerCash + t.xeroxCash + t.shopXeroxDirect) / t.income) * 100) : 0}<span className="cur" style={{ marginLeft: 2 }}>%</span></div>
        <div className="dayline-sub">of sales paid in cash</div>
      </div>
      <div className="dayline-cell net" style={{ '--cell-color': 'var(--ink)' } as React.CSSProperties}>
        <div className="dayline-label">Net</div>
        <div className="dayline-value" style={{ color: t.profit < 0 ? 'var(--stamp)' : undefined }}><span className="cur">₹</span>{money(t.profit)}</div>
        <div className="dayline-sub">{t.profit < 0 ? 'Spent more than sold' : 'Sales minus expenses'}</div>
      </div>
    </div>
  );
}

/** Where the money came in: shop by payment method, as a ruled table. */
export function Split({ t, shop }: { t: Totals; shop: string }) {
  const rows = [
    { name: 'Computer shop', cash: t.computerCash, online: t.computerOnline, show: shop !== 'SHOP_XEROX' },
    { name: 'Xerox shop', cash: t.xeroxCash, online: t.xeroxOnline, show: shop !== 'SHOP_COMPUTER' },
    { name: 'Xerox counter (cash)', cash: t.shopXeroxDirect, online: 0, show: shop !== 'SHOP_COMPUTER' },
    { name: 'Paid another way', cash: 0, online: 0, other: t.otherIncome, show: t.otherIncome > 0 },
  ].filter(r => r.show);
  const sum = (k: 'cash' | 'online') => rows.reduce((s, r) => s + r[k], 0);
  return (
    <section className="table-wrapper" aria-labelledby="split-title">
      <div style={{ padding: '14px 16px 10px' }}><h2 id="split-title" className="card-title">Where the money came in</h2></div>
      <table>
        <thead><tr><th>Counter</th><th className="amount">Cash</th><th className="amount">Online</th><th className="amount">Total</th></tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.name}>
              <td>{r.name}</td>
              <td className="amount">{r.cash ? `₹${money(r.cash)}` : ''}</td>
              <td className="amount">{r.online ? `₹${money(r.online)}` : ''}</td>
              <td className="amount" style={{ fontWeight: 600 }}>₹{money(r.cash + r.online + (r.other ?? 0))}</td>
            </tr>
          ))}
          <tr style={{ background: 'var(--sheet-2)' }}>
            <td style={{ fontWeight: 650 }}>All</td>
            <td className="amount" style={{ fontWeight: 650 }}>₹{money(sum('cash'))}</td>
            <td className="amount" style={{ fontWeight: 650 }}>₹{money(sum('online'))}</td>
            <td className="amount" style={{ fontWeight: 700 }}>₹{money(t.income)}</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}

/** Month as daily bars: cash, online and other stacked as money in, expenses beside them. */
export function MonthChart({ monthly }: { monthly: MonthlyAnalytics }) {
  const tokens = useTokens();
  const chartTip = {
    contentStyle: { background: tokens.sheet, border: `1px solid ${tokens.rule}`, borderRadius: 8, fontFamily: tokens.font, fontSize: 13 },
    labelStyle: { color: tokens.muted }, itemStyle: { color: tokens.text },
  };
  if (monthly.daily.length === 0) return <div className="empty-state" style={{ padding: 24 }}>No sales this month yet.</div>;
  return (
      <div style={{ height: 300, marginLeft: -12 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthly.daily.map(d => ({
                      day: Number(d.date.slice(8)),
                      Cash: d.computerCash + d.xeroxCash + d.shopXeroxDirect,
                      Online: d.computerOnline + d.xeroxOnline,
                      Other: d.otherIncome,
                      Expenses: d.expenses,
                    }))} barGap={1}>
                      <CartesianGrid vertical={false} stroke={tokens.ruleSoft} />
                      <XAxis dataKey="day" stroke={tokens.muted} fontSize={12} tickLine={false} axisLine={{ stroke: tokens.rule }} />
                      <YAxis stroke={tokens.muted} fontSize={12} tickLine={false} axisLine={false} width={52} tickFormatter={(v: number) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)} />
                      <Tooltip {...chartTip} cursor={{ fill: tokens.ruleSoft }} labelFormatter={d => `Day ${d}`} formatter={(v: number, n: string) => [`₹${money(v)}`, n]} />
                      <Legend wrapperStyle={{ fontSize: 12, color: tokens.muted }} iconType="square" />
                      <Bar dataKey="Cash" stackId="in" fill={tokens.cash} />
                      <Bar dataKey="Online" stackId="in" fill={tokens.info} />
                      <Bar dataKey="Other" stackId="in" fill={tokens.pending} radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Expenses" fill={tokens.stamp} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
  );
}
