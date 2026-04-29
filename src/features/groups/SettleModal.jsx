import { useState, useMemo } from 'react';
import useStore from '../../store/useStore';
import { formatCurrency } from '../../utils/formatters';
import { Modal } from '../../components/ui/Modal';

export function SettleModal({ isOpen, onClose, settleData }) {
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [syncPersonal, setSyncPersonal] = useState(false);

  const getPersonById = useStore((s) => s.getPersonById);
  const getGroupById = useStore((s) => s.getGroupById);
  const groupExpenses = useStore((s) => s.groupExpenses);
  const settleDebt = useStore((s) => s.settleDebt);
  const addTransaction = useStore((s) => s.addTransaction);

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

    // Record settlement in group balances
    settleDebt(settleData.from, settleData.to, settleData.groupId, settleData.amount);

    // Sync to personal finance only if YOU are involved and opted in
    if (isYouInvolved && syncPersonal) {
      const otherPerson = isYouPaying ? toP : fromP;

      if (isYouPaying) {
        // You pay someone → expense in the SAME category as the original group expense
        addTransaction({
          type: 'expense',
          description: `Payment - ${paymentMethod} to ${otherPerson?.name}`,
          amount: settleData.amount,
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
          amount: settleData.amount,
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

  return (
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

        <div className="modal-actions" style={{ marginTop: '1.25rem' }}>
          <div style={{ flex: 1 }} />
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">{isYouInvolved ? 'Confirm' : 'Record'}</button>
        </div>
      </form>
    </Modal>
  );
}
