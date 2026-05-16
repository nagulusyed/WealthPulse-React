import { useState, useMemo } from 'react';
import useStore from '../../store/useStore';
import { formatCurrency } from '../../utils/formatters';
import { Modal } from '../../components/ui/Modal';
import { hapticSuccess, hapticWarning } from '../../utils/haptics';

const PAYMENT_METHODS = [
  { id: 'Cash', label: 'Cash', icon: '💵' },
  { id: 'UPI', label: 'UPI', icon: '📲' },
  { id: 'Bank', label: 'Bank', icon: '🏦' },
];

export function SettleModal({ isOpen, onClose, settleData, onSettled }) {
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [note, setNote] = useState('');
  const [syncPersonal, setSyncPersonal] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [settleType, setSettleType] = useState('full');
  const [partialAmount, setPartialAmount] = useState('');
  const [partialError, setPartialError] = useState('');

  const getPersonById  = useStore((s) => s.getPersonById);
  const getGroupById   = useStore((s) => s.getGroupById);
  const groupExpenses  = useStore((s) => s.groupExpenses);
  const settleDebt     = useStore((s) => s.settleDebt);
  const addTransaction = useStore((s) => s.addTransaction);

  const settleCategory = useMemo(() => {
    if (!settleData) return 'other_exp';
    const { from, to, groupId } = settleData;
    const expenses = groupExpenses.filter((e) => e.groupId === groupId && e.description !== 'Settlement');
    const relevantExpenses = expenses.filter((e) => {
      if (e.paidBy !== to) return false;
      return e.splits?.some((s) => s.personId === from && s.share > 0);
    });
    if (relevantExpenses.length === 0) {
      const anyWithCat = expenses.find((e) => e.category && e.category !== 'other_exp');
      return anyWithCat?.category || 'other_exp';
    }
    const sorted = [...relevantExpenses].sort((a, b) => b.amount - a.amount);
    return sorted[0].category || 'other_exp';
  }, [settleData, groupExpenses]);

  if (!settleData) return null;

  const isYouInvolved = settleData.from === 'self' || settleData.to === 'self';
  const isYouPaying   = settleData.from === 'self';
  const fromP  = getPersonById(settleData.from);
  const toP    = getPersonById(settleData.to);
  const group  = getGroupById(settleData.groupId);

  const fromName     = settleData.from === 'self' ? 'You' : fromP?.name || 'Unknown';
  const toName       = settleData.to   === 'self' ? 'You' : toP?.name  || 'Unknown';
  const fromInitials = settleData.from === 'self' ? 'ME'  : fromP?.initials || '?';
  const toInitials   = settleData.to   === 'self' ? 'ME'  : toP?.initials   || '?';
  const fromColor    = settleData.from === 'self' ? '#8b5cf6' : fromP?.color || '#888';
  const toColor      = settleData.to   === 'self' ? '#8b5cf6' : toP?.color   || '#888';

  const getFinalAmount = () => {
    if (settleType === 'full') return settleData.amount;
    const val = parseFloat(partialAmount);
    return isNaN(val) ? 0 : val;
  };

  const handleSettle = async () => {
    const finalAmount = getFinalAmount();

    if (settleType === 'partial') {
      if (!partialAmount || isNaN(parseFloat(partialAmount))) {
        await hapticWarning();
        setPartialError('Enter a valid amount');
        return;
      }
      if (parseFloat(partialAmount) <= 0) {
        await hapticWarning();
        setPartialError('Amount must be greater than 0');
        return;
      }
      if (parseFloat(partialAmount) > settleData.amount) {
        await hapticWarning();
        setPartialError(`Cannot exceed ${formatCurrency(settleData.amount)}`);
        return;
      }
    }

    // #12: haptic success on settle
    await hapticSuccess();

    const settlementExpId = settleDebt(settleData.from, settleData.to, settleData.groupId, finalAmount);

    let linkedTxnId = null;
    if (isYouInvolved && syncPersonal) {
      const otherPerson = isYouPaying ? toP : fromP;
      const noteText = note.trim() || `Settlement (${group?.name || 'Group'})`;
      const txnId = `settle_txn_${settlementExpId}`;
      if (isYouPaying) {
        addTransaction({ id: txnId, type: 'expense', description: `Paid ${otherPerson?.name} via ${paymentMethod}`, amount: finalAmount, category: settleCategory, date: new Date().toISOString().split('T')[0], notes: noteText, isSettlement: true, settledGroupId: settleData.groupId });
      } else {
        addTransaction({ id: txnId, type: 'income', description: `Received from ${otherPerson?.name} via ${paymentMethod}`, amount: finalAmount, category: 'other_inc', date: new Date().toISOString().split('T')[0], notes: noteText, isSettlement: true, settledGroupId: settleData.groupId });
      }
      linkedTxnId = txnId;
    }

    onSettled?.({ settlementExpId, linkedTxnId, finalAmount, fromName, toName });
    setConfirmed(true);
    setTimeout(() => {
      onClose();
      setConfirmed(false);
      setNote(''); setSyncPersonal(false); setPaymentMethod('Cash');
      setSettleType('full'); setPartialAmount(''); setPartialError('');
    }, 1200);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Payment">
      {confirmed ? (
        <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✅</div>
          <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1rem' }}>Payment recorded!</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.25rem' }}>Balances updated.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* Who pays whom */}
          <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '1.1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: fromColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#fff', margin: '0 auto 4px' }}>{fromInitials}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{fromName}</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-indigo)' }}>
                {formatCurrency(settleType === 'partial' && partialAmount ? parseFloat(partialAmount) || 0 : settleData.amount)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '2px' }}>
                <div style={{ height: 1, width: 28, background: 'var(--text-muted)' }} />
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>{group?.name || 'Group'}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: toColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#fff', margin: '0 auto 4px' }}>{toInitials}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{toName}</div>
            </div>
          </div>

          {/* Full / Partial */}
          <div>
            <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Amount</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: settleType === 'partial' ? '0.6rem' : 0 }}>
              {[{ id: 'full', label: `Full — ${formatCurrency(settleData.amount)}` }, { id: 'partial', label: 'Partial' }].map((opt) => (
                <button key={opt.id} type="button" onClick={() => { setSettleType(opt.id); setPartialError(''); }}
                  style={{ flex: 1, padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: settleType === opt.id ? '2px solid var(--accent-indigo)' : '2px solid var(--border-card)', background: settleType === opt.id ? 'rgba(99,102,241,0.12)' : 'var(--bg-card)', color: settleType === opt.id ? 'var(--accent-indigo)' : 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
                >{opt.label}</button>
              ))}
            </div>
            {settleType === 'partial' && (
              <div>
                <input type="number" className="form-input" placeholder={`Enter amount (max ${formatCurrency(settleData.amount)})`} value={partialAmount} onChange={(e) => { setPartialAmount(e.target.value); setPartialError(''); }} min="1" max={settleData.amount} style={{ width: '100%' }} />
                {partialError && <p style={{ color: 'var(--accent-red)', fontSize: '0.75rem', marginTop: '4px' }}>{partialError}</p>}
                <p style={{ color: 'var(--text-muted)', fontSize: '0.73rem', marginTop: '4px' }}>
                  Remaining after this: {formatCurrency(settleData.amount - (parseFloat(partialAmount) || 0))}
                </p>
              </div>
            )}
          </div>

          {/* Third-party notice */}
          {!isYouInvolved && (
            <div style={{ background: 'rgba(99,102,241,0.08)', borderRadius: 'var(--radius-sm)', padding: '0.65rem 0.9rem', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Third-party payment — only group balances will be updated.
            </div>
          )}

          {/* Payment method */}
          <div>
            <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>How was it paid?</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {PAYMENT_METHODS.map((m) => (
                <button key={m.id} type="button" onClick={() => setPaymentMethod(m.id)} style={{ flex: 1, padding: '0.55rem 0', borderRadius: 'var(--radius-sm)', border: paymentMethod === m.id ? '2px solid var(--accent-indigo)' : '2px solid var(--border-card)', background: paymentMethod === m.id ? 'rgba(99,102,241,0.12)' : 'var(--bg-card)', color: paymentMethod === m.id ? 'var(--accent-indigo)' : 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                  <span style={{ fontSize: '1.1rem' }}>{m.icon}</span>{m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="form-label" style={{ marginBottom: '0.4rem', display: 'block' }}>
              Note <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
            </label>
            <input type="text" className="form-input" placeholder="e.g. Goa trip, dinner split..." value={note} onChange={(e) => setNote(e.target.value)} maxLength={80} style={{ width: '100%' }} />
          </div>

          {/* Sync to personal finance */}
          {isYouInvolved && (
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer', padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: syncPersonal ? 'rgba(99,102,241,0.07)' : 'var(--bg-card)', border: syncPersonal ? '1.5px solid rgba(99,102,241,0.3)' : '1.5px solid var(--border-card)', transition: 'all 0.15s' }}>
              <input type="checkbox" checked={syncPersonal} onChange={(e) => setSyncPersonal(e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--accent-indigo)', marginTop: 2, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>Add to personal finance</div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.4 }}>
                  {isYouPaying ? 'Records as an expense in your transactions' : 'Records as income in your transactions'}
                </div>
              </div>
            </label>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={handleSettle} style={{ flex: 2 }}>
              {isYouPaying ? '✓ Mark as Paid' : '✓ Mark as Received'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
