import { useMemo } from 'react';
import useStore from '../../store/useStore';
import { CATEGORIES } from '../../services/categories';
import { formatCurrency, formatMonthLabel } from '../../utils/formatters';
import './BudgetView.css';

export function BudgetView() {
  const transactions = useStore((s) => s.getMonthlyTransactions());
  const budgets = useStore((s) => s.budgets);
  const setBudgetLimit = useStore((s) => s.setBudgetLimit);
  const selectedMonth = useStore((s) => s.selectedMonth);
  const prevMonth = useStore((s) => s.prevMonth);
  const nextMonth = useStore((s) => s.nextMonth);
  const privacyMode = useStore((s) => s.privacyMode);

  const budgetData = useMemo(() => {
    return CATEGORIES.expense.map((cat) => {
      const spent = transactions.filter((t) => t.type === 'expense' && t.category === cat.id).reduce((s, t) => s + t.amount, 0);
      const limit = budgets[cat.id] || 0;
      const pct = limit > 0 ? Math.min(Math.round((spent / limit) * 100), 100) : 0;
      const status = pct >= 90 ? 'danger' : pct >= 70 ? 'warning' : 'safe';
      return { ...cat, spent, limit, pct, status };
    });
  }, [transactions, budgets]);

  const hasAnyBudget = budgetData.some((b) => b.limit > 0);

  const handleEditLimit = (cat) => {
    const newLimit = prompt(`Set monthly budget for ${cat.name} (₹):`, cat.limit || '');
    if (newLimit !== null && !isNaN(parseFloat(newLimit)) && parseFloat(newLimit) >= 0) {
      setBudgetLimit(cat.id, parseFloat(newLimit));
    }
  };

  const blur = privacyMode ? 'private-blur' : '';

  return (
    <div className="budget-view animate-in">
      <h2 className="view-title">Budgets</h2>

      <div className="month-nav" style={{ marginBottom: '1.25rem' }}>
        <button className="month-arrow" onClick={prevMonth}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <span className="month-label">{formatMonthLabel(selectedMonth)}</span>
        <button className="month-arrow" onClick={nextMonth}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
        </button>
      </div>

      {/* Nudge for fresh users */}
      {!hasAnyBudget && (
        <div className="budget-empty-nudge">
          <div className="budget-nudge-icon">🎯</div>
          <p className="budget-nudge-title">Set monthly spending limits</p>
          <p className="budget-nudge-sub">
            Tap any category below to set a limit. WealthPulse will alert you before you overspend.
          </p>
        </div>
      )}

      <div className="budget-grid">
        {budgetData.map((cat) => (
          <div
            key={cat.id}
            className={`budget-card ${cat.limit === 0 ? 'budget-card-unset' : ''}`}
            onClick={() => handleEditLimit(cat)}
          >
            <div className="budget-header">
              <span className="budget-emoji">{cat.emoji}</span>
              <div>
                <div className="budget-cat-name">{cat.name}</div>
                {cat.limit > 0
                  ? <div className={`budget-amounts ${blur}`}>{formatCurrency(cat.spent)} of {formatCurrency(cat.limit)}</div>
                  : <div className="budget-unset-label">Tap to set limit</div>
                }
              </div>
            </div>
            {cat.limit > 0 && (
              <>
                <div className="budget-bar-bg">
                  <div className={`budget-bar-fill ${cat.status}`} style={{ width: `${cat.pct}%` }} />
                </div>
                <div className="budget-footer">
                  <span className={`budget-percent ${cat.status}`}>{cat.pct}% used</span>
                  <button className="budget-edit-btn" onClick={(e) => { e.stopPropagation(); handleEditLimit(cat); }}>Edit</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
