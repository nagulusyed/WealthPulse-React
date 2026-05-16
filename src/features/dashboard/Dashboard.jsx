import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../../store/useStore';
import { CATEGORIES, getCategory } from '../../services/categories';
import { formatCurrency, formatMonthLabel, formatDate, getMonthKey } from '../../utils/formatters';
import { getGreeting } from '../../utils/helpers';
import { CategoryDoughnut } from '../../components/charts/CategoryDoughnut';
import { TrendBarChart } from '../../components/charts/TrendBarChart';
import { useYTDSavings, isSettlementTxn } from '../../hooks/useYTDSavings';
import { EmptyState } from '../../components/EmptyState';
import { hapticLight } from '../../utils/haptics';
import './Dashboard.css';

export function Dashboard({ onAddTransaction }) {
  const allTransactions = useStore((s) => s.transactions);
  const selectedMonth   = useStore((s) => s.selectedMonth);
  const transactions    = useMemo(() => {
    const key = getMonthKey(selectedMonth);
    return allTransactions.filter((t) => t.date.startsWith(key));
  }, [allTransactions, selectedMonth]);
  const prevMonth       = useStore((s) => s.prevMonth);
  const nextMonth       = useStore((s) => s.nextMonth);
  const privacyMode     = useStore((s) => s.privacyMode);
  const budgets         = useStore((s) => s.budgets);
  const groups          = useStore((s) => s.groups);
  const groupExpenses   = useStore((s) => s.groupExpenses);
  const people          = useStore((s) => s.people);
  const savingsTarget   = useStore((s) => s.savingsTarget); // Fix #12
  const navigate        = useNavigate();
  const ytdSavings      = useYTDSavings();

  const summary = useMemo(() => {
    const income = transactions.filter((t) => t.type === 'income' && !isSettlementTxn(t)).reduce((s, t) => s + t.amount, 0);
    const grossExpense = transactions.filter((t) => t.type === 'expense' && !isSettlementTxn(t)).reduce((s, t) => s + t.amount, 0);
    const settlementIncome = transactions.filter((t) => t.type === 'income' && isSettlementTxn(t)).reduce((s, t) => s + t.amount, 0);
    const sentSettlements = transactions.filter((t) => t.type === 'expense' && isSettlementTxn(t)).reduce((s, t) => s + t.amount, 0);
    const expenses = grossExpense - settlementIncome + sentSettlements;
    const balance = income - expenses;
    const savingsRate = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;
    const incomeSources = new Set(transactions.filter((t) => t.type === 'income' && !isSettlementTxn(t)).map((t) => t.category)).size;
    const expenseCategories = new Set(transactions.filter((t) => t.type === 'expense' && !isSettlementTxn(t)).map((t) => t.category)).size;
    return { income, expenses, balance, savingsRate, incomeSources, expenseCategories };
  }, [transactions]);

  const prevMonthData = useMemo(() => {
    const d = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1);
    const key = getMonthKey(d);
    const prevTxns    = allTransactions.filter((t) => t.date.startsWith(key));
    const prevIncome  = prevTxns.filter((t) => t.type === 'income'  && !isSettlementTxn(t)).reduce((s, t) => s + t.amount, 0);
    const prevGross   = prevTxns.filter((t) => t.type === 'expense' && !isSettlementTxn(t)).reduce((s, t) => s + t.amount, 0);
    const prevSetInc  = prevTxns.filter((t) => t.type === 'income'  &&  isSettlementTxn(t)).reduce((s, t) => s + t.amount, 0);
    const prevSetExp  = prevTxns.filter((t) => t.type === 'expense' &&  isSettlementTxn(t)).reduce((s, t) => s + t.amount, 0);
    const prevExpenses = prevGross - prevSetInc + prevSetExp;
    return { income: prevIncome, expenses: prevExpenses, balance: prevIncome - prevExpenses, hasData: prevTxns.length > 0 };
  }, [selectedMonth, allTransactions]);

  const trend = summary.balance - prevMonthData.balance;
  const recentTxns = [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  const budgetData = useMemo(() => {
    return CATEGORIES.expense
      .map((cat) => {
        const spent = transactions.filter((t) => t.type === 'expense' && !isSettlementTxn(t) && t.category === cat.id).reduce((s, t) => s + t.amount, 0);
        const limit = budgets[cat.id] || 0;
        const pct = limit > 0 ? Math.min(Math.round((spent / limit) * 100), 100) : 0;
        return { ...cat, spent, limit, pct };
      })
      .filter((b) => b.limit > 0)
      .sort((a, b) => b.pct - a.pct);
  }, [transactions, budgets]);

  const groupsData = useMemo(() => {
    const store = useStore.getState();
    return groups.map((g) => ({ ...g, balance: store.getPersonBalanceInGroup('self', g.id) }));
  }, [groups, groupExpenses]);

  const globalBalance = useMemo(() => useStore.getState().getGlobalBalance('self'), [groups, groupExpenses]);

  const mySettlements = useMemo(() => {
    const all = useStore.getState().getAllSettlements();
    return all.filter((t) => t.from === 'self' || t.to === 'self');
  }, [groups, groupExpenses]);

  const insight = useMemo(() => {
    const expenses = transactions.filter((t) => t.type === 'expense' && !isSettlementTxn(t));
    if (expenses.length === 0) return null;
    const catTotals = {};
    expenses.forEach((t) => { catTotals[t.category] = (catTotals[t.category] || 0) + t.amount; });
    const sorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) return null;
    const [topCatId, topCatAmount] = sorted[0];
    const cat = getCategory('expense', topCatId);
    const pm = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1);
    const pmKey = getMonthKey(pm);
    const prevCatSpend = allTransactions.filter((t) => t.date.startsWith(pmKey) && t.type === 'expense' && t.category === topCatId && !isSettlementTxn(t)).reduce((s, t) => s + t.amount, 0);
    if (prevCatSpend > 0) {
      const diff = topCatAmount - prevCatSpend;
      const pct = Math.round(Math.abs(diff / prevCatSpend) * 100);
      return diff > 0 ? `You spent ${pct}% more on ${cat.name} compared to last month.` : `You spent ${pct}% less on ${cat.name} compared to last month.`;
    }
    return `Your top spending category this month is ${cat.name} at ${formatCurrency(topCatAmount)}.`;
  }, [transactions, selectedMonth, allTransactions]);

  const blur = privacyMode ? 'private-blur' : '';
  const getPersonById = (id) => people.find((p) => p.id === id);

  const goToGroup = async (groupId) => {
    await hapticLight();
    navigate('/groups', { state: { openGroupId: groupId } });
  };

  // Fix #12: savings rate color based on user-set target
  const savingsRateColor = summary.savingsRate >= savingsTarget
    ? 'var(--accent-green)'
    : summary.savingsRate >= savingsTarget * 0.7
    ? 'var(--text-primary)'
    : 'var(--accent-red)';

  return (
    <div className="dashboard animate-in">
      <div className="month-nav glass">
        <button className="month-arrow" onClick={prevMonth}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <span className="month-label">{formatMonthLabel(selectedMonth)}</span>
        <button className="month-arrow" onClick={nextMonth}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
        </button>
      </div>

      <p className="greeting">{getGreeting()}, here's your overview.</p>

      <div className="summary-grid">
        <div className="summary-card animate-bounce">
          <div className="card-label">Total Balance</div>
          <div className={`card-amount ${blur}`}>{formatCurrency(summary.balance)}</div>
          {prevMonthData.hasData && (
            <div className={`card-trend ${trend >= 0 ? 'positive' : 'negative'}`}>
              {trend >= 0 ? '↑' : '↓'} {formatCurrency(Math.abs(trend))} vs last month
            </div>
          )}
        </div>
        <div className="summary-card animate-bounce">
          <div className="card-label">Total Income</div>
          <div className={`card-amount income ${blur}`}>{formatCurrency(summary.income)}</div>
          <div className="card-sub">from {summary.incomeSources} source{summary.incomeSources !== 1 ? 's' : ''}</div>
        </div>
        <div className="summary-card animate-bounce">
          <div className="card-label">Total Expenses</div>
          <div className={`card-amount expense ${blur}`}>{formatCurrency(summary.expenses)}</div>
          <div className="card-sub">in {summary.expenseCategories} categor{summary.expenseCategories !== 1 ? 'ies' : 'y'}</div>
        </div>
        {/* Fix #12: color based on savingsTarget, show actual target */}
        <div className="summary-card animate-bounce">
          <div className="card-label">Savings Rate</div>
          <div className={`card-amount ${blur}`} style={{ color: savingsRateColor }}>{summary.savingsRate}%</div>
          <div className="card-sub">Target: {savingsTarget}%</div>
        </div>
        <div className="summary-card animate-bounce">
          <div className="card-label">Yearly Savings (YTD)</div>
          <div className={`card-amount ${blur}`} style={{ color: ytdSavings.savingsRate > 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            {ytdSavings.savingsRate}%
          </div>
          <div className="card-sub">{formatCurrency(ytdSavings.savings)} saved in {ytdSavings.year}</div>
        </div>
      </div>

      <div className="dashboard-middle">
        <div className="chart-card animate-bounce" style={{ flex: 2 }}>
          <h3 className="card-title">Cash Flow Overview</h3>
          <TrendBarChart selectedMonth={selectedMonth} />
        </div>
        <div className="chart-card animate-bounce" style={{ flex: 1 }}>
          <h3 className="card-title">Spending by Category</h3>
          <CategoryDoughnut transactions={transactions.filter((t) => !isSettlementTxn(t))} />
          <button className="view-link" onClick={() => navigate('/insights')}>View full report →</button>
        </div>
        <div className="dash-right-col">
          <div className="chart-card animate-bounce">
            <h3 className="card-title">Quick Actions</h3>
            <div className="qa-grid">
              <button className="qa-btn" onClick={() => onAddTransaction?.('expense')}><span className="qa-icon expense">−</span><span>Expense</span></button>
              <button className="qa-btn" onClick={() => onAddTransaction?.('income')}><span className="qa-icon income">+</span><span>Income</span></button>
              <button className="qa-btn" onClick={() => navigate('/settle-up')}><span className="qa-icon settle">⇄</span><span>Settle Up</span></button>
              <button className="qa-btn" onClick={() => navigate('/groups')}><span className="qa-icon split">✂</span><span>Split Bill</span></button>
            </div>
          </div>
          {insight && (
            <div className="chart-card animate-bounce">
              <h3 className="card-title" style={{ color: 'var(--text-muted)' }}>Insight</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{insight}</p>
              <button className="view-link" onClick={() => navigate('/insights')}>View details →</button>
            </div>
          )}
        </div>
      </div>

      <div className="dashboard-bottom">
        <div className="card">
          <div className="card-header-split">
            <h3 className="card-title">My Groups</h3>
            <button className="view-link" onClick={() => navigate('/groups')}>View all</button>
          </div>
          <div className="dash-groups-balance">
            <span className="card-sub">Net balance</span>
            <span className={`card-amount ${blur}`} style={{ fontSize: '1.1rem', color: globalBalance > 0.01 ? 'var(--accent-green)' : globalBalance < -0.01 ? 'var(--accent-red)' : 'var(--text-primary)' }}>
              {globalBalance < 0 ? '-' : ''}{formatCurrency(Math.abs(globalBalance))}
            </span>
          </div>
          {groupsData.length === 0 ? (
            <EmptyState icon="👥" title="No groups" text="Start a group to split bills with friends." />
          ) : (
            <div className="txn-list">
              {groupsData.slice(0, 3).map((g) => (
                <div key={g.id} className="txn-item" style={{ cursor: 'pointer' }} onClick={() => goToGroup(g.id)}>
                  <div className="group-icon-sm">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                  </div>
                  <div className="txn-details">
                    <div className="txn-desc">{g.name}</div>
                    <div className="txn-meta">{g.memberIds.length} members</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <div className={`txn-amount ${g.balance > 0.01 ? 'income' : g.balance < -0.01 ? 'expense' : ''} ${blur}`} style={{ fontSize: '0.8rem' }}>
                      {g.balance > 0.01 ? `+${formatCurrency(g.balance)}` : g.balance < -0.01 ? `-${formatCurrency(Math.abs(g.balance))}` : 'Settled'}
                    </div>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" style={{ opacity: 0.5 }}>
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header-split">
            <h3 className="card-title">Recent Transactions</h3>
            <button className="view-link" onClick={() => navigate('/transactions')}>View all</button>
          </div>
          {recentTxns.length === 0 ? (
            <EmptyState icon="💸" title="No activity" text="Your recent transactions will appear here." />
          ) : (
            <div className="txn-list">
              {recentTxns.map((t) => {
                const cat = getCategory(t.type, t.category);
                return (
                  <div key={t.id} className="txn-item" onClick={() => onAddTransaction?.(t.type, t)}>
                    <div className="txn-icon" style={{ background: cat.color + '15', color: cat.color }}>{cat.emoji}</div>
                    <div className="txn-details">
                      <div className="txn-desc">{t.description}</div>
                      <div className="txn-meta">{cat.name} · {formatDate(t.date)}</div>
                    </div>
                    <div className={`txn-amount ${t.type} ${blur}`}>
                      {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header-split">
            <h3 className="card-title">Pending Settlements</h3>
            <button className="view-link" onClick={() => navigate('/settle-up')}>Settle up</button>
          </div>
          {mySettlements.length === 0 ? (
            <EmptyState icon="✅" title="All settled" text="You have no pending debts or receivables." />
          ) : (
            <div className="txn-list">
              {mySettlements.slice(0, 4).map((t, i) => {
                const fromP = getPersonById(t.from);
                const toP   = getPersonById(t.to);
                const g     = groups.find((gr) => gr.id === t.groupId);
                const isYouOwe = t.from === 'self';
                return (
                  <div key={i} className="txn-item" onClick={() => navigate('/settle-up')}>
                    <div className="avatar-sm" style={{ background: (isYouOwe ? toP : fromP)?.color || '#888' }}>
                      {(isYouOwe ? toP : fromP)?.initials || '?'}
                    </div>
                    <div className="txn-details">
                      <div className="txn-desc">{isYouOwe ? `You owe ${toP?.name}` : `${fromP?.name} owes you`}</div>
                      <div className="txn-meta">{g?.name}</div>
                    </div>
                    <div className={`txn-amount ${isYouOwe ? 'expense' : 'income'} ${blur}`} style={{ fontSize: '0.8rem' }}>
                      {formatCurrency(t.amount)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header-split">
            <h3 className="card-title">Budget Status</h3>
            <button className="view-link" onClick={() => navigate('/budgets')}>View all</button>
          </div>
          {budgetData.length === 0 ? (
            <EmptyState icon="📊" title="No budgets" text="Set a budget to track your spending limits." />
          ) : (
            budgetData.slice(0, 4).map((cat) => (
              <div key={cat.id} className="budget-mini-item">
                <div className="budget-mini-header">
                  <span className="budget-mini-name"><span className="budget-mini-emoji">{cat.emoji}</span> {cat.name}</span>
                  <span className={`budget-mini-vals ${blur}`}>{formatCurrency(cat.spent)} / {formatCurrency(cat.limit)} <strong>{cat.pct}%</strong></span>
                </div>
                <div className="budget-mini-bar">
                  <div className={`budget-mini-fill ${cat.pct >= 90 ? 'danger' : cat.pct >= 75 ? 'warning' : 'safe'}`} style={{ width: `${cat.pct}%` }} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
