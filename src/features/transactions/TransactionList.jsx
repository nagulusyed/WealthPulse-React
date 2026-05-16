import { useState, useMemo, useRef, useEffect } from 'react';
import useStore from '../../store/useStore';
import { getCategory, CATEGORIES } from '../../services/categories';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { TransactionForm } from './TransactionForm';
import { EmptyState } from '../../components/EmptyState';
import { hapticLight, hapticHeavy } from '../../utils/haptics';
import { isSettlementTxn } from '../../hooks/useYTDSavings';
import './TransactionList.css';

// Fix #7: swipe hint shown only once
const SWIPE_HINT_KEY = 'wp_swipe_hint_shown';

function SwipeableRow({ children, onDelete }) {
  const startXRef   = useRef(null);
  const currentXRef = useRef(0);
  const rowRef      = useRef(null);
  const [swiped, setSwiped]     = useState(false);
  const [deleting, setDeleting] = useState(false);
  const THRESHOLD = 80;

  const handleTouchStart = (e) => {
    startXRef.current = e.touches[0].clientX;
    currentXRef.current = 0;
  };

  const handleTouchMove = (e) => {
    if (startXRef.current === null) return;
    const diff = e.touches[0].clientX - startXRef.current;
    if (diff > 0 && !swiped) return;
    currentXRef.current = Math.max(diff, -120);
    if (rowRef.current) {
      rowRef.current.style.transform = `translateX(${swiped ? currentXRef.current - THRESHOLD : currentXRef.current}px)`;
      rowRef.current.style.transition = 'none';
    }
  };

  const handleTouchEnd = () => {
    if (!rowRef.current) return;
    rowRef.current.style.transition = 'transform 0.2s ease';
    const moved = Math.abs(currentXRef.current);
    if (!swiped && moved > THRESHOLD) {
      rowRef.current.style.transform = `translateX(-${THRESHOLD}px)`;
      setSwiped(true);
      hapticLight();
      localStorage.setItem(SWIPE_HINT_KEY, '1');
    } else if (swiped && moved < THRESHOLD / 2) {
      rowRef.current.style.transform = 'translateX(0)';
      setSwiped(false);
    } else if (!swiped) {
      rowRef.current.style.transform = 'translateX(0)';
    }
    startXRef.current = null;
  };

  const handleDelete = async () => {
    setDeleting(true);
    await hapticHeavy();
    if (rowRef.current) {
      rowRef.current.style.transition = 'all 0.25s ease';
      rowRef.current.style.transform = 'translateX(-100%)';
      rowRef.current.style.opacity = '0';
    }
    setTimeout(onDelete, 220);
  };

  const resetSwipe = () => {
    if (rowRef.current) {
      rowRef.current.style.transition = 'transform 0.2s ease';
      rowRef.current.style.transform = 'translateX(0)';
    }
    setSwiped(false);
  };

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius-md)' }}>
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: THRESHOLD,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--accent-red)',
        borderRadius: '0 var(--radius-md) var(--radius-md) 0',
      }}>
        <button onClick={handleDelete} disabled={deleting}
          style={{ color: '#fff', background: 'none', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
          Delete
        </button>
      </div>
      <div ref={rowRef} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
        onClick={swiped ? resetSwipe : undefined}
        style={{ background: 'var(--bg-card)', position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}

export function TransactionList() {
  const transactions      = useStore((s) => s.transactions);
  const deleteTransaction = useStore((s) => s.deleteTransaction);
  const privacyMode       = useStore((s) => s.privacyMode);

  const [typeFilter, setTypeFilter]         = useState('all'); // 'all' | 'income' | 'expense' | 'settlement'
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch]                 = useState('');
  const [editingTxn, setEditingTxn]         = useState(null);
  const [showForm, setShowForm]             = useState(false);
  const [defaultType, setDefaultType]       = useState('expense');
  // Fix #7: swipe hint visibility
  const [showSwipeHint, setShowSwipeHint]   = useState(() => !localStorage.getItem(SWIPE_HINT_KEY));

  // Auto-dismiss swipe hint after 4s
  useEffect(() => {
    if (!showSwipeHint) return;
    const t = setTimeout(() => setShowSwipeHint(false), 4000);
    return () => clearTimeout(t);
  }, [showSwipeHint]);

  const filtered = useMemo(() => {
    let list = [...transactions];
    if (typeFilter === 'settlement') {
      list = list.filter((t) => isSettlementTxn(t));
    } else if (typeFilter !== 'all') {
      list = list.filter((t) => t.type === typeFilter && !isSettlementTxn(t));
    }
    if (categoryFilter !== 'all') list = list.filter((t) => t.category === categoryFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) =>
        t.description.toLowerCase().includes(q) ||
        getCategory(t.type, t.category).name.toLowerCase().includes(q) ||
        (t.notes && t.notes.toLowerCase().includes(q))
      );
    }
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, typeFilter, categoryFilter, search]);

  const availableCategories = useMemo(() => {
    const cats = new Set(transactions.map((t) => t.category));
    return [...CATEGORIES.expense, ...CATEGORIES.income].filter((c) => cats.has(c.id));
  }, [transactions]);

  // Running totals for the filtered view
  const filteredTotals = useMemo(() => {
    if (typeFilter === 'settlement') return null; // settlements aren't income/expense
    const income  = filtered.filter((t) => t.type === 'income'  && !isSettlementTxn(t)).reduce((s, t) => s + t.amount, 0);
    const expense = filtered.filter((t) => t.type === 'expense' && !isSettlementTxn(t)).reduce((s, t) => s + t.amount, 0);
    return { income, expense };
  }, [filtered, typeFilter]);

  const blur = privacyMode ? 'private-blur' : '';

  const openForm = async (type = 'expense', txn = null) => {
    await hapticLight();
    setDefaultType(type);
    setEditingTxn(txn);
    setShowForm(true);
  };

  const clearFilters = () => { setTypeFilter('all'); setCategoryFilter('all'); setSearch(''); };
  const hasActiveFilters = typeFilter !== 'all' || categoryFilter !== 'all' || search.trim();

  return (
    <div className="transactions-view animate-in">
      <div className="txn-header">
        <h2 className="view-title">Transactions</h2>
        <button className="btn btn-primary" onClick={() => openForm()}>+ Add</button>
      </div>

      {/* Fix #7: one-time swipe hint */}
      {showSwipeHint && transactions.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.55rem 0.9rem', marginBottom: '0.75rem',
          background: 'rgba(99,102,241,0.08)',
          border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.78rem', color: 'var(--text-secondary)',
        }}>
          <span>←</span>
          <span>Swipe left on a transaction to delete it</span>
          <button onClick={() => { setShowSwipeHint(false); localStorage.setItem(SWIPE_HINT_KEY, '1'); }}
            style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.85rem' }}>✕</button>
        </div>
      )}

      <div className="search-bar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input type="text" placeholder="Search transactions..." value={search} onChange={(e) => setSearch(e.target.value)} className="search-input" />
        {search && <button onClick={() => setSearch('')} style={{ color: 'var(--text-muted)', padding: '0 4px', fontSize: '1rem' }}>×</button>}
      </div>

      <div className="filter-tabs">
        {[['all','All'],['income','Income'],['expense','Expenses'],['settlement','Settlements']].map(([f, label]) => (
          <button key={f} className={`filter-tab ${typeFilter === f ? 'active' : ''}`}
            onClick={() => { setTypeFilter(f); setCategoryFilter('all'); }}>
            {label}
          </button>
        ))}
      </div>

      {/* Filtered totals summary bar */}
      {filteredTotals && filtered.length > 0 && (
        <div style={{ display: 'flex', gap: '1rem', padding: '0.5rem 0.75rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', marginBottom: '0.5rem', fontSize: '0.78rem', alignItems: 'center' }}>
          {(typeFilter === 'all' || typeFilter === 'income') && filteredTotals.income > 0 && (
            <span className={blur} style={{ color: 'var(--accent-green)', fontWeight: 600 }}>+{formatCurrency(filteredTotals.income)}</span>
          )}
          {(typeFilter === 'all' || typeFilter === 'expense') && filteredTotals.expense > 0 && (
            <span className={blur} style={{ color: 'var(--accent-red)', fontWeight: 600 }}>−{formatCurrency(filteredTotals.expense)}</span>
          )}
          {typeFilter === 'all' && filteredTotals.income > 0 && filteredTotals.expense > 0 && (
            <span className={blur} style={{ color: filteredTotals.income - filteredTotals.expense >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 700 }}>
              Net {filteredTotals.income - filteredTotals.expense >= 0 ? '+' : ''}{formatCurrency(filteredTotals.income - filteredTotals.expense)}
            </span>
          )}
          <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>{filtered.length} txn{filtered.length !== 1 ? 's' : ''} · all time</span>
        </div>
      )}

      {availableCategories.length > 0 && (
        <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '0.75rem', scrollbarWidth: 'none' }}>
          <button onClick={() => setCategoryFilter('all')} style={{ flexShrink: 0, padding: '0.3rem 0.75rem', borderRadius: 999, border: categoryFilter === 'all' ? '1.5px solid var(--accent-indigo)' : '1.5px solid var(--border-subtle)', background: categoryFilter === 'all' ? 'rgba(99,102,241,0.12)' : 'transparent', color: categoryFilter === 'all' ? 'var(--accent-indigo)' : 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>All</button>
          {availableCategories
            .filter((c) => typeFilter === 'all' || CATEGORIES[typeFilter]?.find((x) => x.id === c.id))
            .map((cat) => (
              <button key={cat.id} onClick={() => setCategoryFilter(cat.id === categoryFilter ? 'all' : cat.id)}
                style={{ flexShrink: 0, padding: '0.3rem 0.75rem', borderRadius: 999, display: 'flex', alignItems: 'center', gap: '0.3rem', border: categoryFilter === cat.id ? `1.5px solid ${cat.color}` : '1.5px solid var(--border-subtle)', background: categoryFilter === cat.id ? `${cat.color}18` : 'transparent', color: categoryFilter === cat.id ? cat.color : 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                <span>{cat.emoji}</span> {cat.name}
              </button>
            ))}
        </div>
      )}

      {hasActiveFilters && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
          <button onClick={clearFilters} style={{ fontSize: '0.75rem', color: 'var(--accent-indigo)', fontWeight: 600 }}>Clear filters</button>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState icon={hasActiveFilters ? '🔍' : '📭'} title={hasActiveFilters ? 'No matches found' : 'No transactions'} text={hasActiveFilters ? 'Try adjusting your search or filters.' : 'Start by adding your first income or expense.'} />
      ) : (
        <div className="txn-list" style={{ gap: '0.35rem' }}>
          {filtered.map((t, i) => {
            const cat = getCategory(t.type, t.category);
            // Fix #5: detect auto-added recurring transactions
            const isAuto = t.isRecurring || (t.notes && t.notes.startsWith('Auto:'));
            return (
              <SwipeableRow key={t.id} onDelete={() => deleteTransaction(t.id)}>
                <div className="txn-item animate-in"
                  style={{ animationDelay: `${i * 0.03}s`, cursor: 'pointer', borderRadius: 0 }}
                  onClick={() => openForm(t.type, t)}>
                  <div className="txn-icon" style={{ background: cat.color + '15', color: cat.color }}>{cat.emoji}</div>
                  <div className="txn-details">
                    <div className="txn-desc" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <span>{t.description}</span>
                      {/* Settlement badge */}
                      {isSettlementTxn(t) && (
                        <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '1px 5px', borderRadius: 999, background: 'rgba(16,185,129,0.15)', color: 'var(--accent-green)', letterSpacing: '0.03em' }}>
                          SETTLEMENT
                        </span>
                      )}
                      {/* Fix #5: Auto badge */}
                      {isAuto && !isSettlementTxn(t) && (
                        <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '1px 5px', borderRadius: 999, background: 'rgba(99,102,241,0.15)', color: 'var(--accent-indigo)', letterSpacing: '0.03em' }}>
                          AUTO
                        </span>
                      )}
                    </div>
                    {/* Notes line — skip auto/system notes */}
                    {t.notes && !t.notes.startsWith('via SMS') && !t.notes.startsWith('Splitwise') && !t.notes.startsWith('Auto:') && (
                      <div className="txn-note">{t.notes}</div>
                    )}
                    <div className="txn-meta">{cat.name} · {formatDate(t.date)}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <div className={`txn-amount ${isSettlementTxn(t) ? '' : t.type} ${blur}`}
                      style={isSettlementTxn(t) ? { color: 'var(--text-muted)' } : {}}>
                      {isSettlementTxn(t) ? '⇄ ' : t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.4 }}>
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </div>
                </div>
              </SwipeableRow>
            );
          })}
        </div>
      )}

      {showForm && (
        <TransactionForm transaction={editingTxn} defaultType={defaultType} onClose={() => { setShowForm(false); setEditingTxn(null); }} />
      )}
    </div>
  );
}
