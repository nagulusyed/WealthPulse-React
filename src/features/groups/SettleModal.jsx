import { useState, useMemo, useEffect } from 'react';
import useStore from '../../store/useStore';
import { formatCurrency } from '../../utils/formatters';
import { Modal, ConfirmModal } from '../../components/ui/Modal';
import { openUpiApp } from '../../services/upiService';

export function SettleModal({ isOpen, onClose, settleData }) {
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [settleType, setSettleType]       = useState('Full');
  const [partialAmount, setPartialAmount] = useState('');
  const [syncPersonal, setSyncPersonal]   = useState(false);
  const [showUpiConfirm, setShowUpiConfirm] = useState(false);
  const [upiError, setUpiError]           = useState('');
  const [upiLoading, setUpiLoading]       = useState(false);

  const getPersonById  = useStore((s) => s.getPersonById);
  const getGroupById   = useStore((s) => s.getGroupById);
  const groupExpenses  = useStore((s) => s.groupExpenses);
  const settleDebt     = useStore((s) => s.settleDebt);
  const addTransaction = useStore((s) => s.addTransaction);

  useEffect(() => {
    if (isOpen && settleData) {
      setPaymentMethod('Cash');
      setSettleType('Full');
      setPartialAmount(settleData.amount.toFixed(2));
      setSyncPersonal(false);
      setShowUpiConfirm(false);
      setUpiError('');
      setUpiLoading(false);
    }
  }, [isOpen, settleData]);

  const settleCategory = useMemo(() => {
    if (!settleData) return 'other_exp';
    const { from, to, groupId } = settleData;
    const expenses = groupExpenses.filter(
      (e) => e.groupId === groupId && e.description !== 'Settlement'
    );
    const relevant = expenses
      .filter((e) => e.paidBy === to && e.splits?.some((s) => s.personId === from && s.share > 0))
      .sort((a, b) => b.amount - a.amount);
    if (relevant.length > 0) return relevant[0].category || 'other_exp';
    const fallback = expenses.find((e) => e.category && e.category !== 'other_exp');
    return fallback?.category || 'other_exp';
  }, [settleData, groupExpenses]);

  if (!settleData) return null;

  const isYouInvolved = settleData.from === 'self' || settleData.to === 'self';
  const isYouPaying   = settleData.from === 'self';
  const fromP  = getPersonById(settleData.from);
  const toP    = getPersonById(settleData.to);
  const group  = getGroupById(settleData.groupId);

  const getFinalAmount = () => {
    const amt = settleType === 'Full' ? settleData.amount : parseFloat(partialAmount);
    return isNaN(amt) || amt <= 0 ? null : amt;
  };

  const doSettle = (finalAmount, method) => {
    settleDebt(settleData.from, settleData.to, settleData.groupId, finalAmount);
    if (isYouInvolved && syncPersonal) {
      const otherPerson = isYouPaying ? toP : fromP;
      const pm = method || paymentMethod;
      if (isYouPaying) {
        addTransaction({
          type: 'expense',
          description: `Payment - ${pm} to ${otherPerson?.name}`,
          amount: finalAmount,
          category: settleCategory,
          date: new Date().toISOString().split('T')[0],
          notes: `Settlement to ${otherPerson?.name} (${group?.name})`,
          isSettlement: true,
          settledGroupId: settleData.groupId,
        });
      } else {
        addTransaction({
          type: 'income',
          description: `Payment - ${pm} from ${otherPerson?.name}`,
          amount: finalAmount,
          category: 'other_inc',
          date: new Date().toISOString().split('T')[0],
          notes: `Settlement from ${otherPerson?.name} (${group?.name})`,
          isSettlement: true,
          settledGroupId: settleData.groupId,
        });
      }
    }
    onClose();
  };

  const handleSettle = (e) => {
    e.preventDefault();
    const finalAmount = getFinalAmount();
    if (!finalAmount) return;
    doSettle(finalAmount, paymentMethod);
  };

  const handleUpiPay = async () => {
    const finalAmount = getFinalAmount();
    if (!finalAmount || !toP?.upiId) return;
    setUpiError('');
    setUpiLoading(true);
    try {
      const success = await openUpiApp({
        upiId: toP.upiId,
        name: toP.name,
        amount: finalAmount,
        note: `WealthPulse: ${group?.name || 'Settlement'}`,
      });
      if (success) {
        setPaymentMethod('UPI');
        setSyncPersonal(true);
        setTimeout(() => setShowUpiConfirm(true), 1200);
      }
    } catch (e) {
      if (e?.message === 'NO_UPI_APP') {
        setUpiError('No UPI app found. Please install GPay, PhonePe or Paytm.');
      } else {
        setUpiError('Could not open UPI app. Try again.');
      }
    } finally {
      setUpiLoading(false);
    }
  };

  const handleUpiConfirm = () => {
    const finalAmount = getFinalAmount();
    if (!finalAmount) return;
    setShowUpiConfirm(false);
    doSettle(finalAmount, 'UPI');
  };

  const finalAmt = getFinalAmount();

  return (
    <>
      <Modal
        isOpen={isOpen && !showUpiConfirm}
        onClose={onClose}
        title={isYouInvolved ? 'Record Payment' : 'Record Third-Party Payment'}
      >
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
            <div style={{ background: 'rgba(99,102,241,0.08)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Third-party settlement — updates group balances only.
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
                <span style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>₹</span>
                <input
                  type="number" className="form-input" style={{ paddingLeft: '2rem' }}
                  value={partialAmount} onChange={(e) => setPartialAmount(e.target.value)}
                  placeholder="0.00" min="0.01" max={settleData.amount} step="0.01" required autoFocus
                />
              </div>
            </div>
          )}

          {isYouInvolved && (
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}>
                <input type="checkbox" checked={syncPersonal} onChange={(e) => setSyncPersonal(e.target.checked)} style={{ width: 20, height: 20, accentColor: 'var(--accent-indigo)' }} />
                <span>Update in personal finance</span>
              </label>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.3rem', marginLeft: '2.5rem' }}>
                {isYouPaying ? 'Records as expense under original category' : 'Records as income (reduces your net expense)'}
              </p>
            </div>
          )}

          {/* UPI instant pay button */}
          {isYouPaying && toP?.upiId && (
            <div style={{ marginTop: '1.5rem', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Instant Payment</span>
                <div style={{ flex: 1, height: 1, background: 'var(--border-color)' }} />
              </div>
              <button
                type="button"
                disabled={upiLoading}
                className="btn btn-primary"
                style={{ width: '100%', background: upiLoading ? '#6b7280' : '#00d09c', border: 'none', height: '3.25rem', fontSize: '1rem', fontWeight: 600, boxShadow: upiLoading ? 'none' : '0 4px 12px rgba(0,208,156,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.2s' }}
                onClick={handleUpiPay}
              >
                {upiLoading ? (
                  <span style={{ fontSize: '0.9rem' }}>Opening UPI...</span>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                    </svg>
                    Pay ₹{finalAmt ? Math.round(finalAmt) : ''} via UPI
                  </>
                )}
              </button>
              <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                → {toP.upiId}
              </p>
              {upiError && (
                <p style={{ color: 'var(--accent-red)', fontSize: '0.78rem', marginTop: '0.5rem', textAlign: 'center', lineHeight: 1.4 }}>
                  ⚠️ {upiError}
                </p>
              )}
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
        onConfirm={handleUpiConfirm}
        title="💸 Payment sent?"
        message={`Did ₹${finalAmt?.toFixed(0)} go to ${toP?.name} via UPI?`}
        confirmText="Yes, mark settled"
        cancelText="No, cancel"
      />
    </>
  );
}
