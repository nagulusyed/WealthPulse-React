import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { getCategory } from '../../services/categories';
import { formatCurrency } from '../../utils/formatters';

export function CategoryDoughnut({ transactions }) {
  const chartData = useMemo(() => {
    const expenses = transactions.filter((t) => t.type === 'expense');
    const catData = {};
    let total = 0;
    expenses.forEach((t) => {
      catData[t.category] = (catData[t.category] || 0) + t.amount;
      total += t.amount;
    });
    return Object.entries(catData)
      .map(([catId, amount]) => {
        const cat = getCategory('expense', catId);
        return { name: cat.name, value: amount, color: cat.color, emoji: cat.emoji, pct: total > 0 ? Math.round((amount / total) * 100) : 0 };
      })
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  if (chartData.length === 0) {
    return <p className="empty-text">No expenses this month</p>;
  }

  const total = chartData.reduce((s, d) => s + d.value, 0);

  return (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ width: 140, height: 140, position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chartData} dataKey="value" cx="50%" cy="50%" innerRadius={48} outerRadius={65} paddingAngle={2} stroke="none">
              {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Total</span>
          <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{formatCurrency(total)}</span>
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 150, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {chartData.slice(0, 5).map((d) => (
          <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
              <span style={{ color: '#fff', fontWeight: 500 }}>{d.name}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>{formatCurrency(d.value)}</span>
              <span style={{ color: '#fff', fontWeight: 600, width: 30, textAlign: 'right' }}>{d.pct}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
