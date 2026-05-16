import { useState, useMemo } from 'react';
import { useInsights } from '../../hooks/useInsights';
import { formatCurrency, formatMonthLabel, getMonthKey } from '../../utils/formatters';
import { getCategory } from '../../services/categories';
import useStore from '../../store/useStore';
import { isSettlementTxn } from '../../hooks/useYTDSavings';

function TabPill({ label, emoji, active, onClick, badge }) {
  return (
    <button onClick={onClick} style={{ display:'flex', alignItems:'center', gap:'0.3rem', padding:'0.42rem 0.75rem', borderRadius:'var(--radius-full)', border: active ? '1.5px solid var(--accent-primary)' : '1.5px solid var(--border-subtle)', background: active ? 'rgba(59,130,246,0.12)' : 'transparent', color: active ? 'var(--accent-primary)' : 'var(--text-secondary)', fontSize:'0.75rem', fontWeight: active ? 600 : 400, cursor:'pointer', whiteSpace:'nowrap', flexShrink:0, transition:'all var(--transition-fast)' }}>
      <span>{emoji}</span>{label}
      {badge > 0 && <span style={{ background:'var(--accent-error)', color:'#fff', borderRadius:'999px', fontSize:'0.6rem', fontWeight:700, padding:'0 4px', minWidth:15, height:15, display:'flex', alignItems:'center', justifyContent:'center', marginLeft:2 }}>{badge}</span>}
    </button>
  );
}

function EmptyState({ emoji, message }) {
  return (
    <div style={{ textAlign:'center', padding:'2.5rem 1rem', color:'var(--text-muted)' }}>
      <div style={{ fontSize:'2.5rem', marginBottom:'0.5rem' }}>{emoji}</div>
      <p style={{ fontSize:'0.85rem', lineHeight:1.5 }}>{message}</p>
    </div>
  );
}

function InsightCard({ children, accent, style = {} }) {
  return <div className="card" style={{ marginBottom:'0.85rem', borderLeft: accent ? `3px solid ${accent}` : undefined, padding:'0.9rem 1rem', ...style }}>{children}</div>;
}

