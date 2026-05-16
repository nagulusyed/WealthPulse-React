import { useMemo, useState } from 'react';
import useStore from '../../store/useStore';
import { CATEGORIES } from '../../services/categories';
import { formatCurrency, formatMonthLabel, getMonthKey } from '../../utils/formatters';
import { isSettlementTxn } from '../../hooks/useYTDSavings';
import './BudgetView.css';

export function BudgetView() {
  const allTransactions = useStore((s) => s.transactions);
  const budgets         = useStore((s) => s.budgets);
  const setBudgetLimit  = useStore((s) => s.setBudgetLimit);
  const selectedMonth   = useStore((s) => s.selectedMonth);
  const prevMonth       = useStore((s) => s.prevMonth);
  const nextMonth       = useStore((s) => s.nextMonth);
  const privacyMode     = useStore((s) => s.privacyMode);

  // Fix: reactive month filtering — same pattern as Dashboard
  const transactions = useMemo(() => {
    const key = getMonthKey(selectedMonth);
    return allTransactions.filter((t) => t.date.startsWith(key));
  }, [allTransactions, selectedMonth]);

  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [showAll, setShowAll]     = useState(false);

  // Days remaining in selected month (for context on budget cards)
  const daysInfo = useMemo(() => {
    const now = new Date();
    const yr = selectedMonth.getFullYear();
    const mo = selectedMonth.getMonth();
    const isCurrentMonth = yr === now.getFullYear() && mo === now.getMonth();
    const daysInMonth = new Date(yr, mo + 1, 0).getDate();
    const daysLeft = isCurrentMonth ? daysInMonth - now.getDate() : null;
    return { isCurrentMonth, daysLeft, daysInMonth };
  }, [selectedMonth]);

  const prevMonthSpend = useMemo(() => {
    const d = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1);
    const key = getMonthKey(d);
    const map = {};
    allTransactions
      .filter((t) => t.date.startsWith(key) && t.type === 'expense' && !isSettlementTxn(t))
      .forEach((t) => { map[t.category] = (map[t.category] || 0) + t.amount; });
    return map;
  }, [selectedMonth, allTransactions]);

  const budgetData = useMemo(() => {
    return CATEGORIES.expense.map((cat) => {
      const spent = transactions
        .filter((t) => t.type === 'expense' && t.category === cat.id && !isSettlementTxn(t))
        .reduce((s, t) => s + t.amount, 0);
      const limit     = budgets[cat.id] || 0;
      const pct       = limit > 0 ? Math.min(Math.round((spent / limit) * 100), 100) : 0;
      const overspend = limit > 0 && spent > limit ? spent - limit : 0;
      const status    = pct >= 100 ? 'danger' : pct >= 70 ? 'warning' : 'safe';
      const prevSpent   = prevMonthSpend[cat.id] || 0;
      const vsLastMonth = prevSpent > 0 ? Math.round(((spent - prevSpent) / prevSpent) * 100) : null;
      // Daily pace: if current month, how much per day at current burn vs budget
      const safeDaily = daysInfo.isCurrentMonth && daysInfo.daysLeft > 0 && limit > 0
        ? Math.round((limit - spent) / daysInfo.daysLeft)
        : null;
      return { ...cat, spent, limit, pct, status, overspend, prevSpent, vsLastMonth, safeDaily };
    });
  }, [transactions, budgets, prevMonthSpend, daysInfo]);

  const active   = budgetData.filter((c) => c.spent > 0 || c.limit > 0);
  const inactive = budgetData.filter((c) => c.spent === 0 && c.limit === 0);
  const displayed = showAll ? budgetData : active;

  const totalBudgeted = budgetData.reduce((s, c) => s + c.limit, 0);
  const totalSpent    = budgetData.reduce((s, c) => s + c.spent, 0);
  const overallPct    = totalBudgeted > 0 ? Math.min(Math.round((totalSpent / totalBudgeted) * 100), 100) : 0;

  const startEdit = (cat) => {
    setEditingId(cat.id);
    // Show empty string so user can type fresh; placeholder shows current
    setEditValue(cat.limit > 0 ? String(cat.limit) : '');
  };

  const commitEdit = (catId) => {
    const raw = editValue.trim();
    // Allow clearing the budget — empty string or 0 resets to 0
    const val = raw === '' ? 0 : parseFloat(raw);
    if (!isNaN(val) && val >= 0) setBudgetLimit(catId, val);
    setEditingId(null);
    setEditValue('');
  };

  const handleKeyDown = (e, catId) => {
    if (e.key === 'Enter') commitEdit(catId);
    if (e.key === 'Escape') { setEditingId(null); setEditValue(''); }
  };

  const blur = privacyMode ? 'private-blur' : '';

  return (
    <div className="budget-view animate-in">
      <h2 className="view-title">Budgets</h2>

      <div className="month-nav" style={{ marginBottom: '1.25rem' }}>
        <button className="month-arrow" onClick={prevMonth}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <span className="month-label">{formatMonthLabel(selectedMonth)}</span>
        <button className="month-arrow" onClick={nextMonth}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>

      {totalBudgeted > 0 && (
        <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Overall Budget</span>
            <span className={blur} style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {formatCurrency(totalSpent)} / {formatCurrency(totalBudgeted)}
            </span>
          </div>
          <div className="budget-bar-bg">
            <div className={`budget-bar-fill ${overallPct >= 90 ? 'danger' : overallPct >= 70 ? 'warning' : 'safe'}`} style={{ width: `${overallPct}%` }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            <span>{overallPct}% used · {formatCurrency(Math.max(0, totalBudgeted - totalSpent))} remaining</span>
            {daysInfo.isCurrentMonth && daysInfo.daysLeft !== null && (
              <span>{daysInfo.daysLeft} days left</span>
            )}
          </div>
        </div>
      )}

      <div className="budget-grid">
        {displayed.map((cat) => (
          <div key={cat.id} className="budget-card">
            <div className="budget-header">
              <span className="budget-emoji">{cat.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="budget-cat-name">{cat.name}</div>
                {editingId === cat.id ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>₹</span>
                    <input
                      type="number" autoFocus value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => commitEdit(cat.id)}
                      onKeyDown={(e) => handleKeyDown(e, cat.id)}
                      placeholder={cat.limit > 0 ? String(cat.limit) : 'Set limit (0 to clear)'}
                      style={{ width: 110, padding: '0.2rem 0.4rem', background: 'var(--bg-input)', border: '1.5px solid var(--accent-indigo)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.82rem', outline: 'none' }}
                    />
                    <button onClick={() => commitEdit(cat.id)} style={{ fontSize: '0.72rem', color: 'var(--accent-green)', fontWeight: 700, padding: '0 4px' }}>✓</button>
                  </div>
                ) : (
                  <div className={`budget-amounts ${blur}`} onClick={() => startEdit(cat)} style={{ cursor: 'pointer' }} title="Tap to edit limit">
                    {formatCurrency(cat.spent)} of{' '}
                    <span style={{ color: cat.limit === 0 ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                      {cat.limit > 0 ? formatCurrency(cat.limit) : 'No limit — tap to set'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="budget-bar-bg">
              <div className={`budget-bar-fill ${cat.status}`} style={{ width: `${cat.pct}%` }} />
            </div>

            <div className="budget-footer">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span className={`budget-percent ${cat.status}`}>
                  {cat.overspend > 0
                    ? <span className={blur}>Over by {formatCurrency(cat.overspend)} ⚠️</span>
                    : cat.limit > 0 ? `${cat.pct}% used` : 'No limit'}
                </span>
                {/* Days remaining context — only show for current month with a limit set */}
                {cat.safeDaily !== null && cat.limit > 0 && cat.overspend === 0 && (
                  <span className={blur} style={{ fontSize: '0.68rem', color: cat.safeDaily > 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                    {cat.safeDaily > 0
                      ? `₹${cat.safeDaily}/day safe · ${daysInfo.daysLeft}d left`
                      : `No budget left · ${daysInfo.daysLeft}d left`}
                  </span>
                )}
                {cat.vsLastMonth !== null && cat.safeDaily === null && (
                  <span className={blur} style={{ fontSize: '0.68rem', color: cat.vsLastMonth > 0 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                    {cat.vsLastMonth > 0 ? `↑${cat.vsLastMonth}%` : `↓${Math.abs(cat.vsLastMonth)}%`} vs last month
                  </span>
                )}
              </div>
              <button className="budget-edit-btn" onClick={() => startEdit(cat)}>
                {editingId === cat.id ? 'editing...' : cat.limit > 0 ? 'Edit' : '+ Set limit'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Toggle unused categories — fixed border style */}
      {inactive.length > 0 && (
        <button
          onClick={() => setShowAll((v) => !v)}
          style={{
            display: 'block', width: '100%', marginTop: '1rem',
            padding: '0.6rem', textAlign: 'center',
            fontSize: '0.8rem', fontWeight: 600,
            color: 'var(--text-muted)',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
          }}
        >
          {showAll ? `Hide ${inactive.length} unused categories ↑` : `Show ${inactive.length} more categories ↓`}
        </button>
      )}
    </div>
  );
}
