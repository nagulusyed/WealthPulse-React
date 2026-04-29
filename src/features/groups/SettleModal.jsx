import { useState } from 'react';
import useStore from '../../store/useStore';
import { formatCurrency } from '../../utils/formatters';
import { Modal } from '../../components/ui/Modal';

export function SettleModal({ isOpen, onClose, settleData }) {
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [syncPersonal, setSyncPersonal] = useState(false);

  const getPersonById = useStore((s) => s.getPersonById);
  const getGroupById = useStore((s) => s.getGroupById);
  const settleDebt = useStore((s) => s.settleDebt);
  const addTransaction = useStore((s) => s.addTransaction);

  if (!settleData) return null;

  const isYouInvolved = settleData.from === 'self' || settleData.to === 'self';
  const isYouPaying = settleData.from === 'self';
  const fromP = getPersonById(settleData.from);
  const toP = getPersonById(settleData.to);
  const group = getGroupById(settleData.groupId);

  const handleSettle = (e) => {
    e.preventDefault();

    // Record settlement in group (updates balances)
    settleDebt(settleData.from, settleData.to, settleData.groupId, settleData.amount);

    // Only sync to personal finance if YOU are involved and user opted in
    if (isYouInvolved && syncPersonal) {
      const type = isYouPaying ? 'expense' : 'income';
      const category = isYouPaying ? 'other_exp' : 'other_inc';
      const otherPerson = isYouPaying ? toP : fromP;

      addTransaction({
        type,
        description: `Payment - ${paymentMethod}`,
        amount: settleData.amount,
        category,
        date: new Date().toISOString().split('T')[0],
        notes: `Settlement ${isYouPaying ? 'to' : 'from'} ${otherPerson?.name} (${group?.name})`,
        isSettlement: true,
      });
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
            This is a third-party settlement. It will update group balances but will NOT affect your personal transactions.
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
                ? 'Records as an expense in your personal tracker'
                : 'Records as income in your personal tracker'
              }
            </p>
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: '1.25rem' }}>
          <div style={{ flex: 1 }} />
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">
            {isYouInvolved ? 'Confirm' : 'Record'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
