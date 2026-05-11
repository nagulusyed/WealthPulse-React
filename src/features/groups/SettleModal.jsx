import { useState, useMemo, useEffect } from 'react';
import useStore from '../../store/useStore';
import { formatCurrency } from '../../utils/formatters';
import { Modal, ConfirmModal } from '../../components/ui/Modal';
import { openUpiApp } from '../../services/upiService';

export function SettleModal({ isOpen, onClose, settleData }) {
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [settleType, setSettleType] = useState('Full');
  const [partialAmount, setPartialAmount] = useState('');
  const [syncPersonal, setSyncPersonal] = useState(false);
  const [showUpiConfirm, setShowUpiConfirm] = useState(false);

  const getPersonById = useStore((s) => s.getPersonById);
  const getGroupById = useStore((s) => s.getGroupById);
  const groupExpenses = useStore((s) => s.groupExpenses);
  const settleDebt = useStore((s) => s.settleDebt);
  const addTransaction = useStore((s) => s.addTransaction);

  // Reset state when modal opens with new data
  useEffect(() => {
    if (isOpen && settleData) {
      setPaymentMethod('Cash');
      setSettleType('Full');
      setPartialAmount(settleData.amount.toString());
      setSyncPersonal(false);
    }
  }, [isOpen, settleData]);

  /**
   * Find the correct category for this settlement by looking at the actual
   * group expenses that created the debt. We find expenses in this group
   * where the creditor paid and the debtor has a split — those are the
   * expenses that created the debt being settled.
   */
  const settleCategory = useMemo(() => {
    if (!settleData) return 'other_exp';
    const { from, to, groupId } = settleData;

    // Find non-settlement expenses in this group
    const expenses = groupExpenses.filter(
      (e) => e.groupId === groupId && e.description !== 'Settlement'
    );

    // The debt is: `from` owes `to`. This means `to` paid for expenses
    // where `from` had a split share. Find those expenses.
    const relevantExpenses = expenses.filter((e) => {
      if (e.paidBy !== to) return false;
      return e.splits?.some((s) => s.personId === from && s.share > 0);
    });

    if (relevantExpenses.length === 0) {
      // Fallback: find any expense in this group with a category
      const anyWithCat = expenses.find((e) => e.category && e.category !== 'other_exp');
      return anyWithCat?.category || 'other_exp';
    }

    // Use the category from the largest relevant expense
    const sorted = [...relevantExpenses].sort((a, b) => b.amount - a.amount);
    return sorted[0].category || 'other_exp';
  }, [settleData, groupExpenses]);

  if (!settleData) return null;

  const isYouInvolved = settleData.from === 'self' || settleData.to === 'self';
  const isYouPaying = settleData.from === 'self';
  const fromP = getPersonById(settleData.from);
  const toP = getPersonById(settleData.to);
  const group = getGroupById(settleData.groupId);

  const handleSettle = (e) => {
    e.preventDefault();

    const finalAmount = settleType === 'Full' ? settleData.amount : parseFloat(partialAmount);
    
    if (isNaN(finalAmount) || finalAmount <= 0) {
      return;
    }

    // Record settlement in group balances
    settleDebt(settleData.from, settleData.to, settleData.groupId, finalAmount);

    // Sync to personal finance only if YOU are involved and opted in
    if (isYouInvolved && syncPersonal) {
      const otherPerson = isYouPaying ? toP : fromP;

      if (isYouPaying) {
        // You pay someone → expense in the SAME category as the original group expense
        addTransaction({
          type: 'expense',
          description: `Payment - ${paymentMethod} to ${otherPerson?.name}`,
          amount: finalAmount,
          category: settleCategory,
          date: new Date().toISOString().split('T')[0],
          notes: `Settlement to ${otherPerson?.name} (${group?.name})`,
          isSettlement: true,
          settledGroupId: settleData.groupId,
        });
      } else {
        // Someone pays you → income (reduces your net expense)
        addTransaction({
          type: 'income',
          description: `Payment - ${paymentMethod} from ${otherPerson?.name}`,
          amount: finalAmount,
          category: 'other_inc',
          date: new Date().toISOString().split('T')[0],
          notes: `Settlement from ${otherPerson?.name} (${group?.name})`,
          isSettlement: true,
          settledGroupId: settleData.groupId,
          originalExpenseCategory: settleCategory,
        });
      }
    }

    onClose();
  };

  const handleUpiPay = async () => {
    const amount = settleType === 'Full' ? settleData.amount : parseFloat(partialAmount);
    if (isNaN(amount) || amount <= 0) return;

    const success = await openUpiApp({
      upiId: toP.upiId,
      name: toP.name,
      amount,
      note: `WealthPulse: ${group?.name || 'Settlement'}`
    });

    if (success) {
      setPaymentMethod('UPI');
      setSyncPersonal(true); // Default to sync for digital payments
      setShowUpiConfirm(true);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={isYouInvolved ? 'Record Payment' : 'Record Third-Party Payment'}>
        <form onSubmit={handleSettle}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem', fontSize: '0.875rem', lineHeight: 1.6 }}>
            {isYouInvolved
              ? isYouPaying
                ? `You pay ${toP?.name || 'Unknown'} — ${formatCurrency(settleData.amount)}`
                : `${fromP?.name || 'Unknown'} pays you — ${formatCurrency(settleData.amount)}`
              : `${fromP?.name || 'Unknown'} pays ${toP?.name || 'Unknown'} — ${formatCurrency(settleData.amount)}`
            }
          </p>

          {!isYouInvolved && (
            <div style={{ background: 'rgba(99, 102, 241, 0.08)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Third-party settlement — updates group balances only. Your personal finance is not affected.
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Payment Method</label>
            <div className="type-toggle">
              {['Cash', 'UPI', 'Bank'].map((m) => (
                <button key={m} type="button" className={`type-btn ${paymentMethod === m ? 'active' : ''}`} onClick={() => setPaymentMethod(m)}>{m}</button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Settlement Type</label>
            <div className="type-toggle">
              {['Full', 'Partial'].map((t) => (
                <button key={t} type="button" className={`type-btn ${settleType === t ? 'active' : ''}`} onClick={() => setSettleType(t)}>{t}</button>
              ))}
            </div>
          </div>

          {settleType === 'Partial' && (
            <div className="form-group animate-in">
              <label className="form-label">Amount Paid</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.9rem', color: 'var(--text-muted)' }}>₹</span>
                <input
                  type="number"
                  className="form-input"
                  style={{ paddingLeft: '2rem' }}
                  value={partialAmount}
                  onChange={(e) => setPartialAmount(e.target.value)}
                  placeholder="0.00"
                  min="0.01"
                  max={settleData.amount}
                  step="0.01"
                  required
                  autoFocus
                />
              </div>
            </div>
          )}

          {isYouInvolved && (
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}>
                <input type="checkbox" checked={syncPersonal} onChange={(e) => setSyncPersonal(e.target.checked)} style={{ width: 20, height: 20, accentColor: 'var(--accent-indigo)' }} />
                <span style={{ color: 'var(--text-primary)' }}>Update in personal finance</span>
              </label>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.3rem', marginLeft: '2.5rem' }}>
                {isYouPaying
                  ? 'Records as expense under the original category'
                  : 'Records as income (reduces your net expense)'
                }
              </p>
            </div>
          )}

          {isYouPaying && toP?.upiId && (
            <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Instant Payment</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
              </div>
              <button 
                type="button" 
                className="btn btn-primary" 
                style={{ 
                  width: '100%', 
                  background: '#00d09c', 
                  border: 'none', 
                  height: '3.25rem',
                  fontSize: '1rem',
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(0, 208, 156, 0.2)'
                }} 
                onClick={handleUpiPay}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: 10 }}>
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
                Pay via UPI
              </button>
            </div>
          )}

          <div className="modal-actions">
            <div style={{ flex: 1 }} />
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">{isYouInvolved ? 'Confirm' : 'Record'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={showUpiConfirm}
        onClose={() => setShowUpiConfirm(false)}
        onConfirm={(e) => handleSettle(e)}
        title="Payment Success?"
        message={`Did the payment of ${formatCurrency(settleType === 'Full' ? settleData.amount : parseFloat(partialAmount))} to ${toP?.name} go through?`}
        confirmText="Yes, mark settled"
        cancelText="No, cancel"
      />
    </>
  );
}

