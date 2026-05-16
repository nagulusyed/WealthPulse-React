import useStore from '../../store/useStore';
import { PendingSmsCard } from '../sms/PendingSmsCard';

function normalizeType(tx) {
  if (tx.type) return tx.type;
  if (/credited|credit alert/i.test(tx.rawSms || '')) return 'credit';
  if (/sent|debited|spent/i.test(tx.rawSms || '')) return 'debit';
  return 'unknown';
}

export function NotificationsView() {
  const pendingSmsTransactions = useStore((s) => s.pendingSmsTransactions);
  const smsEnabled             = useStore((s) => s.smsEnabled);
  // Fix #8/#11: dismiss all
  const dismissAllPendingSms   = useStore((s) => s.dismissAllPendingSms);

  const safeList = Object.values(
    pendingSmsTransactions.reduce((acc, tx) => {
      const key = tx.id || `${tx.amount}-${tx.date}`;
      if (!acc[key]) acc[key] = { ...tx, type: normalizeType(tx) };
      return acc;
    }, {})
  );

  return (
    <div style={{ padding: '1rem', maxWidth: 560, margin: '0 auto' }}>
      {/* Header with Dismiss All */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontWeight: 700, fontSize: '1.25rem', marginBottom: 4 }}>🔔 Notifications</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Transactions detected from your bank SMS
          </p>
        </div>
        {/* Fix #8/#11: dismiss all button */}
        {safeList.length > 1 && (
          <button
            onClick={dismissAllPendingSms}
            style={{
              fontSize: '0.78rem', fontWeight: 600,
              color: 'var(--accent-red)',
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.35rem 0.75rem',
              cursor: 'pointer',
              flexShrink: 0,
              marginTop: '0.25rem',
            }}
          >
            Dismiss all
          </button>
        )}
      </div>

      {!smsEnabled && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1.25rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💬</div>
          <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>SMS Auto-capture is off</div>
          Enable it in <strong>Settings → SMS Auto-capture</strong>
        </div>
      )}

      {smsEnabled && safeList.length === 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✅</div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>All caught up!</div>
          <div style={{ fontSize: '0.85rem' }}>New transactions from your HDFC SMS will appear here automatically.</div>
        </div>
      )}

      {smsEnabled && safeList.length > 0 && (
        <>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
            {safeList.length} pending review
          </div>
          {safeList.map((item) => (
            <PendingSmsCard key={item.id} item={item} />
          ))}
        </>
      )}
    </div>
  );
}
