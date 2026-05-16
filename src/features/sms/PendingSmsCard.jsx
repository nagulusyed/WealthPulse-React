import { useState } from 'react';
import useStore from '../../store/useStore';
import { CATEGORIES } from '../../services/categories';
import { extractType } from '../../services/smsParser';
import { SelectPicker } from '../../components/ui/SelectPicker';
import { QuickSplitModal } from './QuickSplitModal';

function resolveType(item) {
  if (item.type === 'credit' || item.type === 'debit') return item.type;
  return extractType(item.rawSms || '') || 'debit';
}

export function PendingSmsCard({ item }) {
  const acceptPendingSmsAsExpense = useStore((s) => s.acceptPendingSmsAsExpense);
  const acceptPendingSmsAsIncome  = useStore((s) => s.acceptPendingSmsAsIncome);
  const addTransaction            = useStore((s) => s.addTransaction);
  const dismissPendingSms         = useStore((s) => s.dismissPendingSms);
  const getCategoryForPayee       = useStore((s) => s.getCategoryForPayee);
  const rememberPayeeCategory     = useStore((s) => s.rememberPayeeCategory);

  const resolvedType = resolveType(item);
  const isCredit = resolvedType === 'credit';
  const categoryList = isCredit ? CATEGORIES.income : CATEGORIES.expense;

  const [showSplitModal, setShowSplitModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(() => {
    const remembered = getCategoryForPayee(item.payee);
    if (remembered) return remembered;
    if (item.category) {
      const valid = categoryList.find((c) => c.id === item.category);
      if (valid) return item.category;
    }
    return isCredit ? 'other_inc' : 'other_exp';
  });

  const categoryOptions = categoryList.map((c) => ({ value: c.id, label: c.name, emoji: c.emoji }));

  const handleAccept = () => {
    if (isCredit) acceptPendingSmsAsIncome(item.id, selectedCategory);
    else acceptPendingSmsAsExpense(item.id, selectedCategory);
  };

  // Mark as settlement receipt — adds as income with isSettlement:true
  // so it shows as ⇄ in TransactionList and is excluded from income totals
  const handleSettlement = () => {
    rememberPayeeCategory(item.payee, 'other_inc');
    addTransaction({
      type: 'income',
      amount: item.amount,
      category: 'other_inc',
      date: item.date,
      description: item.payee,
      notes: `Settlement (via SMS)`,
      isSettlement: true,
    });
    dismissPendingSms(item.id);
  };

  return (
    <>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '0.75rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.1rem' }}>{isCredit ? '💰' : '📨'}</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{isCredit ? 'Money Received' : 'New Transaction Detected'}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 1 }}>{item.date} · via SMS</div>
            </div>
          </div>
          <button onClick={() => dismissPendingSms(item.id)} style={{ color: 'var(--text-secondary)', padding: '2px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Amount & payee */}
        <div style={{ padding: '0.6rem 0.75rem', background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', marginBottom: '0.75rem' }}>
          <div style={{ fontWeight: 700, fontSize: '1.05rem', color: isCredit ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            {isCredit ? '+' : '-'}₹{item.amount.toFixed(2)}
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            {isCredit ? 'from' : 'to'} {item.payee}
          </div>
        </div>

        {/* Category — only shown for non-settlement income */}
        {(!isCredit) && (
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'block' }}>Category</label>
            <SelectPicker
              value={selectedCategory}
              onChange={setSelectedCategory}
              options={categoryOptions}
              placeholder="Select category..."
            />
          </div>
        )}

        {/* For credit — show type choice first: Income or Settlement */}
        {isCredit && (
          <div style={{ marginBottom: '0.75rem', padding: '0.6rem 0.75rem', background: 'rgba(99,102,241,0.06)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(99,102,241,0.15)', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            💡 Is this a friend paying you back, or actual income?
          </div>
        )}

        {/* Category picker for income (not settlement) */}
        {isCredit && (
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'block' }}>Category (if income)</label>
            <SelectPicker
              value={selectedCategory}
              onChange={setSelectedCategory}
              options={categoryOptions}
              placeholder="Select category..."
            />
          </div>
        )}

        {/* Actions */}
        {isCredit ? (
          // Two clear options for credit
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button
              className="btn btn-primary"
              style={{ fontSize: '0.82rem', padding: '0.55rem' }}
              onClick={handleAccept}
            >
              ✓ Add as Income
            </button>
            <button
              className="btn btn-ghost"
              style={{ fontSize: '0.82rem', padding: '0.55rem', border: '1px solid var(--accent-green)', color: 'var(--accent-green)' }}
              onClick={handleSettlement}
            >
              ⇄ Mark as Settlement (friend paid me back)
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-primary" style={{ flex: 1, fontSize: '0.82rem', padding: '0.5rem' }} onClick={handleAccept}>
              ✓ Add to Expenses
            </button>
            <button
              className="btn btn-ghost"
              style={{ flex: 1, fontSize: '0.82rem', padding: '0.5rem', border: '1px solid var(--accent-indigo)', color: 'var(--accent-indigo)' }}
              onClick={() => setShowSplitModal(true)}
            >
              ⚡ Split
            </button>
          </div>
        )}
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
