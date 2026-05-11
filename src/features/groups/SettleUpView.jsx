import { useMemo, useState } from 'react';
import useStore from '../../store/useStore';
import { formatCurrency } from '../../utils/formatters';
import { SettleModal } from './SettleModal';
import { openUpiApp, buildRequestLink } from '../../services/upiService';
import './SettleUpView.css';

export function SettleUpView() {
  const groups = useStore((s) => s.groups);
  const groupExpenses = useStore((s) => s.groupExpenses);
  const people = useStore((s) => s.people);
  const privacyMode = useStore((s) => s.privacyMode);
  const userUpiId = useStore((s) => s.userUpiId);

  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleData, setSettleData] = useState(null);
  const [showQuickConfirm, setShowQuickConfirm] = useState(false);
  const [quickSettleData, setQuickSettleData] = useState(null);

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
    setShowSettleModal(true);
  };

  const handleQuickPay = async (t, p, g) => {
    await openUpiApp({
      upiId: p.upiId,
      name: p.name,
      amount: t.amount,
      note: `WealthPulse: ${g?.name || 'Settlement'}`
    });
    
    // Set data for the confirmation modal that appears after payment
    setQuickSettleData(t);
    setTimeout(() => setShowQuickConfirm(true), 1500);
  };

  const confirmQuickSettle = () => {
    if (quickSettleData) {
      useStore.getState().settleDebt(
        quickSettleData.from,
        quickSettleData.to,
        quickSettleData.amount,
        quickSettleData.groupId
      );
    }
    setShowQuickConfirm(false);
    setQuickSettleData(null);
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
                      {p?.avatar ? (
                        <img src={p.avatar} className="avatar-sm" alt={p?.name} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                      ) : null}
                      <div className="avatar-sm" style={{ background: p?.color || '#888', display: p?.avatar ? 'none' : 'flex' }}>{p?.initials || '?'}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>
                          {p?.name || 'Unknown'}
                          {p?.upiId && <span title="UPI Linked" style={{ marginLeft: '4px', fontSize: '0.7rem', opacity: 0.6 }}>💳</span>}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>in {g?.name || 'Group'}</div>
                      </div>
                      <div className={blur} style={{ fontWeight: 600, color: 'var(--accent-red)', marginRight: '0.5rem' }}>{formatCurrency(t.amount)}</div>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        {p?.upiId && (
                          <button 
                            className="btn btn-primary" 
                            style={{ 
                              padding: '0.35rem 0.6rem', 
                              fontSize: '0.72rem', 
                              background: '#00d09c', 
                              border: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }} 
                            onClick={() => handleQuickPay(t, p, g)}
                          >
                            <span style={{ fontSize: '0.8rem' }}>₹</span> Pay
                          </button>
                        )}
                        <button className="btn btn-primary" style={{ padding: '0.35rem 0.7rem', fontSize: '0.75rem' }} onClick={() => openSettleModal(t)}>Settle</button>
                      </div>
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
                  const handleRequest = () => {
                    if (!userUpiId) {
                      alert('Please set your UPI ID in Settings first');
                      return;
                    }
                    const link = buildRequestLink({ 
                      myUpiId: userUpiId, 
                      myName: 'Self', 
                      amount: t.amount, 
                      note: `WealthPulse: ${g?.name || 'Settlement'}` 
                    });
                    const shareText = `Hey, please pay ${formatCurrency(t.amount)} for "${g?.name || 'our expenses'}" via UPI: ${link}`;
                    
                    if (p?.phone) {
                      // Clean phone number (remove non-digits, but keep + if it's there)
                      const cleanPhone = p.phone.replace(/[^\d+]/g, '');
                      // Direct WhatsApp link
                      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(shareText)}`, '_system');
                    } else if (navigator.share) {
                      navigator.share({
                        title: 'Payment Request',
                        text: shareText
                      }).catch(() => {
                        window.open(`whatsapp://send?text=${encodeURIComponent(shareText)}`, '_system');
                      });
                    } else {
                      window.open(`whatsapp://send?text=${encodeURIComponent(shareText)}`, '_system');
                    }
                  };
                  return (
                    <div key={`get-${i}`} className="settle-item">
                      {p?.avatar ? (
                        <img src={p.avatar} className="avatar-sm" alt={p?.name} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                      ) : null}
                      <div className="avatar-sm" style={{ background: p?.color || '#888', display: p?.avatar ? 'none' : 'flex' }}>{p?.initials || '?'}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>
                          {p?.name || 'Unknown'}
                          {p?.upiId && <span title="UPI Linked" style={{ marginLeft: '4px', fontSize: '0.7rem', opacity: 0.6 }}>💳</span>}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>in {g?.name || 'Group'}</div>
                      </div>
                      <div className={blur} style={{ fontWeight: 600, color: 'var(--accent-green)', marginRight: '0.5rem' }}>{formatCurrency(t.amount)}</div>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        {userUpiId && (
                          <button 
                            className="btn btn-ghost" 
                            style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', border: '1px solid var(--border-color)' }} 
                            onClick={handleRequest}
                            title="Request via UPI"
                          >
                            📲
                          </button>
                        )}
                        <button className="btn btn-success" style={{ padding: '0.35rem 0.7rem', fontSize: '0.75rem' }} onClick={() => openSettleModal(t)}>Mark Paid</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Payment Confirmation Modal */}
      <ConfirmModal 
        isOpen={showQuickConfirm} 
        onClose={() => setShowQuickConfirm(false)} 
        onConfirm={confirmQuickSettle}
        title="💸 Payment sent?"
        message={`Did ${formatCurrency(quickSettleData?.amount)} go to ${getPersonById(quickSettleData?.to)?.name}?`}
        confirmText="Yes, mark settled"
        cancelText="No"
      />

      {/* Settle Payment Modal */}
      {showSettleModal && (
        <SettleModal
          isOpen={showSettleModal}
          onClose={() => { setShowSettleModal(false); setSettleData(null); }}
          settleData={settleData}
        />
      )}
    </div>
  );
}
