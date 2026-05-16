import { useState, useEffect, useCallback, useRef } from 'react';
import { hashPin, hashSecurityAnswer } from '../../services/crypto';
import { storage } from '../../services/storage';
import { SECURITY_QUESTIONS } from '../../services/categories';
import useStore from '../../store/useStore';
import { SelectPicker } from '../../components/ui/SelectPicker';
import './PinLockScreen.css';

const PIN_LENGTH = 4;

export function PinLockScreen() {
  // Fix #2: use setLocked (now exists in store)
  const setLocked        = useStore((s) => s.setLocked);
  const biometricsEnabled = useStore((s) => s.biometricsEnabled);
  const verifyBiometrics  = useStore((s) => s.verifyBiometrics);

  const [pin, setPin]               = useState('');
  const [mode, setMode]             = useState(storage.hasPinSet() ? 'enter' : 'create');
  const [error, setError]           = useState('');
  const [shake, setShake]           = useState(false);
  const [success, setSuccess]       = useState(false);
  const [showSecQSetup, setShowSecQSetup]   = useState(false);
  const [showRecovery, setShowRecovery]     = useState(false);
  const [secQIndex, setSecQIndex]   = useState('0');
  const [secQAnswer, setSecQAnswer] = useState('');
  const [recoveryAnswer, setRecoveryAnswer] = useState('');

  const firstPinRef = useRef(null);

  useEffect(() => {
    if (mode === 'enter' && biometricsEnabled) {
      const timer = setTimeout(() => { verifyBiometrics(); }, 500);
      return () => clearTimeout(timer);
    }
  }, [mode, biometricsEnabled, verifyBiometrics]);

  const subtitle = { create: 'Create a 4-digit PIN', confirm: 'Confirm your PIN', enter: 'Enter your PIN to continue' }[mode] || '';

  const resetCreateFlow = useCallback(() => {
    firstPinRef.current = null;
    setPin('');
    setMode('create');
  }, []);

  const doShake = useCallback(() => {
    setShake(true);
    setTimeout(() => { setShake(false); setPin(''); }, 600);
  }, []);

  const unlock = useCallback(() => {
    setSuccess(true);
    setTimeout(() => setLocked(false), 500);
  }, [setLocked]);

  useEffect(() => {
    if (pin.length !== PIN_LENGTH) return;
    const timer = setTimeout(async () => {
      if (mode === 'create') {
        firstPinRef.current = pin;
        setMode('confirm');
        setPin('');
        setError('');
      } else if (mode === 'confirm') {
        if (pin === firstPinRef.current) {
          const hash = await hashPin(pin);
          storage.savePinHash(hash);
          firstPinRef.current = null;
          setShowSecQSetup(true);
        } else {
          setError("PINs don't match. Start over.");
          doShake();
          firstPinRef.current = null;
          setTimeout(() => setMode('create'), 600);
        }
      } else if (mode === 'enter') {
        const hash = await hashPin(pin);
        const stored = storage.getPinHash();
        if (hash === stored) { unlock(); }
        else { setError('Wrong PIN. Try again.'); doShake(); }
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [pin, mode, doShake, unlock]);

  useEffect(() => {
    const handler = (e) => {
      if (showSecQSetup || showRecovery) return;
      if (e.key >= '0' && e.key <= '9') { setPin((p) => (p.length < PIN_LENGTH ? p + e.key : p)); setError(''); }
      else if (e.key === 'Backspace') { setPin((p) => p.slice(0, -1)); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showSecQSetup, showRecovery]);

  const addDigit = (d) => { if (pin.length >= PIN_LENGTH) return; setPin((p) => p + d); setError(''); };
  const removeDigit = () => setPin((p) => p.slice(0, -1));

  const handleSaveSecQ = async () => {
    if (!secQAnswer.trim()) { setError('Please provide an answer'); return; }
    const hash = await hashSecurityAnswer(secQAnswer);
    storage.saveSecQ(secQIndex, hash);
    setShowSecQSetup(false);
    unlock();
  };

  const handleVerifyRecovery = async () => {
    if (!recoveryAnswer.trim()) { setError('Please provide an answer'); return; }
    const hash = await hashSecurityAnswer(recoveryAnswer);
    const storedHash = storage.getSecQHash();
    if (hash === storedHash) {
      storage.removePinHash();
      storage.removeSecQ();
      setShowRecovery(false);
      resetCreateFlow();
      setError('');
      setRecoveryAnswer('');
    } else {
      setError('Incorrect answer. Try again.');
    }
  };

  const recoveryQuestion = (() => {
    const idx = storage.getSecQIndex();
    if (idx !== null && SECURITY_QUESTIONS[idx]) return SECURITY_QUESTIONS[idx];
    return null;
  })();

  // Fix #1: SelectPicker options for security questions
  const secQOptions = SECURITY_QUESTIONS.map((q, i) => ({ value: String(i), label: q }));

  if (showSecQSetup) {
    return (
      <div className="lock-screen">
        <div className="lock-bg" /><div className="lock-orb lock-orb-1" /><div className="lock-orb lock-orb-2" />
        <div className="lock-container">
          <LockLogo />
          <p className="lock-subtitle">Add a recovery method</p>
          <div className="sec-q-form">
            <p className="sec-q-instruction">Set up a security question so you can recover your PIN if you forget it.</p>
            <label className="form-label">Security Question</label>
            {/* Fix #1: replace native select with SelectPicker */}
            <SelectPicker
              value={secQIndex}
              onChange={setSecQIndex}
              options={secQOptions}
              placeholder="Choose a question..."
            />
            <label className="form-label" style={{ marginTop: '1rem' }}>Your Answer</label>
            <input className="form-input" type="text" value={secQAnswer} onChange={(e) => setSecQAnswer(e.target.value)} placeholder="Type your answer..." />
            {error && <p className="pin-error">{error}</p>}
            <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} onClick={handleSaveSecQ}>Save & Continue</button>
          </div>
        </div>
      </div>
    );
  }

  if (showRecovery) {
    return (
      <div className="lock-screen">
        <div className="lock-bg" /><div className="lock-orb lock-orb-1" /><div className="lock-orb lock-orb-2" />
        <div className="lock-container">
          <LockLogo />
          <p className="lock-subtitle">Recover PIN</p>
          <div className="sec-q-form">
            <label className="form-label">{recoveryQuestion || 'No security question set.'}</label>
            <input className="form-input" type="text" value={recoveryAnswer} onChange={(e) => setRecoveryAnswer(e.target.value)} placeholder="Type your answer..." disabled={!recoveryQuestion} />
            {error && <p className="pin-error">{error}</p>}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => { setShowRecovery(false); setError(''); }}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleVerifyRecovery} disabled={!recoveryQuestion}>Verify</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lock-screen">
      <div className="lock-bg" /><div className="lock-orb lock-orb-1" /><div className="lock-orb lock-orb-2" /><div className="lock-orb lock-orb-3" />
      <div className="lock-container">
        <LockLogo />
        <p className="lock-subtitle">{subtitle}</p>
        <div className={`pin-dots ${shake ? 'shake' : ''}`}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`pin-dot ${i < pin.length ? 'filled' : ''} ${success ? 'success' : ''} ${shake ? 'error' : ''}`} />
          ))}
        </div>
        {error && <p className="pin-error">{error}</p>}
        <div className="pin-keypad">
          {['1','2','3','4','5','6','7','8','9'].map((d) => (
            <button key={d} className="pin-key" onClick={() => addDigit(d)}>
              <span className="pin-key-num">{d}</span>
            </button>
          ))}
          {biometricsEnabled && mode === 'enter' ? (
            <button className="pin-key pin-key-action" onClick={() => verifyBiometrics()} aria-label="Biometric Login">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 10a2 2 0 0 0-2 2M12 14a2 2 0 0 1-2-2M7 8a7 7 0 0 1 10 10M3 12a10 10 0 0 1 14.9-8.4M17 12a5 5 0 0 1-5 5"/></svg>
            </button>
          ) : (
            <div className="pin-key pin-key-ghost" />
          )}
          <button className="pin-key" onClick={() => addDigit('0')}><span className="pin-key-num">0</span></button>
          <button className="pin-key pin-key-action" onClick={removeDigit} aria-label="Backspace">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M21 12H9M9 12l4-4M9 12l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
        {mode === 'enter' && (
          <div className="lock-links">
            <button className="lock-link" onClick={() => { storage.removePinHash(); storage.removeSecQ(); resetCreateFlow(); setError(''); }}>Change PIN</button>
            <span className="lock-link-divider">•</span>
            <button className="lock-link" onClick={() => { setShowRecovery(true); setError(''); }}>Forgot PIN?</button>
          </div>
        )}
      </div>
    </div>
  );
}

function LockLogo() {
  return (
    <div className="lock-logo">
      <div className="lock-logo-icon">
        <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="9" fill="url(#lg2)"/>
          <path d="M10 20V16M16 20V12M22 20V9" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
          <defs><linearGradient id="lg2" x1="0" y1="0" x2="32" y2="32"><stop stopColor="#6366f1"/><stop offset="1" stopColor="#a78bfa"/></linearGradient></defs>
        </svg>
      </div>
      <h1 className="lock-title">WealthPulse</h1>
    </div>
  );
}
