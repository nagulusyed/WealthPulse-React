import { useMemo, useState } from 'react';
import useStore from '../../store/useStore';
import { formatCurrency } from '../../utils/formatters';
import { Modal } from '../../components/ui/Modal';
import './SettleUpView.css';

export function SettleUpView() {
  const groups = useStore((s) => s.groups);
  const groupExpenses = useStore((s) => s.groupExpenses);
  const people = useStore((s) => s.people);
  const privacyMode = useStore((s) => s.privacyMode);

  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleData, setSettleData] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [syncPersonal, setSyncPersonal] = useState(false);

  const blur = privacyMode ? 'private-blur' : '';

  // Compute all settlements reactively from raw data
  const settlements = useMemo(() => {
    return useStore.getState().getAllSettlements();
  }, [groups, groupExpenses]);

  const youOwe = useMemo(() => settlements.filter((t) => t.from === 'self'), [settlements]);
  const owedToYou = useMemo(() => settlements.filter((t) => t.to === 'self'), [settlements]);

  const globalBal = useMemo(() => useStore.getState().getGlobalBalance('self'), [groups, groupExpenses]);
  const totalOwe = useMemo(() => youOwe.reduce((s, t) => s + t.amount, 0), [youOwe]);
  const totalGet = useMemo(() => owedToYou.reduce((s, t) => s + t.amount, 0), [owedToYou]);

  const getPersonById = (id) => people.find((p) => p.id === id);
  const getGroupById = (id) => groups.find((g) => g.id === id);

  const openSettleModal = (settlement) => {
    setSettleData(settlement);
    setPaymentMethod('Cash');
    setSyncPersonal(false);
    setShowSettleModal(true);
  };

  const handleSettle = (e) => {
    e.preventDefault();
    if (!settleData) return;

    const store = useStore.getState();
    store.settleDebt(settleData.from, settleData.to, settleData.groupId, settleData.amount);

    if (syncPersonal) {
      const isYouPaying = settleData.from === 'self';
      const otherPerson = getPersonById(isYouPaying ? settleData.to : settleData.from);
      const group = getGroupById(settleData.groupId);
      store.addTransaction({
        type: 'expense',
        description: `Settlement to ${otherPerson?.name || 'Unknown'} (${group?.name || 'Group'})`,
        amount: settleData.amount,
        category: 'other_exp',
        date: new Date().toISOString().split('T')[0],
        notes: `Payment via ${paymentMethod}`,
      });
    }

    setShowSettleModal(false);
    setSettleData(null);
  };

  return (
    <div className="settle-view animate-in">
      <div>
        <h2 className="view-title">Settle Up</h2>
        <p className="view-subtitle">Overview of all your debts and receivables</p>
      </div>

      {/* Global Balance */}
      <div className="settle-summary-card">
        <p className="card-label">Global Balance</p>
        <h2 className={`card-amount ${blur}`} style={{ fontSize: '1.75rem', color: globalBal > 0.01 ? 'var(--accent-green)' : globalBal < -0.01 ? 'var(--accent-red)' : 'var(--text-primary)' }}>
          {globalBal < 0 ? '-' : ''}{formatCurrency(Math.abs(globalBal))}
        </h2>
        <div className="settle-summary-row">
          <div>
            <p className="card-sub" style={{ color: 'var(--accent-red)' }}>You owe</p>
            <p className={`settle-total ${blur}`} style={{ color: 'var(--accent-red)' }}>{formatCurrency(totalOwe)}</p>
          </div>
          <div>
            <p className="card-sub" style={{ color: 'var(--accent-green)' }}>Owed to you</p>
            <p className={`settle-total ${blur}`} style={{ color: 'var(--accent-green)' }}>{formatCurrency(totalGet)}</p>
          </div>
        </div>
      </div>

      {settlements.length === 0 ? (
        <div className="empty-state" style={{ padding: '2rem 1rem' }}>
          <p>All settled up! No pending balances.</p>
        </div>
      ) : (
        <div className="settle-columns">
          <div className="settle-section">
            <h3 className="section-title">You Owe</h3>
            {youOwe.length === 0 ? (
              <p className="empty-text">You don't owe anything!</p>
            ) : (
              <div className="settle-list">
                {youOwe.map((t, i) => {
                  const p = getPersonById(t.to);
                  const g = getGroupById(t.groupId);
                  return (
                    <div key={`owe-${i}`} className="settle-item">
                      <div className="avatar-sm" style={{ background: p?.color || '#888' }}>{p?.initials || '?'}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{p?.name || 'Unknown'}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>in {g?.name || 'Group'}</div>
                      </div>
                      <div className={blur} style={{ fontWeight: 600, color: 'var(--accent-red)', marginRight: '0.5rem' }}>{formatCurrency(t.amount)}</div>
                      <button className="btn btn-primary" style={{ padding: '0.35rem 0.7rem', fontSize: '0.75rem' }} onClick={() => openSettleModal(t)}>Settle</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="settle-section">
            <h3 className="section-title">Owed to You</h3>
            {owedToYou.length === 0 ? (
              <p className="empty-text">Nobody owes you anything!</p>
            ) : (
              <div className="settle-list">
                {owedToYou.map((t, i) => {
                  const p = getPersonById(t.from);
                  const g = getGroupById(t.groupId);
                  return (
                    <div key={`get-${i}`} className="settle-item">
                      <div className="avatar-sm" style={{ background: p?.color || '#888' }}>{p?.initials || '?'}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{p?.name || 'Unknown'}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>in {g?.name || 'Group'}</div>
                      </div>
                      <div className={blur} style={{ fontWeight: 600, color: 'var(--accent-green)', marginRight: '0.5rem' }}>{formatCurrency(t.amount)}</div>
                      <button className="btn btn-success" style={{ padding: '0.35rem 0.7rem', fontSize: '0.75rem' }} onClick={() => openSettleModal(t)}>Mark Paid</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settle Payment Modal */}
      <Modal isOpen={showSettleModal} onClose={() => setShowSettleModal(false)} title="Record Payment" className="modal-small">
        {settleData && (
          <form onSubmit={handleSettle}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
              {settleData.from === 'self'
                ? `You pay ${getPersonById(settleData.to)?.name || 'Unknown'} — ${formatCurrency(settleData.amount)}`
                : `${getPersonById(settleData.from)?.name || 'Unknown'} pays you — ${formatCurrency(settleData.amount)}`
              }
            </p>

            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <div className="type-toggle">
                {['Cash', 'UPI', 'Bank'].map((m) => (
                  <button key={m} type="button" className={`type-btn ${paymentMethod === m ? 'active' : ''}`} onClick={() => setPaymentMethod(m)}>{m}</button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500 }}>
                <input type="checkbox" checked={syncPersonal} onChange={(e) => setSyncPersonal(e.target.checked)} style={{ width: 20, height: 20, accentColor: 'var(--accent-indigo)' }} />
                <span style={{ color: 'var(--text-primary)' }}>Update in personal finance</span>
              </label>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.4rem', marginLeft: '2.5rem' }}>
                This will add a transaction to your personal tracker
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowSettleModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Confirm Payment</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
