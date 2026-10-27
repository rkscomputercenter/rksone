import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useTokens } from '../../hooks/useTokens';

const money = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 2 });

/** Sales and expenses for each day of the month. Loaded on demand: the charts library is the heaviest part of the app. */
export default function MonthBars({ data }: { data: Array<{ day: number; Sales: number; Expenses: number }> }) {
  const tokens = useTokens();
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} barGap={1} barCategoryGap="22%">
        <CartesianGrid vertical={false} stroke={tokens.ruleSoft} />
        <XAxis dataKey="day" stroke={tokens.muted} fontSize={12} tickLine={false} axisLine={{ stroke: tokens.rule }} interval="preserveStartEnd" />
        <YAxis stroke={tokens.muted} fontSize={12} tickLine={false} axisLine={false} width={56}
          tickFormatter={(v: number) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)} />
        <Tooltip cursor={{ fill: tokens.ruleSoft }}
          formatter={(v: number, name: string) => [`₹${money(v)}`, name]}
          labelFormatter={(d) => `Day ${d}`}
          contentStyle={{ background: tokens.sheet, border: `1px solid ${tokens.rule}`, borderRadius: 8, fontFamily: tokens.font, fontSize: 13 }}
          labelStyle={{ color: tokens.muted }} itemStyle={{ color: tokens.text }} />
        <Bar dataKey="Sales" fill={tokens.cash} radius={[3, 3, 0, 0]} />
        <Bar dataKey="Expenses" fill={tokens.stamp} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
