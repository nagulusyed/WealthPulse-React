import { useMemo } from 'react';
import useStore from '../../store/useStore';
import { CATEGORIES, getCategory } from '../../services/categories';
import { formatCurrency, formatMonthLabel, getMonthKey } from '../../utils/formatters';

export function ReportsView() {
  const transactions = useStore((s) => s.getMonthlyTransactions());
  const selectedMonth = useStore((s) => s.selectedMonth);
  const allTransactions = useStore((s) => s.transactions);
  const privacyMode = useStore((s) => s.privacyMode);

  const blur = privacyMode ? 'private-blur' : '';

  const report = useMemo(() => {
    const expenseTxns = transactions.filter((t) => t.type === 'expense');
    const incomeTxns = transactions.filter((t) => t.type === 'income');
    const totalSpent = expenseTxns.reduce((s, t) => s + t.amount, 0);
    const totalIncome = incomeTxns.reduce((s, t) => s + t.amount, 0);
    const netSavings = totalIncome - totalSpent;
    const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

    // Previous month comparison
    const pm = new Date(selectedMonth);
    pm.setMonth(pm.getMonth() - 1);
    const pmKey = getMonthKey(pm);
    const prevExpenses = allTransactions.filter((t) => t.date.startsWith(pmKey) && t.type === 'expense');
    const prevSpent = prevExpenses.reduce((s, t) => s + t.amount, 0);
    const diff = totalSpent - prevSpent;
    const pct = prevSpent > 0 ? Math.round((diff / prevSpent) * 100) : 0;

    // Category breakdown (expenses only)
    const catTotals = {};
    expenseTxns.forEach((t) => { catTotals[t.category] = (catTotals[t.category] || 0) + t.amount; });
    const sorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).map(([catId, amount]) => {
      const cat = getCategory('expense', catId);
      return { ...cat, amount, pct: totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0 };
    });

    const topCat = sorted[0];
    const daysInMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate();
    const avgDaily = totalSpent / daysInMonth;

    return { totalSpent, totalIncome, netSavings, savingsRate, diff, pct, categories: sorted, topCat, avgDaily, prevSpent };
  }, [transactions, selectedMonth, allTransactions]);

  return (
    <div className="animate-in" style={{ maxWidth: 700, margin: '0 auto' }}>
      <h2 className="view-title">Reports</h2>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>{formatMonthLabel(selectedMonth)}</p>

      {/* Summary */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: 1, minWidth: 130 }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Total Income</div>
          <div className={blur} style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--accent-green)', marginTop: '0.2rem' }}>{formatCurrency(report.totalIncome)}</div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: 130 }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Total Spent</div>
          <div className={blur} style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--accent-red)', marginTop: '0.2rem' }}>{formatCurrency(report.totalSpent)}</div>
          <div style={{ fontSize: '0.72rem', marginTop: '0.3rem', color: report.diff > 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
            {report.diff > 0 ? '↑' : '↓'} {Math.abs(report.pct)}% vs last month
          </div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: 130 }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Net Savings</div>
          <div className={blur} style={{ fontSize: '1.15rem', fontWeight: 700, color: report.netSavings >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', marginTop: '0.2rem' }}>{formatCurrency(Math.abs(report.netSavings))}</div>
          <div style={{ fontSize: '0.72rem', marginTop: '0.3rem', color: 'var(--text-muted)' }}>
            Savings rate: <strong style={{ color: report.savingsRate >= 30 ? 'var(--accent-green)' : report.savingsRate >= 0 ? 'var(--accent-yellow, #fbbf24)' : 'var(--accent-red)' }}>{report.savingsRate}%</strong>
          </div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: 130 }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Avg. Daily Spend</div>
          <div className={blur} style={{ fontSize: '1.15rem', fontWeight: 700, marginTop: '0.2rem' }}>{formatCurrency(Math.round(report.avgDaily))}</div>
        </div>
      </div>

      {/* Insight */}
      {report.topCat && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3 className="card-title">Insight</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Your biggest spending category this month is <strong style={{ color: report.topCat.color }}>{report.topCat.emoji} {report.topCat.name}</strong> at <strong className={blur}>{formatCurrency(report.topCat.amount)}</strong> ({report.topCat.pct}% of total spending).
          </p>
        </div>
      )}

      {/* Category Breakdown */}
      <div className="card">
        <h3 className="card-title">Spending by Category</h3>
        {report.categories.length === 0 ? (
          <p className="empty-text">No expenses this month.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {report.categories.map((cat) => (
              <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '1.25rem', width: 32, textAlign: 'center' }}>{cat.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{cat.name}</span>
                    <span className={blur} style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {formatCurrency(cat.amount)} <span style={{ color: '#fff', fontWeight: 600 }}>{cat.pct}%</span>
                    </span>
                  </div>
                  <div style={{ height: 4, background: 'var(--border-subtle)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${cat.pct}%`, background: cat.color, borderRadius: 2 }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
