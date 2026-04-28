import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, Tooltip } from 'recharts';
import useStore from '../../store/useStore';
import { getMonthKey, formatCurrencyCompact } from '../../utils/formatters';

export function TrendBarChart({ selectedMonth, monthCount = 6 }) {
  const allTransactions = useStore((s) => s.transactions);

  const chartData = useMemo(() => {
    const months = [];
    for (let i = monthCount - 1; i >= 0; i--) {
      const d = new Date(selectedMonth);
      d.setMonth(d.getMonth() - i);
      months.push(d);
    }
    return months.map((m) => {
      const key = getMonthKey(m);
      const txns = allTransactions.filter((t) => t.date.startsWith(key));
      return {
        name: m.toLocaleDateString('en-US', { month: 'short' }),
        Income: txns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
        Expenses: txns.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
      };
    });
  }, [allTransactions, selectedMonth, monthCount]);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
        <XAxis dataKey="name" tick={{ fill: '#a0aec0', fontSize: 11, fontFamily: 'Inter' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#718096', fontSize: 10, fontFamily: 'Inter' }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCurrencyCompact(v)} width={50} />
        <Tooltip
          contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: '#a0aec0' }}
          itemStyle={{ color: '#fff' }}
          formatter={(v) => formatCurrencyCompact(v)}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#a0aec0', paddingTop: 8 }} />
        <Bar dataKey="Income" fill="#2ecc71" radius={[2, 2, 0, 0]} barSize={16} />
        <Bar dataKey="Expenses" fill="#e74c3c" radius={[2, 2, 0, 0]} barSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}
