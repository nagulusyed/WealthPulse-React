import { useState, useEffect } from 'react';
import { storage } from '../../services/storage';
import './SmsPromptSheet.css';

export function SmsPromptSheet({ smsEnabled, onEnable, onDismiss }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (storage.isSmsPromptShown()) return;
    if (smsEnabled) {
      storage.markSmsPromptShown();
      return;
    }
    const sessionCount = storage.getSessionCount();
    const firstExpenseDone = storage.isFirstExpenseAdded();
    if (firstExpenseDone || sessionCount >= 2) {
      const t = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(t);
    }
  }, [smsEnabled]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && visible) handleSkip();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [visible]);

  const handleEnable = () => {
    storage.markSmsPromptShown();
    setVisible(false);
    onEnable?.();
  };

  const handleSkip = () => {
    storage.markSmsPromptShown();
    setVisible(false);
    onDismiss?.();
  };

  if (!visible) return null;

  return (
    <>
      <div className="sms-sheet-overlay" onClick={handleSkip} />
      <div className="sms-sheet animate-slide-up">
        <div className="sms-sheet-handle" />
        <div className="sms-sheet-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <h3 className="sms-sheet-title">Auto-detect bank transactions</h3>
        <p className="sms-sheet-body">
          WealthPulse can read transaction SMS from HDFC, SBI, ICICI, Axis and more — and log them automatically. No manual entry needed.
        </p>
        <div className="sms-banks">
          {['HDFC', 'SBI', 'ICICI', 'Axis', 'Kotak', 'UPI'].map((b) => (
            <span key={b} className="sms-bank-chip">{b}</span>
          ))}
        </div>
        <div className="sms-sheet-actions">
          <button className="btn btn-primary sms-enable-btn" onClick={handleEnable}>
            Enable SMS Detection
          </button>
          <button className="btn btn-ghost sms-skip-btn" onClick={handleSkip}>
            Maybe Later
          </button>
        </div>
      </div>
    </>
  );
}
