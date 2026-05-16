import { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import useStore from '../../store/useStore';
import { Modal, ConfirmModal } from '../../components/ui/Modal';
import { SelectPicker } from '../../components/ui/SelectPicker';
import { formatCurrency, getMonthKey } from '../../utils/formatters';
import { useSwipeTabs } from '../../hooks/useSwipeTabs';
import { hashPin } from '../../services/crypto';
import { storage } from '../../services/storage';

const EMOJI_PRESETS = ['🏠','🚗','📱','✈️','💍','🎓','💻','🏋️','🌴','💰','🏦','📈','🛡️','🎯','👶','🏡'];
const GOAL_COLORS   = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16'];

function ProgressRing({ pct, size = 72, stroke = 7, color = '#6366f1' }) {
  const r    = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * Math.min(pct / 100, 1);
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border-subtle)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.5s ease' }} />
    </svg>
  );
}

function TabBtn({ id, label, active, onClick }) {
  return (
    <button onClick={() => onClick(id)} style={{
      padding: '0.45rem 1rem', borderRadius: 'var(--radius-full)',
      border: active ? '1.5px solid var(--accent-indigo)' : '1.5px solid var(--border-subtle)',
      background: active ? 'rgba(99,102,241,0.12)' : 'transparent',
      color: active ? 'var(--accent-indigo)' : 'var(--text-secondary)',
      fontSize: '0.78rem', fontWeight: active ? 600 : 400,
      cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
    }}>{label}</button>
  );
}

function SCard({ children, style = {} }) {
  return <div className="card" style={{ marginBottom: '0.85rem', padding: '1rem', ...style }}>{children}</div>;
}

