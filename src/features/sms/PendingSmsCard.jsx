import { useState } from 'react';
import useStore from '../../store/useStore';
import { CATEGORIES } from '../../services/categories';
import { extractType } from '../../services/smsParser';
import { QuickSplitModal } from './QuickSplitModal';

// Re-derive type from rawSms as fallback, but trust item.type if already set correctly
function resolveType(item) {
  if (item.type === 'credit' || item.type === 'debit') return item.type;
  // Fallback: re-parse rawSms with the same logic as the parser
  return extractType(item.rawSms || '') || 'debit';
}

export function PendingSmsCard({ item }) {
  const acceptPendingSmsAsExpense = useStore((s) => s.acceptPendingSmsAsExpense);
  const acceptPendingSmsAsIncome = useStore((s) => s.acceptPendingSmsAsIncome);
  const dismissPendingSms = useStore((s) => s.dismissPendingSms);
  const getCategoryForPayee = useStore((s) => s.getCategoryForPayee);

  const resolvedType = resolveType(item);
  const isCredit = resolvedType === 'credit';

  const categoryList = isCredit ? CATEGORIES.income : CATEGORIES.expense;

  const [showSplitModal, setShowSplitModal] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(() => {
    const remembered = getCategoryForPayee(item.payee);
    if (remembered) return remembered;
    if (item.category) {
      // Validate category belongs to correct list
      const valid = categoryList.find((c) => c.id === item.category);
      if (valid) return item.category;
    }
    return isCredit ? 'other_inc' : 'other_exp';
  });

  const cat = categoryList.find((c) => c.id === selectedCategory) || categoryList[0];

  const handleAccept = () => {
    if (isCredit) {
      acceptPendingSmsAsIncome(item.id, selectedCategory);
    } else {
      acceptPendingSmsAsExpense(item.id, selectedCategory);
    }
  };

  return (
    <>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '0.75rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.1rem' }}>{isCredit ? '💰' : '📨'}</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                {isCredit ? 'Money Received' : 'New Transaction Detected'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 1 }}>
                {item.date} · via SMS
              </div>
            </div>
          </div>
          <button onClick={() => dismissPendingSms(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '2px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Amount & payee */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.75rem', background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', marginBottom: '0.75rem' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', color: isCredit ? 'var(--accent-green, #34d399)' : 'var(--accent-red, #f87171)' }}>
              {isCredit ? '+' : '-'}₹{item.amount.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 2 }}>
              {isCredit ? 'from' : 'to'} {item.payee}
            </div>
          </div>

          {/* Category badge */}
          <div
            onClick={() => setShowCategoryPicker((v) => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '2rem', padding: '0.3rem 0.65rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 500 }}
          >
            <span>{cat?.emoji}</span>
            <span>{cat?.name}</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
        </div>

        {/* Category picker */}
        {showCategoryPicker && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', marginBottom: '0.75rem', maxHeight: 160, overflowY: 'auto' }}>
            {categoryList.map((c) => (
              <div key={c.id} onClick={() => { setSelectedCategory(c.id); setShowCategoryPicker(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', cursor: 'pointer', background: selectedCategory === c.id ? 'var(--accent-indigo-subtle, rgba(99,102,241,0.1))' : 'transparent', fontSize: '0.85rem' }}>
                <span>{c.emoji}</span><span>{c.name}</span>
                {selectedCategory === c.id && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent-indigo,#6366f1)" strokeWidth="2.5" style={{ marginLeft: 'auto' }}><polyline points="20 6 9 17 4 12"/></svg>}
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-primary" style={{ flex: 1, fontSize: '0.82rem', padding: '0.5rem' }} onClick={handleAccept}>
            ✓ Add to My {isCredit ? 'Income' : 'Expenses'}
          </button>
          {!isCredit && (
            <button className="btn btn-ghost" style={{ flex: 1, fontSize: '0.82rem', padding: '0.5rem', border: '1px solid var(--accent-indigo,#6366f1)', color: 'var(--accent-indigo,#6366f1)' }}
              onClick={() => setShowSplitModal(true)}>
              ⚡ Split
            </button>
          )}
        </div>
      </div>

      {showSplitModal && (
        <QuickSplitModal
          pendingItem={{ ...item, type: resolvedType, category: selectedCategory }}
          onClose={() => setShowSplitModal(false)}
        />
      )}
    </>
  );
}