// ── Tab 1: Monthly Report ──────────────────────────────────────
function MonthlyTab({ privacyMode }) {
  const blur = privacyMode ? 'private-blur' : '';
  const transactions = useStore((s) => s.getMonthlyTransactions());
  const selectedMonth = useStore((s) => s.selectedMonth);
  const allTransactions = useStore((s) => s.transactions);
  const budgets = useStore((s) => s.budgets);

  const report = useMemo(() => {
    const income = transactions.filter((t) => t.type === 'income' && !isSettlementTxn(t)).reduce((s, t) => s + t.amount, 0);
    const grossExpense = transactions.filter((t) => t.type === 'expense' && !isSettlementTxn(t)).reduce((s, t) => s + t.amount, 0);
    const settlementIncome = transactions.filter((t) => t.type === 'income' && isSettlementTxn(t)).reduce((s, t) => s + t.amount, 0);
    const sentSettlements = transactions.filter((t) => t.type === 'expense' && isSettlementTxn(t)).reduce((s, t) => s + t.amount, 0);
    const totalSpent = grossExpense - settlementIncome + sentSettlements;
    const savings = income - totalSpent;
    const savingsPct = income > 0 ? Math.round((savings / income) * 100) : 0;

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

    const catTotals = {};
    transactions.filter((t) => t.type === 'expense' && !isSettlementTxn(t)).forEach((t) => { catTotals[t.category] = (catTotals[t.category] || 0) + t.amount; });
    const categories = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).map(([catId, amount]) => {
      const cat = getCategory('expense', catId);
      const limit = budgets[catId] || 0;
      const budgetPct = limit > 0 ? Math.min(Math.round((amount / limit) * 100), 100) : 0;
      const spendPct = totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0;
      return { ...cat, amount, budgetPct, spendPct, limit };
    });

    return { totalSpent, totalIncome: income, savings, savingsPct, diff, pct, avgDaily, categories, topCat: categories[0] };
  }, [transactions, selectedMonth, allTransactions, budgets]);

  if (transactions.length === 0) return <EmptyState emoji="📊" message="No transactions this month. Start adding expenses to see your monthly report." />;

  return (
    <div>
      <div style={{ display:'flex', gap:'0.6rem', marginBottom:'0.85rem', flexWrap:'wrap' }}>
        {[
          { label:'Total Spent', value: formatCurrency(report.totalSpent), color:'var(--accent-red)', sub: `${report.diff > 0 ? '↑' : '↓'} ${Math.abs(report.pct)}% vs last month`, subColor: report.diff > 0 ? 'var(--accent-red)' : 'var(--accent-green)' },
          { label:'Income', value: formatCurrency(report.totalIncome), color:'var(--accent-green)', sub:`Avg. ${formatCurrency(Math.round(report.avgDaily))}/day`, subColor:'var(--text-muted)' },
          { label:'Saved', value: formatCurrency(Math.abs(report.savings)), color: report.savings >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', sub:`${report.savingsPct}% of income`, subColor:'var(--text-muted)' },
        ].map((s) => (
          <div key={s.label} className="card" style={{ flex:'1 1 0', minWidth:0 }}>
            <div style={{ fontSize:'0.7rem', color:'var(--text-muted)' }}>{s.label}</div>
            <div className={blur} style={{ fontSize:'1.15rem', fontWeight:700, color:s.color, marginTop:'0.15rem' }}>{s.value}</div>
            <div style={{ fontSize:'0.7rem', marginTop:'0.25rem', color:s.subColor }}>{s.sub}</div>
          </div>
        ))}
      </div>
      {report.topCat && (
        <InsightCard accent={report.topCat.color}>
          <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginBottom:'0.3rem' }}>💡 Top Spend This Month</div>
          <p style={{ fontSize:'0.85rem', color:'var(--text-secondary)', lineHeight:1.6 }}>
            <strong style={{ color:report.topCat.color }}>{report.topCat.emoji} {report.topCat.name}</strong>{' '}accounts for{' '}
            <strong className={blur}>{formatCurrency(report.topCat.amount)}</strong>{' '}({report.topCat.spendPct}% of total spending).
          </p>
        </InsightCard>
      )}
      <div className="card">
        <div style={{ fontWeight:600, fontSize:'0.85rem', marginBottom:'0.85rem' }}>Spending by Category</div>
        <div style={{ display:'flex', flexDirection:'column', gap:'0.8rem' }}>
          {report.categories.map((cat) => (
            <div key={cat.id} style={{ display:'flex', alignItems:'center', gap:'0.75rem', minWidth:0 }}>
              <span style={{ fontSize:'1.15rem', width:28, textAlign:'center', flexShrink:0 }}>{cat.emoji}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.2rem', gap:'0.5rem' }}>
                  <span style={{ fontSize:'0.82rem', fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{cat.name}</span>
                  <span className={blur} style={{ fontSize:'0.78rem', color:'var(--text-muted)', flexShrink:0 }}>
                    {formatCurrency(cat.amount)}{cat.budgetPct > 0 && <span style={{ color: cat.budgetPct >= 100 ? 'var(--accent-red)' : 'var(--text-primary)', fontWeight:600 }}> {cat.budgetPct}%</span>}
                  </span>
                </div>
                <div style={{ height:4, background:'var(--border-subtle)', borderRadius:2, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${cat.spendPct}%`, background:cat.color, borderRadius:2, transition:'width 0.5s ease' }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tab 2: Vendor Recognition ──────────────────────────────────
function VendorTab({ vendors, privacyMode }) {
  const blur = privacyMode ? 'private-blur' : '';
  if (vendors.length === 0) return <EmptyState emoji="🔍" message="We need at least 2 transactions from the same merchant to recognize patterns. Keep adding transactions!" />;
  return (
    <div>
      <p style={{ fontSize:'0.78rem', color:'var(--text-muted)', marginBottom:'1rem', lineHeight:1.5 }}>Top merchants by total spend across all your transactions.</p>
      {vendors.map((v, i) => (
        <InsightCard key={v.key} accent={v.cat.color}>
          <div style={{ display:'flex', alignItems:'center', gap:'0.7rem', minWidth:0 }}>
            <div style={{ width:36, height:36, borderRadius:'50%', background:`${v.cat.color}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1rem', flexShrink:0 }}>{v.cat.emoji}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:'0.5rem' }}>
                <span style={{ fontWeight:600, fontSize:'0.88rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', textTransform:'capitalize' }}>{v.displayName}</span>
                <span className={blur} style={{ fontWeight:700, fontSize:'0.9rem', color:'var(--accent-red)', flexShrink:0 }}>{formatCurrency(v.total)}</span>
              </div>
              <div style={{ display:'flex', gap:'0.6rem', marginTop:'0.25rem', fontSize:'0.72rem', color:'var(--text-muted)', flexWrap:'wrap' }}>
                <span>{v.count} txn{v.count !== 1 ? 's' : ''}</span><span>·</span>
                <span style={{ color:v.cat.color }}>{v.cat.name}</span>
                {v.pctOfIncome !== null && <><span>·</span><span className={blur}>{v.pctOfIncome}% of income</span></>}
              </div>
            </div>
          </div>
          {i === 0 && <div style={{ marginTop:'0.6rem', padding:'0.3rem 0.6rem', background:'rgba(248,113,113,0.1)', borderRadius:'var(--radius-sm)', fontSize:'0.73rem', color:'#f87171', display:'inline-block' }}>🏆 Top merchant — consider reviewing this spend</div>}
        </InsightCard>
      ))}
    </div>
  );
}

// ── Tab 3: Burn Rate Forecast ─────────────────────────────────
function BurnRateTab({ burnRate, privacyMode }) {
  const blur = privacyMode ? 'private-blur' : '';
  if (!burnRate) return <EmptyState emoji="📈" message="Burn rate is only available for the current month with at least 3 days of data." />;
  const { spentSoFar, dailyBurn, projectedTotal, totalBudget, budgetLeft, safeDaily, daysLeft, dayOfMonth, daysInMonth, exhaustDate, isOnTrack, overageAmount } = burnRate;
  const progressPct = Math.min(Math.round((spentSoFar / totalBudget) * 100), 100);
  const projectedPct = Math.min(Math.round((projectedTotal / totalBudget) * 100), 100);
  const exhaustDateStr = exhaustDate ? exhaustDate.toLocaleDateString('en-IN', { day:'numeric', month:'short' }) : null;
  return (
    <div>
      <InsightCard accent={isOnTrack ? '#2ecc71' : '#e74c3c'}>
        <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', marginBottom:'0.75rem' }}>
          <span style={{ fontSize:'1.3rem', flexShrink:0 }}>{isOnTrack ? '✅' : '⚠️'}</span>
          <div style={{ minWidth:0 }}>
            <div style={{ fontWeight:700, fontSize:'0.9rem' }}>{isOnTrack ? "You're on track!" : 'Budget overage projected'}</div>
            <div style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>Day {dayOfMonth} of {daysInMonth} — {daysLeft} days left</div>
          </div>
        </div>
        <div style={{ marginBottom:'0.5rem' }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.7rem', color:'var(--text-muted)', marginBottom:'0.25rem' }}><span>Spent so far</span><span className={blur}>{formatCurrency(spentSoFar)} / {formatCurrency(totalBudget)}</span></div>
          <div style={{ height:6, background:'var(--border-subtle)', borderRadius:3, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${progressPct}%`, background: progressPct > 80 ? '#e74c3c' : progressPct > 60 ? '#f59e0b' : '#2ecc71', borderRadius:3, transition:'width 0.6s ease' }} />
          </div>
        </div>
        {!isOnTrack && (
          <div style={{ marginTop:'0.6rem' }}>
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.7rem', color:'var(--text-muted)', marginBottom:'0.25rem' }}><span>Projected month-end</span><span className={blur} style={{ color:'#e74c3c' }}>{formatCurrency(projectedTotal)}</span></div>
            <div style={{ height:6, background:'var(--border-subtle)', borderRadius:3, overflow:'hidden' }}><div style={{ height:'100%', width:`${Math.min(projectedPct,100)}%`, background:'rgba(231,76,60,0.5)', borderRadius:3 }} /></div>
          </div>
        )}
      </InsightCard>
      <div style={{ display:'flex', gap:'0.6rem', marginBottom:'0.85rem' }}>
        {[{ label:'Daily Burn', value:`${formatCurrency(dailyBurn)}/day`, color:'var(--accent-red)' }, { label:'Safe Limit', value:`${formatCurrency(safeDaily)}/day`, color:'var(--accent-green)' }, { label:'Budget Left', value:formatCurrency(Math.abs(budgetLeft)), color: budgetLeft > 0 ? 'var(--accent-green)' : 'var(--accent-red)' }].map((s) => (
          <div key={s.label} className="card" style={{ flex:'1 1 0', minWidth:0, padding:'0.65rem 0.75rem' }}>
            <div style={{ fontSize:'0.67rem', color:'var(--text-muted)', marginBottom:'0.15rem' }}>{s.label}</div>
            <div className={blur} style={{ fontSize:'0.88rem', fontWeight:700, color:s.color, wordBreak:'break-word' }}>{s.value}</div>
          </div>
        ))}
      </div>
      <InsightCard accent="var(--accent-indigo)">
        <div style={{ fontSize:'0.83rem', lineHeight:1.65, color:'var(--text-secondary)' }}>
          {isOnTrack
            ? <>Great discipline! At <span className={blur} style={{ fontWeight:600, color:'var(--text-primary)' }}>{formatCurrency(dailyBurn)}/day</span>, you'll finish within budget. You can spend up to <span className={blur} style={{ fontWeight:600, color:'var(--accent-green)' }}>{formatCurrency(safeDaily)}/day</span>.</>
            : <>At <span className={blur} style={{ fontWeight:600, color:'var(--accent-red)' }}>{formatCurrency(dailyBurn)}/day</span>, you'll overshoot by <span className={blur} style={{ fontWeight:600, color:'var(--accent-red)' }}>{formatCurrency(overageAmount)}</span>.{exhaustDateStr && <> Budget runs out around <strong>{exhaustDateStr}</strong>.</>} Stay under <span className={blur} style={{ fontWeight:600, color:'var(--accent-green)' }}>{formatCurrency(safeDaily)}/day</span> for the remaining {daysLeft} days.</>
          }
        </div>
      </InsightCard>
    </div>
  );
}

// ── Tab 4: Anomaly Detection ───────────────────────────────────
function AnomalyTab({ anomalies, privacyMode }) {
  const blur = privacyMode ? 'private-blur' : '';
  if (anomalies.length === 0) return <EmptyState emoji="📉" message="No anomalies detected. Spending patterns look consistent. Needs 2–3 months of history." />;
  const typeConfig = { spike:{ icon:'🔺', color:'#e74c3c', label:'Spike', bg:'rgba(231,76,60,0.1)' }, drop:{ icon:'🔻', color:'#f59e0b', label:'Drop', bg:'rgba(245,158,11,0.1)' }, missing:{ icon:'❓', color:'#a78bfa', label:'Missing', bg:'rgba(167,139,250,0.1)' } };
  return (
    <div>
      <p style={{ fontSize:'0.78rem', color:'var(--text-muted)', marginBottom:'1rem', lineHeight:1.5 }}>vs your 3-month rolling average per category.</p>
      {anomalies.map((a) => {
        const cfg = typeConfig[a.type];
        return (
          <InsightCard key={a.catId} accent={cfg.color}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:'0.7rem', minWidth:0 }}>
              <div style={{ width:36, height:36, borderRadius:'50%', background:cfg.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1rem', flexShrink:0 }}>{a.cat.emoji}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'0.3rem' }}>
                  <span style={{ fontWeight:600, fontSize:'0.88rem' }}>{a.cat.name}</span>
                  <span style={{ background:cfg.bg, color:cfg.color, fontSize:'0.7rem', fontWeight:700, padding:'0.12rem 0.45rem', borderRadius:'var(--radius-full)', flexShrink:0 }}>{cfg.icon} {cfg.label}</span>
                </div>
                <div style={{ display:'flex', gap:'1rem', marginTop:'0.45rem', flexWrap:'wrap' }}>
                  {[{ label:'This month', value:formatCurrency(a.currentAmount), color: a.type==='spike' ? cfg.color : undefined }, { label:'3-mo avg', value:formatCurrency(a.avg) }, { label:'Change', value: a.type==='missing' ? '—' : `${a.pctChange > 0 ? '+' : ''}${a.pctChange}%`, color:cfg.color }].map((s) => (
                    <div key={s.label}><div style={{ fontSize:'0.67rem', color:'var(--text-muted)' }}>{s.label}</div><div className={blur} style={{ fontWeight:700, fontSize:'0.9rem', color:s.color }}>{s.value}</div></div>
                  ))}
                </div>
                <div style={{ marginTop:'0.6rem', padding:'0.4rem 0.6rem', background:cfg.bg, borderRadius:'var(--radius-sm)', fontSize:'0.73rem', color:cfg.color, lineHeight:1.5 }}>
                  {a.type==='spike' && <><strong>{a.cat.name}</strong> is <strong>{a.pctChange}% above</strong> your average — extra <span className={blur}>{formatCurrency(a.excess)}</span> this month.</>}
                  {a.type==='drop' && <><strong>{a.cat.name}</strong> dropped <strong>{Math.abs(a.pctChange)}%</strong> — intentional savings or deferred expense?</>}
                  {a.type==='missing' && <>No <strong>{a.cat.name}</strong> logged. You typically spend <span className={blur}>{formatCurrency(a.avg)}</span>. Did you miss a transaction?</>}
                </div>
              </div>
            </div>
          </InsightCard>
        );
      })}
    </div>
  );
}

// ── Tab 5: Subscription Audit ─────────────────────────────────
function SubscriptionsTab({ subscriptions, yearlyTotal, privacyMode }) {
  const blur = privacyMode ? 'private-blur' : '';
  const monthlyTotal = subscriptions.reduce((s, sub) => s + sub.amount, 0);
  if (subscriptions.length === 0) return <EmptyState emoji="📆" message="No recurring subscriptions detected yet. We scan for same-amount transactions repeating monthly." />;
  const freqLabel = { monthly:'/mo', 'bi-weekly':'/2wk', weekly:'/wk' };
  return (
    <div>
      <div className="card" style={{ marginBottom:'0.85rem', background:'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.08) 100%)', border:'1.5px solid rgba(99,102,241,0.2)', padding:'0.9rem 1rem' }}>
        <div style={{ fontSize:'0.72rem', color:'var(--text-muted)', marginBottom:'0.3rem' }}>📆 {subscriptions.length} active subscription{subscriptions.length !== 1 ? 's' : ''} detected</div>
        <div style={{ display:'flex', gap:'1.5rem', flexWrap:'wrap' }}>
          <div><div style={{ fontSize:'0.7rem', color:'var(--text-muted)' }}>Monthly</div><div className={blur} style={{ fontSize:'1.15rem', fontWeight:700, color:'var(--accent-indigo)' }}>{formatCurrency(monthlyTotal)}</div></div>
          <div><div style={{ fontSize:'0.7rem', color:'var(--text-muted)' }}>Yearly estimate</div><div className={blur} style={{ fontSize:'1.15rem', fontWeight:700, color:'var(--accent-violet)' }}>{formatCurrency(yearlyTotal)}</div></div>
        </div>
      </div>
      {subscriptions.map((sub) => (
        <InsightCard key={sub.key} accent={sub.cat.color}>
          <div style={{ display:'flex', alignItems:'center', gap:'0.7rem', minWidth:0 }}>
            <div style={{ width:36, height:36, borderRadius:'50%', background:`${sub.cat.color}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1rem', flexShrink:0 }}>{sub.cat.emoji}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:'0.5rem' }}>
                <span style={{ fontWeight:600, fontSize:'0.88rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', textTransform:'capitalize' }}>{sub.displayName}</span>
                <div style={{ flexShrink:0, textAlign:'right' }}><span className={blur} style={{ fontWeight:700, fontSize:'0.9rem' }}>{formatCurrency(sub.amount)}</span><span style={{ fontSize:'0.67rem', color:'var(--text-muted)' }}>{freqLabel[sub.frequency] || '/mo'}</span></div>
              </div>
              <div style={{ display:'flex', gap:'0.5rem', marginTop:'0.25rem', fontSize:'0.7rem', color:'var(--text-muted)', flexWrap:'wrap' }}>
                <span>{sub.cat.name}</span><span>·</span><span>{sub.occurrences}× found</span><span>·</span><span className={blur} style={{ color:'var(--accent-violet)' }}>{formatCurrency(sub.yearlyEstimate)}/yr</span>
              </div>
            </div>
          </div>
        </InsightCard>
      ))}
      <div style={{ padding:'0.7rem 0.85rem', background:'rgba(245,158,11,0.08)', borderRadius:'var(--radius-md)', border:'1px solid rgba(245,158,11,0.15)', fontSize:'0.77rem', color:'#f59e0b', lineHeight:1.6 }}>
        💡 <strong>Tip:</strong> Review subscriptions annually. Cancelling one unused service saves <span className={blur}>{formatCurrency(subscriptions[0]?.yearlyEstimate || 0)}</span>/year.
      </div>
    </div>
  );
}

// ── Main InsightsView ─────────────────────────────────────────
export function InsightsView() {
  const [activeTab, setActiveTab] = useState('monthly');
  const privacyMode = useStore((s) => s.privacyMode);
  const selectedMonth = useStore((s) => s.selectedMonth);
  // Fix #6: wire up month navigation
  const prevMonth = useStore((s) => s.prevMonth);
  const nextMonth = useStore((s) => s.nextMonth);

  const { vendors, burnRate, anomalies, subscriptions, subscriptionYearlyTotal, hasData } = useInsights();

  const tabs = [
    { id:'monthly',       label:'Monthly',       emoji:'📊', badge:0 },
    { id:'vendors',       label:'Vendors',        emoji:'🔍', badge:0 },
    { id:'burnrate',      label:'Forecast',       emoji:'📈', badge:0 },
    { id:'anomalies',     label:'Alerts',         emoji:'📉', badge:anomalies.length },
    { id:'subscriptions', label:'Subscriptions',  emoji:'📆', badge:subscriptions.length },
  ];

  return (
    <div className="animate-in" style={{ maxWidth:700, margin:'0 auto' }}>
      <h2 className="view-title">Reports & Insights</h2>

      {/* Fix #6: Month navigation — same as Dashboard and BudgetView */}
      <div className="month-nav" style={{ marginBottom: '1rem' }}>
        <button className="month-arrow" onClick={prevMonth}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <span className="month-label">{formatMonthLabel(selectedMonth)}</span>
        <button className="month-arrow" onClick={nextMonth}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>

      {!hasData ? (
        <div className="card" style={{ textAlign:'center', padding:'3rem 1rem' }}>
          <div style={{ fontSize:'3rem', marginBottom:'0.75rem' }}>🌱</div>
          <h3 style={{ marginBottom:'0.5rem' }}>No data yet</h3>
          <p style={{ fontSize:'0.85rem', color:'var(--text-muted)', lineHeight:1.6 }}>Add some transactions and this page will come to life.</p>
        </div>
      ) : (
        <>
          <div style={{ display:'flex', gap:'0.45rem', overflowX:'auto', paddingBottom:'0.5rem', marginBottom:'1rem', scrollbarWidth:'none', msOverflowStyle:'none', WebkitOverflowScrolling:'touch' }}>
            {tabs.map((tab) => <TabPill key={tab.id} label={tab.label} emoji={tab.emoji} active={activeTab === tab.id} badge={tab.badge} onClick={() => setActiveTab(tab.id)} />)}
          </div>
          {activeTab === 'monthly'       && <MonthlyTab privacyMode={privacyMode} />}
          {activeTab === 'vendors'       && <VendorTab vendors={vendors} privacyMode={privacyMode} />}
          {activeTab === 'burnrate'      && <BurnRateTab burnRate={burnRate} privacyMode={privacyMode} />}
          {activeTab === 'anomalies'     && <AnomalyTab anomalies={anomalies} privacyMode={privacyMode} />}
          {activeTab === 'subscriptions' && <SubscriptionsTab subscriptions={subscriptions} yearlyTotal={subscriptionYearlyTotal} privacyMode={privacyMode} />}
        </>
      )}
    </div>
  );
}
