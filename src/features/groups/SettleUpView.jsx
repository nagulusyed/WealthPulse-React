import { useMemo, useState } from 'react';
import useStore from '../../store/useStore';
import { formatCurrency } from '../../utils/formatters';
import { SettleModal } from './SettleModal';
import { ConfirmModal } from '../../components/ui/Modal';
import { openUpiApp } from '../../services/upiService';
import { PersonAvatar } from './PeopleView';
import './SettleUpView.css';

export function SettleUpView() {
  const groups        = useStore((s) => s.groups);
  const groupExpenses = useStore((s) => s.groupExpenses);
  const people        = useStore((s) => s.people);
  const privacyMode   = useStore((s) => s.privacyMode);
  const userUpiId     = useStore((s) => s.userUpiId);

  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleData, setSettleData]           = useState(null);
  const [showQuickConfirm, setShowQuickConfirm] = useState(false);
  const [quickSettleData, setQuickSettleData] = useState(null);
  const [quickPayError, setQuickPayError]     = useState('');

  const blur = privacyMode ? 'private-blur' : '';

  const settlements = useMemo(() => useStore.getState().getAllSettlements(), [groups, groupExpenses]);
  const youOwe      = useMemo(() => settlements.filter((t) => t.from === 'self'), [settlements]);
  const owedToYou   = useMemo(() => settlements.filter((t) => t.to === 'self'), [settlements]);
  const globalBal   = useMemo(() => useStore.getState().getGlobalBalance('self'), [groups, groupExpenses]);
  const totalOwe    = useMemo(() => youOwe.reduce((s, t) => s + t.amount, 0), [youOwe]);
  const totalGet    = useMemo(() => owedToYou.reduce((s, t) => s + t.amount, 0), [owedToYou]);

  const getPersonById = (id) => people.find((p) => p.id === id);
  const getGroupById  = (id) => groups.find((g) => g.id === id);

  const openSettleModal = (settlement) => {
    setSettleData(settlement);
    setShowSettleModal(true);
  };

  // Quick UPI pay — with proper error handling
  const handleQuickPay = async (t, p, g) => {
    setQuickPayError('');
    try {
      const success = await openUpiApp({
        upiId: p.upiId,
        name: p.name,
        amount: t.amount,
        note: `WealthPulse: ${g?.name || 'Settlement'}`,
      });
      if (success) {
        setQuickSettleData(t);
        setTimeout(() => setShowQuickConfirm(true), 1500);
      }
    } catch (e) {
      if (e?.message === 'NO_UPI_APP') {
        setQuickPayError('No UPI app found. Install GPay or PhonePe.');
      } else {
        setQuickPayError('Could not open UPI app. Try again.');
      }
    }
  };

  // Bug fix: correct arg order — settleDebt(fromId, toId, groupId, amount)
  const confirmQuickSettle = () => {
    if (quickSettleData) {
      useStore.getState().settleDebt(
        quickSettleData.from,
        quickSettleData.to,
        quickSettleData.groupId,
        quickSettleData.amount
      );
    }
    setShowQuickConfirm(false);
    setQuickSettleData(null);
  };

  const handleRequest = (t, p, g) => {
    if (!userUpiId) {
      alert('Please set your UPI ID in Settings → Account & Security → Your UPI ID');
      return;
    }
    const shareText =
      `Hi ${p?.name || ''}, please pay ${formatCurrency(t.amount)} for "${g?.name || 'shared expenses'}".\n` +
      `My UPI ID: ${userUpiId}\n` +
      `Sent from WealthPulse 💰`;

    const whatsappBase = p?.phone
      ? `https://wa.me/${p.phone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(shareText)}`
      : `whatsapp://send?text=${encodeURIComponent(shareText)}`;

    if (navigator.share) {
      navigator.share({ title: 'Payment Request', text: shareText }).catch(() => {
        window.open(whatsappBase, '_system');
      });
    } else {
      window.open(whatsappBase, '_system');
    }
  };

  const quickPerson = getPersonById(quickSettleData?.to);

  return (
    <div className="settle-view animate-in">
      <div>
        <h2 className="view-title">Settle Up</h2>
        <p className="view-subtitle">Overview of all your debts and receivables</p>
      </div>

      {/* Global Balance Card */}
      <div className="settle-summary-card">
        <p className="card-label">Global Balance</p>
        <h2
          className={`card-amount ${blur}`}
          style={{ fontSize: '1.75rem', color: globalBal > 0.01 ? 'var(--accent-green)' : globalBal < -0.01 ? 'var(--accent-red)' : 'var(--text-primary)' }}
        >
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

      {quickPayError && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', marginBottom: '0.75rem', fontSize: '0.82rem', color: 'var(--accent-red)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          ⚠️ {quickPayError}
          <button onClick={() => setQuickPayError('')} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: '1rem' }}>×</button>
        </div>
      )}

      {settlements.length === 0 ? (
        <div className="empty-state" style={{ padding: '2rem 1rem' }}>
          <p>All settled up! No pending balances.</p>
        </div>
      ) : (
        <div className="settle-columns">

          {/* ── You Owe ── */}
          <div className="settle-section">
            <h3 className="section-title">You Owe</h3>
            {youOwe.length === 0 ? (
              <p className="empty-text">You don't owe anything! 🎉</p>
            ) : (
              <div className="settle-list">
                {youOwe.map((t, i) => {
                  const p = getPersonById(t.to);
                  const g = getGroupById(t.groupId);
                  return (
                    <div key={`owe-${i}`} className="settle-item">
                      <PersonAvatar person={p} size="sm" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>
                          {p?.name || 'Unknown'}
                          {p?.upiId && <span title={`UPI: ${p.upiId}`} style={{ marginLeft: 4, fontSize: '0.7rem', opacity: 0.6 }}>💳</span>}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>in {g?.name || 'Group'}</div>
                      </div>
                      <div className={blur} style={{ fontWeight: 600, color: 'var(--accent-red)', marginRight: '0.5rem' }}>
                        {formatCurrency(t.amount)}
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        {p?.upiId && (
                          <button
                            className="btn btn-primary"
                            style={{ padding: '0.35rem 0.6rem', fontSize: '0.72rem', background: '#00d09c', border: 'none', display: 'flex', alignItems: 'center', gap: 3 }}
                            onClick={() => handleQuickPay(t, p, g)}
                            title={`Pay via UPI to ${p.upiId}`}
                          >
                            ₹ Pay
                          </button>
                        )}
                        <button
                          className="btn btn-primary"
                          style={{ padding: '0.35rem 0.7rem', fontSize: '0.75rem' }}
                          onClick={() => openSettleModal(t)}
                        >
                          Settle
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Owed to You ── */}
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
                      <PersonAvatar person={p} size="sm" />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{p?.name || 'Unknown'}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>in {g?.name || 'Group'}</div>
                      </div>
                      <div className={blur} style={{ fontWeight: 600, color: 'var(--accent-green)', marginRight: '0.5rem' }}>
                        {formatCurrency(t.amount)}
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        {userUpiId && (
                          <button
                            className="btn btn-ghost"
                            style={{ padding: '0.35rem 0.55rem', fontSize: '0.75rem', border: '1px solid var(--border-color)' }}
                            onClick={() => handleRequest(t, p, g)}
                            title="Request payment via WhatsApp"
                          >
                            📲
                          </button>
                        )}
                        <button
                          className="btn btn-success"
                          style={{ padding: '0.35rem 0.7rem', fontSize: '0.75rem' }}
                          onClick={() => openSettleModal(t)}
                        >
                          Mark Paid
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick UPI payment confirmation */}
      <ConfirmModal
        isOpen={showQuickConfirm}
        onClose={() => { setShowQuickConfirm(false); setQuickSettleData(null); }}
        onConfirm={confirmQuickSettle}
        title="💸 Payment sent?"
        message={`Did ₹${quickSettleData?.amount?.toFixed(0)} go to ${quickPerson?.name || 'them'} via UPI?`}
        confirmText="Yes, mark settled"
        cancelText="No"
      />

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
