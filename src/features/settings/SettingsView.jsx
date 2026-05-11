import { useState, useRef, useMemo } from 'react';
import useStore from '../../store/useStore';
import { ConfirmModal, Modal } from '../../components/ui/Modal';
import { storage } from '../../services/storage';
import { hashPin, hashSecurityAnswer } from '../../services/crypto';
import { SECURITY_QUESTIONS } from '../../services/categories';
import './SettingsView.css';

export function SettingsView({ showToast }) {
  const resetAll               = useStore((s) => s.resetAll);
  const exportData             = useStore((s) => s.exportData);
  const importData             = useStore((s) => s.importData);
  const transactions           = useStore((s) => s.transactions);
  const privacyMode            = useStore((s) => s.privacyMode);
  const togglePrivacy          = useStore((s) => s.togglePrivacy);
  const smsEnabled             = useStore((s) => s.smsEnabled);
  const setSmsEnabled          = useStore((s) => s.setSmsEnabled);
  const bgServiceEnabled       = useStore((s) => s.bgServiceEnabled);
  const toggleBgService        = useStore((s) => s.toggleBgService);
  const biometricsEnabled      = useStore((s) => s.biometricsEnabled);
  const setBiometricsEnabled   = useStore((s) => s.setBiometricsEnabled);
  const isBiometricAvailable   = useStore((s) => s.isBiometricAvailable);
  const budgetAlertsEnabled    = useStore((s) => s.budgetAlertsEnabled);
  const setBudgetAlertsEnabled = useStore((s) => s.setBudgetAlertsEnabled);
  const settlementAlertsEnabled    = useStore((s) => s.settlementAlertsEnabled);
  const setSettlementAlertsEnabled = useStore((s) => s.setSettlementAlertsEnabled);
  const theme    = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showChangePinModal, setShowChangePinModal] = useState(false);
  const [showSecQModal, setShowSecQModal] = useState(false);

  // Change PIN state
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');

  // Security Question state
  const [secQIndex, setSecQIndex] = useState(storage.getSecQIndex() || '0');
  const [secQAnswer, setSecQAnswer] = useState('');

  const fileRef = useRef(null);

  const storageUsed = useMemo(() => {
    let total = 0;
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith('wp_')) total += localStorage.getItem(k)?.length || 0;
    });
    if (total > 1024) return (total / 1024).toFixed(1) + ' KB';
    return total + ' bytes';
  }, [transactions]);

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wealthpulse-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast?.('Data exported successfully');
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        importData(data);
        showToast?.('Data imported successfully');
      } catch {
        showToast?.('Invalid file format');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleReset = () => {
    resetAll();
    showToast?.('All data has been reset');
    setTimeout(() => window.location.reload(), 500);
  };

  const handleChangePin = async (e) => {
    e.preventDefault();
    setPinError('');
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setPinError('PIN must be exactly 4 digits');
      return;
    }
    if (newPin !== confirmPin) {
      setPinError("New PINs don't match");
      return;
    }
    const storedHash = storage.getPinHash();
    // Require current PIN verification only if one is already set
    if (storedHash) {
      const currentHash = await hashPin(currentPin);
      if (currentHash !== storedHash) {
        setPinError('Current PIN is incorrect');
        return;
      }
    }
    const newHash = await hashPin(newPin);
    storage.savePinHash(newHash);
    // Clear old security question so the lock screen doesn't have stale recovery data
    storage.removeSecQ();
    setShowChangePinModal(false);
    setCurrentPin(''); setNewPin(''); setConfirmPin('');
    showToast?.('PIN updated — please set a new security question');
  };

  const handleSaveSecQ = async (e) => {
    e.preventDefault();
    if (!secQAnswer.trim()) return;
    const hash = await hashSecurityAnswer(secQAnswer);
    storage.saveSecQ(secQIndex, hash);
    setShowSecQModal(false);
    setSecQAnswer('');
    showToast?.('Security question updated');
  };

  return (
    <div className="settings-view animate-in">
      <div>
        <h2 className="view-title">Settings</h2>
        <p className="view-subtitle">Customize your experience</p>
      </div>

      {/* Account & Security */}
      <div className="settings-card animate-bounce" style={{ animationDelay: '0.1s' }}>
        <h3 className="settings-card-title">🔐 Account & Security</h3>
        <div className="settings-list">
          <button className="settings-item" onClick={() => setShowChangePinModal(true)}>
            <div className="settings-item-main">
              <div className="settings-item-icon">🔢</div>
              <div className="settings-item-text">
                <div className="settings-item-title">Change PIN</div>
                <div className="settings-item-subtitle">Update your security PIN</div>
              </div>
            </div>
            <span className="settings-chevron">›</span>
          </button>
          <button className="settings-item" onClick={() => setShowSecQModal(true)}>
            <div className="settings-item-main">
              <div className="settings-item-icon">❓</div>
              <div className="settings-item-text">
                <div className="settings-item-title">Security Question</div>
                <div className="settings-item-subtitle">Update recovery question</div>
              </div>
            </div>
            <span className="settings-chevron">›</span>
          </button>
          {isBiometricAvailable && (
            <div className="settings-item">
              <div className="settings-item-main">
                <div className="settings-item-icon">☝️</div>
                <div className="settings-item-text">
                  <div className="settings-item-title">Biometric Login</div>
                  <div className="settings-item-subtitle">Use fingerprint or face</div>
                </div>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" checked={biometricsEnabled}
                  onChange={(e) => {
                    setBiometricsEnabled(e.target.checked);
                    showToast?.(e.target.checked ? 'Biometrics enabled' : 'Biometrics disabled');
                  }} />
                <span className="toggle-slider" />
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Appearance */}
      <div className="settings-card animate-bounce" style={{ animationDelay: '0.2s' }}>
        <h3 className="settings-card-title">🎨 Appearance</h3>
        <div className="settings-list">
          <div className="settings-item">
            <div className="settings-item-main">
              <div className="settings-item-icon">👁️</div>
              <div className="settings-item-text">
                <div className="settings-item-title">Privacy Mode</div>
                <div className="settings-item-subtitle">Blur amounts on dashboard</div>
              </div>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={privacyMode} onChange={togglePrivacy} />
              <span className="toggle-slider" />
            </label>
          </div>
          <div className="settings-item">
            <div className="settings-item-main">
              <div className="settings-item-icon">🌙</div>
              <div className="settings-item-text">
                <div className="settings-item-title">Theme</div>
                <div className="settings-item-subtitle">Choose appearance</div>
              </div>
            </div>
            <select className="settings-select" value={theme} onChange={(e) => setTheme(e.target.value)}>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="auto">Auto</option>
            </select>
          </div>
        </div>
      </div>

      {/* Backup & Data */}
      <div className="settings-card animate-bounce" style={{ animationDelay: '0.3s' }}>
        <h3 className="settings-card-title">💾 Backup & Data</h3>
        <div className="settings-list">
          <button className="settings-item" onClick={handleExport}>
            <div className="settings-item-main">
              <div className="settings-item-icon">📤</div>
              <div className="settings-item-text">
                <div className="settings-item-title">Export Data</div>
                <div className="settings-item-subtitle">Download JSON backup</div>
              </div>
            </div>
            <span className="settings-chevron">›</span>
          </button>
          <button className="settings-item" onClick={() => fileRef.current?.click()}>
            <div className="settings-item-main">
              <div className="settings-item-icon">📥</div>
              <div className="settings-item-text">
                <div className="settings-item-title">Import Data</div>
                <div className="settings-item-subtitle">Restore from backup</div>
              </div>
            </div>
            <span className="settings-chevron">›</span>
          </button>
          <input ref={fileRef} type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
          <button className="settings-item" onClick={() => setShowResetConfirm(true)}>
            <div className="settings-item-main">
              <div className="settings-item-icon" style={{ color: 'var(--accent-red)' }}>🗑️</div>
              <div className="settings-item-text">
                <div className="settings-item-title" style={{ color: 'var(--accent-red)' }}>Reset All Data</div>
                <div className="settings-item-subtitle">⚠️ Deletes everything</div>
              </div>
            </div>
            <span className="settings-chevron" style={{ color: 'var(--accent-red)' }}>›</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      <div className="settings-card animate-bounce" style={{ animationDelay: '0.4s' }}>
        <h3 className="settings-card-title">🔔 Notifications</h3>
        <div className="settings-list">
          <div className="settings-item">
            <div className="settings-item-main">
              <div className="settings-item-icon">⚠️</div>
              <div className="settings-item-text">
                <div className="settings-item-title">Budget Alerts</div>
                <div className="settings-item-subtitle">Notify when budget limit is reached</div>
              </div>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={budgetAlertsEnabled}
                onChange={(e) => {
                  setBudgetAlertsEnabled(e.target.checked);
                  showToast?.(e.target.checked ? 'Budget alerts enabled' : 'Budget alerts disabled');
                }} />
              <span className="toggle-slider" />
            </label>
          </div>
          <div className="settings-item">
            <div className="settings-item-main">
              <div className="settings-item-icon">💸</div>
              <div className="settings-item-text">
                <div className="settings-item-title">Settlement Reminders</div>
                <div className="settings-item-subtitle">Remind after 3 days</div>
              </div>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={settlementAlertsEnabled}
                onChange={(e) => {
                  setSettlementAlertsEnabled(e.target.checked);
                  showToast?.(e.target.checked ? 'Settlement reminders enabled' : 'Settlement reminders disabled');
                }} />
              <span className="toggle-slider" />
            </label>
          </div>
          <div className="settings-item">
            <div className="settings-item-main">
              <div className="settings-item-icon">📨</div>
              <div className="settings-item-text">
                <div className="settings-item-title">SMS Auto-capture</div>
                <div className="settings-item-subtitle">
                  {smsEnabled ? 'Auto-detecting HDFC transactions' : 'Off — enable to detect bank SMS'}
                </div>
              </div>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={smsEnabled}
                onChange={(e) => {
                  setSmsEnabled(e.target.checked);
                  showToast?.(e.target.checked ? 'SMS Auto-capture enabled' : 'SMS Auto-capture disabled');
                }} />
              <span className="toggle-slider" />
            </label>
          </div>
          <div className="settings-item">
            <div className="settings-item-main">
              <div className="settings-item-icon">⚡</div>
              <div className="settings-item-text">
                <div className="settings-item-title">Background Tracking</div>
                <div className="settings-item-subtitle">Keep app alive for better SMS detection</div>
              </div>
            </div>
            <label className="toggle-switch">
              <input type="checkbox" checked={bgServiceEnabled}
                onChange={async () => {
                  await toggleBgService();
                  showToast?.('Background tracking updated');
                }} />
              <span className="toggle-slider" />
            </label>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="settings-card animate-bounce" style={{ animationDelay: '0.5s' }}>
        <h3 className="settings-card-title">ℹ️ About</h3>
        <div className="settings-list">
          <div className="settings-item"><div className="settings-item-main"><div className="settings-item-text"><div className="settings-item-title">Version</div><div className="settings-item-subtitle">v3.3.1 (React)</div></div></div></div>
          <div className="settings-item"><div className="settings-item-main"><div className="settings-item-text"><div className="settings-item-title">Storage Used</div><div className="settings-item-subtitle">{storageUsed}</div></div></div></div>
          <div className="settings-item"><div className="settings-item-main"><div className="settings-item-text"><div className="settings-item-title">Total Transactions</div><div className="settings-item-subtitle">{transactions.length}</div></div></div></div>
        </div>
      </div>

      {/* Change PIN Modal */}
      <Modal isOpen={showChangePinModal} onClose={() => { setShowChangePinModal(false); setPinError(''); setCurrentPin(''); setNewPin(''); setConfirmPin(''); }} title="Change PIN">
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem', fontSize: '0.875rem' }}>
          Enter your current PIN, then set a new one. Your security question will be cleared and you'll be asked to set a new one.
        </p>
        <form onSubmit={handleChangePin}>
          {storage.hasPinSet() && (
            <div className="form-group">
              <label className="form-label">Current PIN</label>
              <input className="form-input pin-input" type="password" maxLength={4} pattern="[0-9]{4}" inputMode="numeric"
                value={currentPin} onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter current PIN" required />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">New PIN</label>
            <input className="form-input pin-input" type="password" maxLength={4} pattern="[0-9]{4}" inputMode="numeric"
              value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter new PIN" required />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm New PIN</label>
            <input className="form-input pin-input" type="password" maxLength={4} pattern="[0-9]{4}" inputMode="numeric"
              value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Confirm new PIN" required />
          </div>
          {pinError && <p className="pin-error" style={{ marginTop: '0.5rem' }}>{pinError}</p>}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setShowChangePinModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Update PIN</button>
          </div>
        </form>
      </Modal>

      {/* Security Question Modal */}
      <Modal isOpen={showSecQModal} onClose={() => { setShowSecQModal(false); setSecQAnswer(''); }} title="Security Question">
        <form onSubmit={handleSaveSecQ}>
          <div className="form-group">
            <label className="form-label">Security Question</label>
            <select className="form-select" value={secQIndex} onChange={(e) => setSecQIndex(e.target.value)}>
              {SECURITY_QUESTIONS.map((q, i) => <option key={i} value={i}>{q}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label className="form-label">Your Answer</label>
            <input className="form-input" type="text" value={secQAnswer}
              onChange={(e) => setSecQAnswer(e.target.value)} placeholder="Enter your answer" required />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setShowSecQModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal isOpen={showResetConfirm} onClose={() => setShowResetConfirm(false)} onConfirm={handleReset}
        message="Reset everything? This will delete all transactions, budgets, people, groups, expenses, PIN, and recovery settings." />
    </div>
  );
}
