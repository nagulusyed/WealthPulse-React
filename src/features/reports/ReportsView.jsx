import { useMemo } from 'react';
import useStore from '../../store/useStore';
import { CATEGORIES, getCategory } from '../../services/categories';
import { formatCurrency, formatMonthLabel, getMonthKey } from '../../utils/formatters';
import { isSettlementTxn } from '../../hooks/useYTDSavings';

export function ReportsView() {
  const transactions = useStore((s) => s.getMonthlyTransactions());
  const selectedMonth = useStore((s) => s.selectedMonth);
  const allTransactions = useStore((s) => s.transactions);
  const budgets = useStore((s) => s.budgets);
  const privacyMode = useStore((s) => s.privacyMode);

  const blur = privacyMode ? 'private-blur' : '';

  const report = useMemo(() => {
    // Fix #1: use the same clean aggregation as Dashboard — no per-row scaling
    const income = transactions
      .filter((t) => t.type === 'income' && !isSettlementTxn(t))
      .reduce((s, t) => s + t.amount, 0);

    const grossExpense = transactions
      .filter((t) => t.type === 'expense' && !isSettlementTxn(t))
      .reduce((s, t) => s + t.amount, 0);

    const settlementIncome = transactions
      .filter((t) => t.type === 'income' && isSettlementTxn(t))
      .reduce((s, t) => s + t.amount, 0);

    const sentSettlements = transactions
      .filter((t) => t.type === 'expense' && isSettlementTxn(t))
      .reduce((s, t) => s + t.amount, 0);

    const totalSpent = grossExpense - settlementIncome + sentSettlements;

    // Previous month — same clean logic
    const pm = new Date(selectedMonth);
    pm.setMonth(pm.getMonth() - 1);
    const pmKey = getMonthKey(pm);
    const prevTxns = allTransactions.filter((t) => t.date.startsWith(pmKey));

    const prevGross = prevTxns.filter((t) => t.type === 'expense' && !isSettlementTxn(t)).reduce((s, t) => s + t.amount, 0);
    const prevRecSet = prevTxns.filter((t) => t.type === 'income' && isSettlementTxn(t)).reduce((s, t) => s + t.amount, 0);
    const prevSentSet = prevTxns.filter((t) => t.type === 'expense' && isSettlementTxn(t)).reduce((s, t) => s + t.amount, 0);
    const prevSpent = prevGross - prevRecSet + prevSentSet;

    const diff = totalSpent - prevSpent;
    const pct = prevSpent > 0 ? Math.round((diff / prevSpent) * 100) : 0;

    const daysInMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate();
    const avgDaily = totalSpent / daysInMonth;

    // Category breakdown — raw non-settlement amounts only
    const catTotals = {};
    transactions
      .filter((t) => t.type === 'expense' && !isSettlementTxn(t))
      .forEach((t) => { catTotals[t.category] = (catTotals[t.category] || 0) + t.amount; });

    const sorted = Object.entries(catTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([catId, amount]) => {
        const cat = getCategory('expense', catId);
        const limit = budgets[catId] || 0;
        const budgetPct = limit > 0 ? Math.min(Math.round((amount / limit) * 100), 100) : 0;
        const spendPct = totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0;
        return { ...cat, amount, pct: budgetPct, spendPct, limit };
      });

    const topCat = sorted[0];
    return { totalSpent, totalIncome: income, diff, pct, categories: sorted, topCat, avgDaily, prevSpent };
  }, [transactions, selectedMonth, allTransactions, budgets]);

  return (
    <div className="animate-in" style={{ maxWidth: 700, margin: '0 auto' }}>
      <h2 className="view-title">Reports</h2>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>{formatMonthLabel(selectedMonth)}</p>

      {/* Summary */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: 1, minWidth: 140 }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Total Spent</div>
          <div className={blur} style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-red)', marginTop: '0.2rem' }}>{formatCurrency(report.totalSpent)}</div>
          <div style={{ fontSize: '0.72rem', marginTop: '0.3rem', color: report.diff > 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
            {report.diff > 0 ? '↑' : '↓'} {Math.abs(report.pct)}% vs last month
          </div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: 140 }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Avg. Daily</div>
          <div className={blur} style={{ fontSize: '1.25rem', fontWeight: 700, marginTop: '0.2rem' }}>{formatCurrency(Math.round(report.avgDaily))}</div>
        </div>
      </div>

      {/* Insight */}
      {report.topCat && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3 className="card-title">Insight</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Your biggest spending category this month is{' '}
            <strong style={{ color: report.topCat.color }}>{report.topCat.emoji} {report.topCat.name}</strong>{' '}
            at <strong className={blur}>{formatCurrency(report.topCat.amount)}</strong>{' '}
            ({report.topCat.spendPct}% of total spending).
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
                      {formatCurrency(cat.amount)}{cat.pct > 0 && <span style={{ color: '#fff', fontWeight: 600 }}> {cat.pct}%</span>}
                    </span>
                  </div>
                  <div style={{ height: 4, background: 'var(--border-subtle)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${cat.spendPct}%`, background: cat.color, borderRadius: 2 }} />
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