// ── Planning Lock Screen ─────────────────────────────────────
function PlanningLock({ onUnlock }) {
  const biometricsEnabled = useStore((s) => s.biometricsEnabled);
  const verifyBiometrics  = useStore((s) => s.verifyBiometrics);
  const [pin, setPin]     = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  const PIN_LENGTH = 4;
  const hasPinSet  = storage.hasPinSet();

  // Auto-trigger biometrics on mount
  useEffect(() => {
    if (biometricsEnabled) {
      setTimeout(async () => {
        const ok = await verifyBiometrics();
        if (ok) onUnlock();
      }, 300);
    }
  }, []);

  const doShake = useCallback(() => {
    setShake(true);
    setTimeout(() => { setShake(false); setPin(''); }, 600);
  }, []);

  // Check PIN when 4 digits entered
  useEffect(() => {
    if (pin.length !== PIN_LENGTH) return;
    const t = setTimeout(async () => {
      const hash   = await hashPin(pin);
      const stored = storage.getPinHash();
      if (hash === stored) {
        onUnlock();
      } else {
        setError('Wrong PIN');
        doShake();
      }
    }, 150);
    return () => clearTimeout(t);
  }, [pin]);

  const addDigit = (d) => { if (pin.length >= PIN_LENGTH) return; setPin((p) => p + d); setError(''); };
  const delDigit = () => setPin((p) => p.slice(0, -1));

  // If no PIN is set, unlock immediately (first-time user)
  if (!hasPinSet) { onUnlock(); return null; }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      {/* Icon */}
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem', boxShadow: '0 8px 32px rgba(99,102,241,0.35)' }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>
      <h2 style={{ fontWeight: 700, fontSize: '1.2rem', marginBottom: '0.35rem' }}>Finance & Planning</h2>
      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '2rem', textAlign: 'center' }}>Enter your PIN to access your financial data</p>

      {/* PIN dots */}
      <div className={shake ? 'shake' : ''} style={{ display: 'flex', gap: '0.85rem', marginBottom: '0.75rem' }}>
        {[0,1,2,3].map((i) => (
          <div key={i} style={{
            width: 14, height: 14, borderRadius: '50%',
            background: i < pin.length ? 'var(--accent-indigo)' : 'transparent',
            border: '2px solid',
            borderColor: i < pin.length ? 'var(--accent-indigo)' : 'var(--border-bright)',
            transition: 'all 0.15s',
          }} />
        ))}
      </div>
      {error && <p style={{ fontSize: '0.78rem', color: 'var(--accent-red)', marginBottom: '0.75rem' }}>{error}</p>}

      {/* Keypad */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.6rem', width: '100%', maxWidth: 260, marginTop: '0.5rem' }}>
        {['1','2','3','4','5','6','7','8','9'].map((d) => (
          <button key={d} onClick={() => addDigit(d)}
            style={{ height: 58, borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', fontSize: '1.25rem', fontWeight: 600, cursor: 'pointer', color: 'var(--text-primary)', transition: 'background 0.1s' }}>
            {d}
          </button>
        ))}
        {/* Biometric / empty */}
        {biometricsEnabled ? (
          <button onClick={async () => { const ok = await verifyBiometrics(); if (ok) onUnlock(); }}
            style={{ height: 58, borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-indigo)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 10a2 2 0 0 0-2 2M12 14a2 2 0 0 1-2-2M7 8a7 7 0 0 1 10 10M3 12a10 10 0 0 1 14.9-8.4M17 12a5 5 0 0 1-5 5"/></svg>
          </button>
        ) : <div />}
        <button onClick={() => addDigit('0')}
          style={{ height: 58, borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', fontSize: '1.25rem', fontWeight: 600, cursor: 'pointer', color: 'var(--text-primary)' }}>
          0
        </button>
        <button onClick={delDigit}
          style={{ height: 58, borderRadius: 'var(--radius-md)', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M21 12H9M9 12l4-4M9 12l4 4" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>
    </div>
  );
}

// ── 1. SAVINGS GOALS ──────────────────────────────────────────
function GoalsTab({ privacyMode }) {
  const blur = privacyMode ? 'private-blur' : '';
  const goals = useStore((s) => s.goals);
  const addGoal = useStore((s) => s.addGoal);
  const updateGoal = useStore((s) => s.updateGoal);
  const deleteGoal = useStore((s) => s.deleteGoal);
  const contributeToGoal = useStore((s) => s.contributeToGoal);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showContrib, setShowContrib] = useState(null);
  const [contribAmt, setContribAmt] = useState('');
  const [showDel, setShowDel] = useState(null);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🎯');
  const [color, setColor] = useState('#6366f1');
  const [target, setTarget] = useState('');
  const [saved, setSaved] = useState('');
  const [deadline, setDeadline] = useState('');

  const openAdd = () => { setEditing(null); setName(''); setEmoji('🎯'); setColor('#6366f1'); setTarget(''); setSaved(''); setDeadline(''); setShowForm(true); };
  const openEdit = (g) => { setEditing(g); setName(g.name); setEmoji(g.emoji); setColor(g.color); setTarget(String(g.targetAmount)); setSaved(String(g.savedAmount)); setDeadline(g.deadline || ''); setShowForm(true); };
  const handleSave = (e) => {
    e.preventDefault();
    const d = { name: name.trim(), emoji, color, targetAmount: parseFloat(target), savedAmount: parseFloat(saved) || 0, deadline: deadline || null };
    if (!d.name || !d.targetAmount) return;
    editing ? updateGoal(editing.id, d) : addGoal(d);
    setShowForm(false);
  };
  const handleContrib = () => {
    const amt = parseFloat(contribAmt);
    if (!amt || amt <= 0) return;
    contributeToGoal(showContrib, amt);
    setShowContrib(null); setContribAmt('');
  };

  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
  const totalSaved  = goals.reduce((s, g) => s + g.savedAmount, 0);

  return (
    <div>
      {goals.length > 0 && (
        <SCard>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Goals</div><div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{goals.length}</div></div>
            <div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Target</div><div className={blur} style={{ fontSize: '1.1rem', fontWeight: 700 }}>{formatCurrency(totalTarget)}</div></div>
            <div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Saved</div><div className={blur} style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-green)' }}>{formatCurrency(totalSaved)}</div></div>
          </div>
        </SCard>
      )}
      {goals.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🎯</div>
          <p style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>No savings goals yet</p>
          <p style={{ fontSize: '0.85rem' }}>Create a goal to track your savings progress</p>
        </div>
      ) : goals.map((g) => {
        const pct = g.targetAmount > 0 ? Math.round((g.savedAmount / g.targetAmount) * 100) : 0;
        const remaining = g.targetAmount - g.savedAmount;
        const daysLeft = g.deadline ? Math.ceil((new Date(g.deadline) - new Date()) / 86400000) : null;
        const projDate = remaining > 0 && g.savedAmount > 0 && g.createdAt ? (() => {
          const daysSince = Math.max(1, Math.ceil((new Date() - new Date(g.createdAt)) / 86400000));
          const daily = g.savedAmount / daysSince;
          if (daily <= 0) return null;
          const d = new Date(); d.setDate(d.getDate() + Math.ceil(remaining / daily));
          return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
        })() : null;
        return (
          <SCard key={g.id}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
                <ProgressRing pct={pct} color={g.color} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>{g.emoji}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: 2 }}>{g.name}</div>
                <div className={blur} style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  {formatCurrency(g.savedAmount)} <span style={{ color: 'var(--text-muted)' }}>of {formatCurrency(g.targetAmount)}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap', fontSize: '0.72rem' }}>
                  <span style={{ fontWeight: 700, color: g.color }}>{pct}%</span>
                  {daysLeft !== null && <span style={{ color: daysLeft < 30 ? 'var(--accent-red)' : 'var(--text-muted)' }}>{daysLeft > 0 ? `${daysLeft}d left` : 'Deadline passed'}</span>}
                  {projDate && pct < 100 && <span style={{ color: 'var(--text-muted)' }}>Est. {projDate}</span>}
                  {pct >= 100 && <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>✅ Achieved!</span>}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <button onClick={() => { setShowContrib(g.id); setContribAmt(''); }} className="btn btn-primary" style={{ fontSize: '0.72rem', padding: '0.3rem 0.65rem' }}>+ Add</button>
                <button onClick={() => openEdit(g)} className="btn btn-ghost" style={{ fontSize: '0.72rem', padding: '0.3rem 0.65rem' }}>Edit</button>
              </div>
            </div>
          </SCard>
        );
      })}
      <button className="btn btn-primary" onClick={openAdd} style={{ width: '100%', marginTop: goals.length ? '0.25rem' : 0 }}>+ New Goal</button>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Goal' : 'New Savings Goal'}>
        <form onSubmit={handleSave}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {EMOJI_PRESETS.map((em) => (
              <button key={em} type="button" onClick={() => setEmoji(em)}
                style={{ fontSize: '1.4rem', padding: '0.3rem 0.4rem', borderRadius: 'var(--radius-sm)', border: emoji === em ? '2px solid var(--accent-indigo)' : '2px solid transparent', background: emoji === em ? 'rgba(99,102,241,0.1)' : 'transparent', cursor: 'pointer' }}>
                {em}
              </button>
            ))}
          </div>
          <div className="form-group"><label className="form-label">Goal Name</label><input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. iPhone Fund" required maxLength={40} autoFocus /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group"><label className="form-label">Target (₹)</label><input className="form-input" type="number" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="80000" min="1" required /></div>
            <div className="form-group"><label className="form-label">Already Saved (₹)</label><input className="form-input" type="number" value={saved} onChange={(e) => setSaved(e.target.value)} placeholder="0" min="0" /></div>
          </div>
          <div className="form-group"><label className="form-label">Deadline <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label><input className="form-input" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></div>
          <div className="form-group">
            <label className="form-label">Color</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {GOAL_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: color === c ? '3px solid white' : '3px solid transparent', outline: color === c ? `2px solid ${c}` : 'none', cursor: 'pointer' }} />
              ))}
            </div>
          </div>
          <div className="modal-actions" style={{ marginTop: '1.25rem' }}>
            {editing && <button type="button" className="btn btn-danger" onClick={() => { setShowForm(false); setShowDel(editing.id); }}>Delete</button>}
            <div style={{ flex: 1 }} />
            <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!showContrib} onClose={() => setShowContrib(null)} title="Add to Goal">
        <div className="form-group"><label className="form-label">Amount (₹)</label><input className="form-input" type="number" autoFocus value={contribAmt} onChange={(e) => setContribAmt(e.target.value)} placeholder="Enter amount" min="1" /></div>
        <div className="modal-actions" style={{ marginTop: '1rem' }}>
          <button className="btn btn-ghost" onClick={() => setShowContrib(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleContrib}>Add ✓</button>
        </div>
      </Modal>
      <ConfirmModal isOpen={!!showDel} onClose={() => setShowDel(null)} onConfirm={() => { deleteGoal(showDel); setShowDel(null); }} message="Delete this savings goal?" />
    </div>
  );
}

