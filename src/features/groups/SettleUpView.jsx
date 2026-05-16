import { useMemo, useState, useEffect, useRef } from 'react';
import useStore from '../../store/useStore';
import { formatCurrency } from '../../utils/formatters';
import { SettleModal } from './SettleModal';
import './SettleUpView.css';

function WhatsAppIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

// Clean phone number to digits only, strip leading 0, ensure country code
function buildWhatsAppUrl(phone, message) {
  const encoded = encodeURIComponent(message);
  if (phone) {
    // Strip spaces, dashes, brackets
    let digits = phone.replace(/\D/g, '');
    // If starts with 0, replace with 91 (India)
    if (digits.startsWith('0')) digits = '91' + digits.slice(1);
    // If 10 digits (no country code), prepend 91
    if (digits.length === 10) digits = '91' + digits;
    return `https://wa.me/${digits}?text=${encoded}`;
  }
  // No phone — fallback to generic share sheet
  return `https://wa.me/?text=${encoded}`;
}

export function SettleUpView() {
  const groups = useStore((s) => s.groups);
  const groupExpenses = useStore((s) => s.groupExpenses);
  const people = useStore((s) => s.people);
  const privacyMode = useStore((s) => s.privacyMode);
  const undoSettlement = useStore((s) => s.undoSettlement);

  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleData, setSettleData] = useState(null);
  const [undoToast, setUndoToast] = useState(null);
  const undoTimerRef = useRef(null);

  const blur = privacyMode ? 'private-blur' : '';

  const settlements = useMemo(() => useStore.getState().getAllSettlements(), [groups, groupExpenses]);
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

  const handleSettled = ({ settlementExpId, linkedTxnId, finalAmount, fromName, toName }) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoToast({ settlementExpId, linkedTxnId, label: `${fromName} → ${toName} · ${formatCurrency(finalAmount)}` });
    undoTimerRef.current = setTimeout(() => setUndoToast(null), 6000);
  };

  const handleUndo = () => {
    if (!undoToast) return;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoSettlement(undoToast.settlementExpId, undoToast.linkedTxnId);
    setUndoToast(null);
  };

  // Opens direct WhatsApp chat if phone exists, else generic share
  const handleWhatsApp = (t, isYouPaying) => {
    const p = isYouPaying ? getPersonById(t.to) : getPersonById(t.from);
    const g = getGroupById(t.groupId);
    const name = p?.name || 'there';
    const groupName = g?.name || 'our group';
    const msg = isYouPaying
      ? `Hey ${name}, I'll pay you ${formatCurrency(t.amount)} for ${groupName}. Sending it now!`
      : `Hey ${name}, you owe me ${formatCurrency(t.amount)} for ${groupName}. Please pay when you get a chance 🙏`;
    const url = buildWhatsAppUrl(p?.phone, msg);
    window.open(url, '_blank');
  };

  useEffect(() => {
    return () => { if (undoTimerRef.current) clearTimeout(undoTimerRef.current); };
  }, []);

  const netStatus = globalBal > 0.01 ? 'positive' : globalBal < -0.01 ? 'negative' : 'zero';

  return (
    <div className="settle-view animate-in">
      <div>
        <h2 className="view-title">Settle Up</h2>
        <p className="view-subtitle">Track and record payments between friends</p>
      </div>

      {/* ── Balance Card ── */}
      <div className="settle-balance-card">
        <div className="settle-balance-header">
          <span className="settle-balance-label">Net Balance</span>
          <span className={`settle-balance-badge ${netStatus}`}>
            {netStatus === 'positive' ? 'You are owed' : netStatus === 'negative' ? 'You owe' : 'All settled'}
          </span>
        </div>
        <div className={`settle-balance-amount ${blur}`} data-status={netStatus}>
          {globalBal < 0 ? '-' : globalBal > 0.01 ? '+' : ''}{formatCurrency(Math.abs(globalBal))}
        </div>
        <div className="settle-balance-row">
          <div className="settle-balance-stat">
            <div className="stat-label red">You owe</div>
            <div className={`stat-amount red ${blur}`}>{formatCurrency(totalOwe)}</div>
          </div>
          <div className="settle-balance-divider" />
          <div className="settle-balance-stat">
            <div className="stat-label green">Owed to you</div>
            <div className={`stat-amount green ${blur}`}>{formatCurrency(totalGet)}</div>
          </div>
        </div>
      </div>

      {settlements.length === 0 ? (
        <div className="settle-empty">
          <div className="settle-empty-icon">🎉</div>
          <p className="settle-empty-title">All settled up!</p>
          <p className="settle-empty-sub">No pending balances across all groups.</p>
        </div>
      ) : (
        <div className="settle-columns">

          {/* ── You Owe ── */}
          <div className="settle-section">
            <div className="settle-section-header">
              <h3 className="settle-section-title">You Owe</h3>
              {youOwe.length > 0 && <span className="settle-section-badge red">{youOwe.length}</span>}
            </div>
            {youOwe.length === 0 ? (
              <div className="settle-section-empty"><span>🙌</span> Nothing to pay!</div>
            ) : (
              <div className="settle-list">
                {youOwe.map((t, i) => {
                  const p = getPersonById(t.to);
                  const g = getGroupById(t.groupId);
                  return (
                    <div key={`owe-${i}`} className="settle-card">
                      <div className="settle-card-top">
                        <div className="settle-card-avatar" style={{ background: p?.color || '#888' }}>{p?.initials || '?'}</div>
                        <div className="settle-card-info">
                          <div className="settle-card-name">{p?.name || 'Unknown'}</div>
                          <div className="settle-card-group">📂 {g?.name || 'Group'}</div>
                        </div>
                        <div className={`settle-card-amount red ${blur}`}>{formatCurrency(t.amount)}</div>
                      </div>
                      <div className="settle-card-actions">
                        <button className="settle-action-wa" onClick={() => handleWhatsApp(t, true)} title={p?.phone ? `Open chat with ${p.name}` : 'Share via WhatsApp'}>
                          <WhatsAppIcon />
                          {p?.phone ? 'Chat' : 'Share'}
                        </button>
                        <button className="settle-action-primary red" onClick={() => openSettleModal(t)}>
                          Mark as Paid
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
            <div className="settle-section-header">
              <h3 className="settle-section-title">Owed to You</h3>
              {owedToYou.length > 0 && <span className="settle-section-badge green">{owedToYou.length}</span>}
            </div>
            {owedToYou.length === 0 ? (
              <div className="settle-section-empty"><span>💸</span> Nobody owes you.</div>
            ) : (
              <div className="settle-list">
                {owedToYou.map((t, i) => {
                  const p = getPersonById(t.from);
                  const g = getGroupById(t.groupId);
                  return (
                    <div key={`get-${i}`} className="settle-card">
                      <div className="settle-card-top">
                        <div className="settle-card-avatar" style={{ background: p?.color || '#888' }}>{p?.initials || '?'}</div>
                        <div className="settle-card-info">
                          <div className="settle-card-name">{p?.name || 'Unknown'}</div>
                          <div className="settle-card-group">📂 {g?.name || 'Group'}</div>
                        </div>
                        <div className={`settle-card-amount green ${blur}`}>{formatCurrency(t.amount)}</div>
                      </div>
                      <div className="settle-card-actions">
                        <button className="settle-action-wa" onClick={() => handleWhatsApp(t, false)} title={p?.phone ? `Open chat with ${p.name}` : 'Share via WhatsApp'}>
                          <WhatsAppIcon />
                          {p?.phone ? 'Remind' : 'Share'}
                        </button>
                        <button className="settle-action-primary green" onClick={() => openSettleModal(t)}>
                          Mark as Received
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

      {/* ── Undo Toast ── */}
      {undoToast && (
        <div className="settle-undo-toast">
          <span className="settle-undo-label">✓ Settled: {undoToast.label}</span>
          <button className="settle-undo-btn" onClick={handleUndo}>Undo</button>
        </div>
      )}

      {showSettleModal && (
        <SettleModal
          isOpen={showSettleModal}
          onClose={() => { setShowSettleModal(false); setSettleData(null); }}
          settleData={settleData}
          onSettled={handleSettled}
        />
      )}
    </div>
  );
}