// ── 2. EMI TRACKER ────────────────────────────────────────────
function calcEmi(p, rate, n) {
  if (!p || !n) return 0;
  const r = (rate || 0) / 12 / 100;
  if (r === 0) return p / n;
  return p * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
}

function getAmort(principal, rate, tenure, startDate, prepayments = []) {
  const r = (rate || 0) / 12 / 100;
  let bal = principal;
  const rows = [];
  // Use the actual start date for month 1, then 1st of each subsequent month
  const start = new Date(startDate);
  const preps = [...prepayments].sort((a, b) => a.date.localeCompare(b.date));
  let pi = 0;
  for (let i = 0; i < tenure && bal > 0.01; i++) {
    // EMI due date: same day-of-month as start, in subsequent months
    const dueDate = i === 0
      ? new Date(start)
      : new Date(start.getFullYear(), start.getMonth() + i, start.getDate());
    const emi = calcEmi(bal, rate, tenure - i);
    const interest = bal * r;
    const pPay = Math.min(emi - interest, bal);
    bal -= pPay;
    const dStr = dueDate.toISOString().split('T')[0];
    while (pi < preps.length && preps[pi].date <= dStr) { bal = Math.max(0, bal - preps[pi].amount); pi++; }
    rows.push({ month: i + 1, date: dueDate, dueStr: dStr, interest, principal: pPay, balance: Math.max(0, bal) });
    if (bal < 0.01) break;
  }
  return rows;
}

const EMI_EMOJIS = ['🏠','🚗','📱','🎓','💊','🏪','✈️','💳'];

function EmiTab({ privacyMode }) {
  const blur = privacyMode ? 'private-blur' : '';
  const emis = useStore((s) => s.emis);
  const addEmi = useStore((s) => s.addEmi);
  const updateEmi = useStore((s) => s.updateEmi);
  const deleteEmi = useStore((s) => s.deleteEmi);
  const addPrepayment = useStore((s) => s.addPrepayment);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [showPrepay, setShowPrepay] = useState(null);
  const [prepAmt, setPrepAmt] = useState('');
  const [prepDate, setPrepDate] = useState(new Date().toISOString().split('T')[0]);
  const [showDel, setShowDel] = useState(null);
  const [eName, setEName] = useState('');
  const [eEmoji, setEEmoji] = useState('🏠');
  const [ePrin, setEPrin] = useState('');
  const [eRate, setERate] = useState('');
  const [eTen, setETen] = useState('');
  const [eStart, setEStart] = useState(new Date().toISOString().split('T')[0]);

  const preview = calcEmi(parseFloat(ePrin) || 0, parseFloat(eRate) || 0, parseInt(eTen) || 0);

  const openAdd = () => { setEditing(null); setEName(''); setEEmoji('🏠'); setEPrin(''); setERate(''); setETen(''); setEStart(new Date().toISOString().split('T')[0]); setShowForm(true); };
  const openEdit = (em) => { setEditing(em); setEName(em.name); setEEmoji(em.emoji); setEPrin(String(em.principalAmount)); setERate(String(em.interestRate)); setETen(String(em.tenureMonths)); setEStart(em.startDate); setShowForm(true); };
  const handleSave = (e) => {
    e.preventDefault();
    const d = { name: eName.trim(), emoji: eEmoji, principalAmount: parseFloat(ePrin), interestRate: parseFloat(eRate) || 0, tenureMonths: parseInt(eTen), startDate: eStart, emiAmount: Math.round(preview) };
    if (!d.name || !d.principalAmount || !d.tenureMonths) return;
    editing ? updateEmi(editing.id, d) : addEmi(d);
    setShowForm(false);
  };
  const handlePrepay = () => {
    const amt = parseFloat(prepAmt);
    if (!amt || !showPrepay) return;
    addPrepayment(showPrepay, amt, prepDate);
    setShowPrepay(null); setPrepAmt('');
  };
  const totalEmi = emis.reduce((s, e) => s + (e.emiAmount || 0), 0);

  return (
    <div>
      {emis.length > 0 && (
        <SCard>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Loans</div><div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{emis.length}</div></div>
            <div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Monthly Outflow</div><div className={blur} style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-red)' }}>{formatCurrency(Math.round(totalEmi))}</div></div>
          </div>
        </SCard>
      )}
      {emis.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🏦</div>
          <p style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>No EMIs tracked</p>
          <p style={{ fontSize: '0.85rem' }}>Add a loan to track your EMI schedule</p>
        </div>
      ) : emis.map((em) => {
        const amort = getAmort(em.principalAmount, em.interestRate, em.tenureMonths, em.startDate, em.prepayments);
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        // Count EMIs whose due date has passed (strictly before today)
        const elapsed = amort.filter((r) => r.dueStr < todayStr).length;
        const remaining = amort.length - elapsed;
        const paidP = amort.slice(0, elapsed).reduce((s, r) => s + r.principal, 0);
        const totalInt = amort.reduce((s, r) => s + r.interest, 0);
        const paidInt = amort.slice(0, elapsed).reduce((s, r) => s + r.interest, 0);
        const payoff = amort.length > 0 ? amort[amort.length - 1].date : null;
        const pct = em.tenureMonths > 0 ? Math.round((elapsed / em.tenureMonths) * 100) : 0;
        // Use amortization table's running balance directly — most accurate
        const balance = elapsed > 0 ? amort[elapsed - 1].balance : em.principalAmount;
        const isExpanded = expanded === em.id;
        return (
          <SCard key={em.id}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', cursor: 'pointer' }} onClick={() => setExpanded(isExpanded ? null : em.id)}>
              <div style={{ fontSize: '1.75rem', flexShrink: 0 }}>{em.emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{em.name}</div>
                <div className={blur} style={{ fontSize: '0.82rem', color: 'var(--accent-red)', fontWeight: 700 }}>{formatCurrency(Math.round(em.emiAmount || 0))}/mo</div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.3rem', flexWrap: 'wrap', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  <span>{elapsed}/{em.tenureMonths} paid</span><span>·</span><span>{remaining} left</span>
                  {payoff && <><span>·</span><span>Ends {payoff.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span></>}
                </div>
                <div style={{ height: 4, background: 'var(--border-subtle)', borderRadius: 2, overflow: 'hidden', marginTop: '0.5rem' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: 'var(--accent-indigo)', borderRadius: 2, transition: 'width 0.5s' }} />
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0, marginTop: 4 }}><path d="M6 9l6 6 6-6"/></svg>
            </div>
            {isExpanded && (
              <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '0.6rem', marginBottom: '1rem' }}>
                  {[
                    { l: 'Principal',     v: formatCurrency(em.principalAmount),        c: 'var(--text-primary)' },
                    { l: 'Rate',          v: `${em.interestRate}% p.a.`,                c: 'var(--text-primary)' },
                    { l: 'Total Interest',v: formatCurrency(Math.round(totalInt)),       c: 'var(--accent-red)' },
                    { l: 'Interest Paid', v: formatCurrency(Math.round(paidInt)),        c: 'var(--text-muted)' },
                    { l: 'Principal Paid',v: formatCurrency(Math.round(paidP)),          c: 'var(--accent-green)' },
                    { l: 'Outstanding',   v: formatCurrency(Math.round(balance)),        c: 'var(--accent-indigo)' },
                  ].map((s) => (
                    <div key={s.l} style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.65rem' }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{s.l}</div>
                      <div className={blur} style={{ fontSize: '0.88rem', fontWeight: 700, color: s.c }}>{s.v}</div>
                    </div>
                  ))}
                </div>
                {(em.prepayments || []).length > 0 && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>Prepayments</div>
                    {em.prepayments.map((p) => (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', padding: '2px 0' }}>
                        <span>{p.date}</span><span className={blur} style={{ color: 'var(--accent-green)', fontWeight: 600 }}>-{formatCurrency(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-ghost" style={{ flex: 1, fontSize: '0.78rem' }} onClick={() => { setShowPrepay(em.id); setPrepAmt(''); }}>+ Prepay</button>
                  <button className="btn btn-ghost" style={{ flex: 1, fontSize: '0.78rem' }} onClick={() => openEdit(em)}>Edit</button>
                  <button className="btn btn-danger" style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem' }} onClick={() => setShowDel(em.id)}>Delete</button>
                </div>
              </div>
            )}
          </SCard>
        );
      })}
      <button className="btn btn-primary" onClick={openAdd} style={{ width: '100%', marginTop: emis.length ? '0.25rem' : 0 }}>+ Add EMI / Loan</button>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit EMI' : 'Add EMI / Loan'}>
        <form onSubmit={handleSave}>
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {EMI_EMOJIS.map((em) => (
              <button key={em} type="button" onClick={() => setEEmoji(em)}
                style={{ fontSize: '1.4rem', padding: '0.3rem 0.4rem', borderRadius: 'var(--radius-sm)', border: eEmoji === em ? '2px solid var(--accent-indigo)' : '2px solid transparent', background: eEmoji === em ? 'rgba(99,102,241,0.1)' : 'transparent', cursor: 'pointer' }}>
                {em}
              </button>
            ))}
          </div>
          <div className="form-group"><label className="form-label">Loan Name</label><input className="form-input" value={eName} onChange={(e) => setEName(e.target.value)} placeholder="e.g. Home Loan - SBI" required maxLength={60} autoFocus /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group"><label className="form-label">Principal (₹)</label><input className="form-input" type="number" value={ePrin} onChange={(e) => setEPrin(e.target.value)} placeholder="2500000" min="1" required /></div>
            <div className="form-group"><label className="form-label">Rate (% p.a.)</label><input className="form-input" type="number" value={eRate} onChange={(e) => setERate(e.target.value)} placeholder="8.5" min="0" step="0.01" /></div>
            <div className="form-group"><label className="form-label">Tenure (months)</label><input className="form-input" type="number" value={eTen} onChange={(e) => setETen(e.target.value)} placeholder="240" min="1" required /></div>
            <div className="form-group"><label className="form-label">Start Date</label><input className="form-input" type="date" value={eStart} onChange={(e) => setEStart(e.target.value)} required /></div>
          </div>
          {preview > 0 && (
            <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 'var(--radius-sm)', padding: '0.65rem 0.9rem', fontSize: '0.85rem', color: 'var(--accent-indigo)', fontWeight: 600, marginBottom: '0.5rem' }}>
              Monthly EMI: {formatCurrency(Math.round(preview))}
            </div>
          )}
          <div className="modal-actions" style={{ marginTop: '1rem' }}>
            {editing && <button type="button" className="btn btn-danger" onClick={() => { setShowForm(false); setShowDel(editing.id); }}>Delete</button>}
            <div style={{ flex: 1 }} />
            <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!showPrepay} onClose={() => setShowPrepay(null)} title="Add Prepayment">
        <div className="form-group"><label className="form-label">Amount (₹)</label><input className="form-input" type="number" autoFocus value={prepAmt} onChange={(e) => setPrepAmt(e.target.value)} placeholder="50000" min="1" /></div>
        <div className="form-group"><label className="form-label">Date</label><input className="form-input" type="date" value={prepDate} onChange={(e) => setPrepDate(e.target.value)} /></div>
        <div className="modal-actions" style={{ marginTop: '1rem' }}>
          <button className="btn btn-ghost" onClick={() => setShowPrepay(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={handlePrepay}>Save</button>
        </div>
      </Modal>
      <ConfirmModal isOpen={!!showDel} onClose={() => setShowDel(null)} onConfirm={() => { deleteEmi(showDel); setShowDel(null); }} message="Delete this EMI?" />
    </div>
  );
}

// ── 3. NET WORTH ──────────────────────────────────────────────
const NW_CATS = {
  asset: [
    { id: 'bank',     label: 'Bank Account',    emoji: '🏦' },
    { id: 'fd',       label: 'FD / RD',          emoji: '📜' },
    { id: 'mf',       label: 'Mutual Funds',     emoji: '📈' },
    { id: 'stocks',   label: 'Stocks',           emoji: '📊' },
    { id: 'ppf',      label: 'PPF / EPF',        emoji: '🛡️' },
    { id: 'gold',     label: 'Gold',             emoji: '🥇' },
    { id: 'property', label: 'Property',         emoji: '🏠' },
    { id: 'crypto',   label: 'Crypto',           emoji: '₿'  },
    { id: 'other_a',  label: 'Other Asset',      emoji: '💎' },
  ],
  liability: [
    { id: 'home_loan',label: 'Home Loan',        emoji: '🏡' },
    { id: 'car_loan', label: 'Car Loan',         emoji: '🚗' },
    { id: 'personal', label: 'Personal Loan',   emoji: '💳' },
    { id: 'edu_loan', label: 'Education Loan',  emoji: '🎓' },
    { id: 'credit',   label: 'Credit Card Due', emoji: '💳' },
    { id: 'other_l',  label: 'Other Liability',  emoji: '⚠️' },
  ],
};

function NetWorthTab({ privacyMode }) {
  const blur = privacyMode ? 'private-blur' : '';
  const netWorthEntries     = useStore((s) => s.netWorthEntries);
  const netWorthHistory     = useStore((s) => s.netWorthHistory);
  const addNetWorthEntry    = useStore((s) => s.addNetWorthEntry);
  const updateNetWorthEntry = useStore((s) => s.updateNetWorthEntry);
  const deleteNetWorthEntry = useStore((s) => s.deleteNetWorthEntry);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [nType, setNType] = useState('asset');
  const [nCat, setNCat] = useState('bank');
  const [nName, setNName] = useState('');
  const [nAmt, setNAmt] = useState('');
  const [nNote, setNNote] = useState('');
  const [showDel, setShowDel] = useState(null);

  const totalA = netWorthEntries.filter((e) => e.type === 'asset').reduce((s, e) => s + e.amount, 0);
  const totalL = netWorthEntries.filter((e) => e.type === 'liability').reduce((s, e) => s + e.amount, 0);
  const nw     = totalA - totalL;
  const assets = netWorthEntries.filter((e) => e.type === 'asset');
  const liabs  = netWorthEntries.filter((e) => e.type === 'liability');
  const catOpts = NW_CATS[nType].map((c) => ({ value: c.id, label: c.label, emoji: c.emoji }));
  const chart   = netWorthHistory.slice(-6);
  const chartMax = Math.max(...chart.map((h) => Math.abs(h.netWorth)), 1);
  const getCat = (type, id) => NW_CATS[type]?.find((c) => c.id === id) || { emoji: '📦', label: id };

  const openAdd = (type = 'asset') => { setEditing(null); setNType(type); setNCat(NW_CATS[type][0].id); setNName(''); setNAmt(''); setNNote(''); setShowForm(true); };
  const openEdit = (e) => { setEditing(e); setNType(e.type); setNCat(e.category); setNName(e.name); setNAmt(String(e.amount)); setNNote(e.note || ''); setShowForm(true); };
  const handleSave = (ev) => {
    ev.preventDefault();
    const d = { type: nType, category: nCat, name: nName.trim(), amount: parseFloat(nAmt), note: nNote.trim() };
    if (!d.name || !d.amount) return;
    editing ? updateNetWorthEntry(editing.id, d) : addNetWorthEntry(d);
    setShowForm(false);
  };

  return (
    <div>
      <SCard style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.12) 0%,rgba(139,92,246,0.08) 100%)', border: '1.5px solid rgba(99,102,241,0.2)' }}>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Net Worth</div>
        <div className={blur} style={{ fontSize: '2rem', fontWeight: 800, color: nw >= 0 ? 'var(--accent-indigo)' : 'var(--accent-red)', marginBottom: '0.5rem' }}>
          {nw < 0 ? '-' : ''}{formatCurrency(Math.abs(nw))}
        </div>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Assets</div><div className={blur} style={{ fontWeight: 700, color: 'var(--accent-green)' }}>{formatCurrency(totalA)}</div></div>
          <div><div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Liabilities</div><div className={blur} style={{ fontWeight: 700, color: 'var(--accent-red)' }}>{formatCurrency(totalL)}</div></div>
        </div>
        {chart.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', marginTop: '1rem', height: 40 }}>
            {chart.map((h) => {
              const barH = Math.max(4, (Math.abs(h.netWorth) / chartMax) * 38);
              return (
                <div key={h.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <div style={{ width: '100%', height: barH, background: h.netWorth >= 0 ? 'var(--accent-indigo)' : 'var(--accent-red)', borderRadius: 2, opacity: 0.7 }} />
                  <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>{h.month.slice(5)}</div>
                </div>
              );
            })}
          </div>
        )}
      </SCard>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Assets</h3>
        <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }} onClick={() => openAdd('asset')}>+ Add</button>
      </div>
      {assets.length === 0
        ? <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem', padding: '0.75rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>No assets added yet</div>
        : assets.map((e) => {
            const cat = getCat('asset', e.category);
            const pct = totalA > 0 ? Math.round((e.amount / totalA) * 100) : 0;
            return (
              <div key={e.id} className="card" style={{ marginBottom: '0.5rem', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} onClick={() => openEdit(e)}>
                <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>{cat.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{e.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{cat.label} · {pct}% of assets</div>
                </div>
                <div className={blur} style={{ fontWeight: 700, color: 'var(--accent-green)', fontSize: '0.9rem' }}>{formatCurrency(e.amount)}</div>
              </div>
            );
          })
      }

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', marginTop: '1rem' }}>
        <h3 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Liabilities</h3>
        <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }} onClick={() => openAdd('liability')}>+ Add</button>
      </div>
      {liabs.length === 0
        ? <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem', padding: '0.75rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>No liabilities added yet</div>
        : liabs.map((e) => {
            const cat = getCat('liability', e.category);
            return (
              <div key={e.id} className="card" style={{ marginBottom: '0.5rem', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} onClick={() => openEdit(e)}>
                <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>{cat.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{e.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{cat.label}</div>
                </div>
                <div className={blur} style={{ fontWeight: 700, color: 'var(--accent-red)', fontSize: '0.9rem' }}>{formatCurrency(e.amount)}</div>
              </div>
            );
          })
      }

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Entry' : 'Add Net Worth Entry'}>
        <form onSubmit={handleSave}>
          <div className="type-toggle" style={{ marginBottom: '1rem' }}>
            <button type="button" className={`type-btn income ${nType === 'asset' ? 'active' : ''}`} onClick={() => { setNType('asset'); setNCat(NW_CATS.asset[0].id); }}>Asset</button>
            <button type="button" className={`type-btn expense ${nType === 'liability' ? 'active' : ''}`} onClick={() => { setNType('liability'); setNCat(NW_CATS.liability[0].id); }}>Liability</button>
          </div>
          <div className="form-group"><label className="form-label">Category</label><SelectPicker value={nCat} onChange={setNCat} options={catOpts} placeholder="Select category..." /></div>
          <div className="form-group"><label className="form-label">Name</label><input className="form-input" value={nName} onChange={(e) => setNName(e.target.value)} placeholder="e.g. HDFC Savings Account" required maxLength={60} autoFocus /></div>
          <div className="form-group"><label className="form-label">Amount (₹)</label><input className="form-input" type="number" value={nAmt} onChange={(e) => setNAmt(e.target.value)} placeholder="0" min="0" required /></div>
          <div className="form-group"><label className="form-label">Note <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label><input className="form-input" value={nNote} onChange={(e) => setNNote(e.target.value)} placeholder="e.g. updated May 2026" maxLength={80} /></div>
          <div className="modal-actions" style={{ marginTop: '1rem' }}>
            {editing && <button type="button" className="btn btn-danger" onClick={() => { setShowForm(false); setShowDel(editing.id); }}>Delete</button>}
            <div style={{ flex: 1 }} />
            <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save</button>
          </div>
        </form>
      </Modal>
      <ConfirmModal isOpen={!!showDel} onClose={() => setShowDel(null)} onConfirm={() => { deleteNetWorthEntry(showDel); setShowDel(null); }} message="Delete this entry?" />
    </div>
  );
}

// ── 4. CASH FLOW FORECAST ─────────────────────────────────────
function CashFlowTab({ privacyMode }) {
  const blur          = privacyMode ? 'private-blur' : '';
  const transactions  = useStore((s) => s.transactions);
  const recurringTxns = useStore((s) => s.recurringTxns);

  const forecast = useMemo(() => {
    const now  = new Date();
    const key  = getMonthKey(now);
    const mtxns = transactions.filter((t) => t.date.startsWith(key));
    const income  = mtxns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = mtxns.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const startBal  = income - expense;
    const dailyBurn = now.getDate() > 0 ? expense / now.getDate() : 0;

    const days = [];
    let bal = startBal;
    for (let i = 0; i < 30; i++) {
      const d = new Date(now); d.setDate(now.getDate() + i);
      let inc = 0, exp = dailyBurn;
      recurringTxns.forEach((r) => {
        if (!r.nextDate) return;
        if (Math.abs(Math.round((d - new Date(r.nextDate)) / 86400000)) <= 1) {
          if (r.type === 'income')  inc += r.amount;
          if (r.type === 'expense') exp += r.amount;
        }
      });
      bal += inc - exp;
      days.push({ date: d.toISOString().split('T')[0], label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), balance: bal });
    }

    const minBal  = Math.min(...days.map((d) => d.balance));
    const maxBal  = Math.max(...days.map((d) => d.balance));
    const runOut  = days.find((d) => d.balance < 0);
    const todayStr = now.toISOString().split('T')[0];
    const upcoming = recurringTxns
      .filter((r) => r.nextDate && r.nextDate >= todayStr && r.nextDate <= (days[29]?.date || todayStr))
      .sort((a, b) => a.nextDate.localeCompare(b.nextDate))
      .slice(0, 5);

    return { days, minBal, maxBal, startBal, dailyBurn, runOut, upcoming };
  }, [transactions, recurringTxns]);

  const H = 100, W = 300;
  const range = forecast.maxBal - forecast.minBal || 1;
  const toY = (v) => H - ((v - forecast.minBal) / range) * (H - 10) - 5;
  const toX = (i) => (i / Math.max(forecast.days.length - 1, 1)) * W;
  const pts  = forecast.days.map((d, i) => `${toX(i)},${toY(d.balance)}`).join(' ');

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {[
          { l: 'Current Balance', v: formatCurrency(Math.round(forecast.startBal)),    c: forecast.startBal >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' },
          { l: 'Daily Burn',      v: `${formatCurrency(Math.round(forecast.dailyBurn))}/day`, c: 'var(--accent-red)' },
          { l: '30-Day Low',      v: formatCurrency(Math.round(forecast.minBal)),       c: forecast.minBal < 0 ? 'var(--accent-red)' : 'var(--text-primary)' },
        ].map((s) => (
          <div key={s.l} className="card" style={{ flex: '1 1 0', minWidth: 0, padding: '0.7rem 0.85rem' }}>
            <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>{s.l}</div>
            <div className={blur} style={{ fontSize: '0.9rem', fontWeight: 700, color: s.c, marginTop: '0.15rem' }}>{s.v}</div>
          </div>
        ))}
      </div>

      {forecast.runOut && (
        <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.82rem', color: 'var(--accent-red)' }}>
          ⚠️ Balance may go negative around <strong>{new Date(forecast.runOut.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</strong>. Reduce spend or add income.
        </div>
      )}

      <SCard>
        <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.75rem' }}>30-Day Balance Projection</div>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: 200, height: 100, display: 'block' }}>
          {forecast.minBal < 0 && forecast.maxBal > 0 && (
            <line x1="0" y1={toY(0)} x2={W} y2={toY(0)} stroke="rgba(239,68,68,0.3)" strokeWidth="1" strokeDasharray="3,3" />
          )}
          <defs>
            <linearGradient id="fcg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent-indigo)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--accent-indigo)" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <polygon points={`0,${H} ${pts} ${W},${H}`} fill="url(#fcg)" />
          <polyline points={pts} fill="none" stroke="var(--accent-indigo)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={toX(0)} cy={toY(forecast.days[0]?.balance || 0)} r="4" fill="var(--accent-indigo)" />
        </svg>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          <span>Today</span><span>+15 days</span><span>+30 days</span>
        </div>
      </SCard>

      {forecast.upcoming.length > 0 && (
        <SCard>
          <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.75rem' }}>Upcoming in 30 Days</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {forecast.upcoming.map((r) => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: r.type === 'income' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
                  {r.type === 'income' ? '💰' : '💸'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{r.description}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{r.nextDate}</div>
                </div>
                <div className={blur} style={{ fontWeight: 700, fontSize: '0.88rem', color: r.type === 'income' ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  {r.type === 'income' ? '+' : '-'}{formatCurrency(r.amount)}
                </div>
              </div>
            ))}
          </div>
        </SCard>
      )}

      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.5, padding: '0.5rem 0' }}>
        💡 Based on this month's average daily spend + upcoming recurring transactions. Add recurring income/expenses in <strong>Recurring</strong> for better accuracy.
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────
export function FinancePlanningView() {
  const privacyMode = useStore((s) => s.privacyMode);
  const [unlocked, setUnlocked] = useState(false);
  const [tab, setTab] = useState('goals');
  const [prevTab, setPrevTab] = useState(null);
  const [slideDir, setSlideDir] = useState(null);

  const tabs = [
    { id: 'goals',    label: '🎯 Goals'     },
    { id: 'emi',      label: '🏦 EMI'       },
    { id: 'networth', label: '💎 Net Worth' },
    { id: 'cashflow', label: '📈 Cash Flow' },
  ];
  const tabIds = tabs.map((t) => t.id);

  const switchTab = (newTab) => {
    if (newTab === tab) return;
    const dir = tabIds.indexOf(newTab) > tabIds.indexOf(tab) ? 'left' : 'right';
    setSlideDir(dir);
    setPrevTab(tab);
    setTab(newTab);
    setTimeout(() => { setSlideDir(null); setPrevTab(null); }, 300);
  };

  const swipeRef = useSwipeTabs(tabIds, tab, switchTab);

  const tabContent = {
    goals:    <GoalsTab    privacyMode={privacyMode} />,
    emi:      <EmiTab      privacyMode={privacyMode} />,
    networth: <NetWorthTab privacyMode={privacyMode} />,
    cashflow: <CashFlowTab privacyMode={privacyMode} />,
  };

  return (
    <div className="animate-in" style={{ maxWidth: 700, margin: '0 auto' }}>
      {/* Lock overlay — portalled to body so it covers full viewport correctly on Android */}
      {!unlocked && createPortal(
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'var(--bg-body)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '2rem',
        }}>
          <PlanningLock onUnlock={() => setUnlocked(true)} />
        </div>,
        document.body
      )}

      <h2 className="view-title">Finance & Planning</h2>
      <p className="view-subtitle" style={{ marginBottom: '1rem' }}>Goals, loans, net worth, and cash flow</p>

      <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '1.25rem', scrollbarWidth: 'none' }}>
        {tabs.map((t) => <TabBtn key={t.id} id={t.id} label={t.label} active={tab === t.id} onClick={switchTab} />)}
      </div>

      {/* Swipeable content area — always mounted so swipeRef attaches */}
      <div ref={swipeRef} style={{ overflow: 'hidden', touchAction: 'pan-y' }}>
        <div style={{
          display: 'flex',
          transition: slideDir ? 'transform 0.28s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none',
          transform: 'translateX(0)',
        }}>
          <div style={{ width: '100%', flexShrink: 0, animation: slideDir ? `slideIn${slideDir === 'left' ? 'Left' : 'Right'} 0.28s cubic-bezier(0.25,0.46,0.45,0.94) both` : 'none' }}>
            {tabContent[tab]}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(40px); opacity: 0; }
          to   { transform: translateX(0);   opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(-40px); opacity: 0; }
          to   { transform: translateX(0);     opacity: 1; }
        }
      `}</style>
    </div>
  );
}
