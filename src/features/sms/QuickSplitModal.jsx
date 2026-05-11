import { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { CATEGORIES } from '../../services/categories';
import useStore from '../../store/useStore';

export function QuickSplitModal({ pendingItem, onClose }) {
  const people = useStore((s) => s.people);
  const groups = useStore((s) => s.groups);
  const addGroupExpense = useStore((s) => s.addGroupExpense);
  const addGroup = useStore((s) => s.addGroup);
  const dismissPendingSms = useStore((s) => s.dismissPendingSms);
  const rememberPayeeCategory = useStore((s) => s.rememberPayeeCategory);

  const [selectedFriends, setSelectedFriends] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [useExistingGroup, setUseExistingGroup] = useState(groups.length > 0);
  const [category, setCategory] = useState(pendingItem.category || 'other_exp');
  const [splitMethod, setSplitMethod] = useState('equal');
  const [splitValues, setSplitValues] = useState({});
  const [validationMsg, setValidationMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Guard — only debit, non-self transfers
  if (pendingItem.type !== 'debit' || pendingItem.isSelfTransfer) return null;

  const friends = people.filter((p) => p.id !== 'self');
  const total = pendingItem.amount;
  const allMembers = ['self', ...selectedFriends];

  const getShares = () => {
    if (splitMethod === 'equal') {
      const share = parseFloat((total / allMembers.length).toFixed(2));
      const result = {};
      allMembers.forEach((id) => { result[id] = share; });
      return result;
    }
    if (splitMethod === 'amount') {
      const result = {};
      allMembers.forEach((id) => { result[id] = parseFloat(splitValues[id]) || 0; });
      return result;
    }
    if (splitMethod === 'percent') {
      const result = {};
      allMembers.forEach((id) => {
        const pct = parseFloat(splitValues[id]) || 0;
        result[id] = parseFloat(((total * pct) / 100).toFixed(2));
      });
      return result;
    }
    return {};
  };

  useEffect(() => {
    if (splitMethod === 'equal' || allMembers.length === 0) { setValidationMsg(''); return; }
    let sum = 0;
    allMembers.forEach((id) => { sum += parseFloat(splitValues[id]) || 0; });
    if (splitMethod === 'amount') {
      const diff = total - sum;
      setValidationMsg(Math.abs(diff) < 0.01 ? '' : diff > 0 ? `₹${diff.toFixed(2)} remaining` : `Over by ₹${Math.abs(diff).toFixed(2)}`);
    } else {
      const diff = 100 - sum;
      setValidationMsg(Math.abs(diff) < 0.1 ? '' : diff > 0 ? `${diff.toFixed(1)}% remaining` : `Over by ${Math.abs(diff).toFixed(1)}%`);
    }
  }, [splitValues, splitMethod, selectedFriends]);

  const isValid = splitMethod === 'equal' || validationMsg === '';

  const toggleFriend = (id) => {
    setSelectedFriends((prev) => prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]);
    setSplitValues({});
  };

  const getPersonName = (id) => id === 'self' ? 'You' : people.find((p) => p.id === id)?.name || id;
  const getPersonColor = (id) => id === 'self' ? '#8b5cf6' : people.find((p) => p.id === id)?.color || '#6366f1';

  const handleDone = () => {
    if (submitting || selectedFriends.length === 0 || !isValid) return;
    setSubmitting(true);

    rememberPayeeCategory(pendingItem.payee, category);

    let groupId = selectedGroupId;
    if (!useExistingGroup || !groupId) {
      const newGroup = addGroup(pendingItem.payee || 'Split', selectedFriends);
      groupId = newGroup.id;
    }

    const shares = getShares();
    const splits = allMembers.map((id) => ({ personId: id, share: shares[id] || 0 }));

    addGroupExpense({
      groupId,
      description: pendingItem.payee,
      amount: total,
      paidBy: 'self',
      date: pendingItem.date,
      splitMethod,
      splits,
      category,
      sourceTxnId: pendingItem.id,
    });

    dismissPendingSms(pendingItem.id);
    onClose();
  };

  const shares = getShares();

  return (
    <Modal isOpen onClose={onClose} title={`⚡ Split ₹${total.toFixed(2)}`}>
      {/* Header */}
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{pendingItem.payee}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>{pendingItem.date}</div>
        </div>
        <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--accent-red,#f87171)' }}>₹{total.toFixed(2)}</div>
      </div>

      {/* Category */}
      <div className="form-group" style={{ marginBottom: '1rem' }}>
        <label className="form-label">Category</label>
        <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.expense.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
        </select>
      </div>

      {/* Group */}
      {groups.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <div className="type-toggle" style={{ marginBottom: '0.75rem' }}>
            <button type="button" className={`type-btn ${useExistingGroup ? 'active' : ''}`} onClick={() => setUseExistingGroup(true)}>Existing Group</button>
            <button type="button" className={`type-btn ${!useExistingGroup ? 'active' : ''}`} onClick={() => setUseExistingGroup(false)}>New Group</button>
          </div>
          {useExistingGroup && (
            <select className="form-select" value={selectedGroupId} onChange={(e) => setSelectedGroupId(e.target.value)}>
              <option value="">Select a group…</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          )}
        </div>
      )}

      {/* Split method */}
      <div style={{ marginBottom: '1rem' }}>
        <label className="form-label">Split Method</label>
        <div className="type-toggle">
          {[{ key: 'equal', label: 'Equally' }, { key: 'amount', label: 'By Amount' }, { key: 'percent', label: 'By %' }].map((m) => (
            <button key={m.key} type="button" className={`type-btn ${splitMethod === m.key ? 'active' : ''}`}
              onClick={() => { setSplitMethod(m.key); setSplitValues({}); }}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Friend picker */}
      <div className="form-group">
        <label className="form-label">Split with{selectedFriends.length > 0 ? ` (${selectedFriends.length} selected)` : ''}</label>
        {friends.length === 0
          ? <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No friends added yet.</p>
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 200, overflowY: 'auto' }}>
              {friends.map((p) => {
                const selected = selectedFriends.includes(p.id);
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div onClick={() => toggleFriend(p.id)} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', background: selected ? 'rgba(99,102,241,0.12)' : 'var(--bg-input)', border: `1.5px solid ${selected ? 'var(--accent-indigo,#6366f1)' : 'var(--border-subtle)'}`, cursor: 'pointer' }}>
                      <div className="avatar-sm" style={{ background: p.color }}>{p.initials}</div>
                      <span style={{ flex: 1, fontSize: '0.88rem', fontWeight: 500 }}>{p.name}</span>
                      {selected && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-indigo,#6366f1)" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                    {selected && splitMethod !== 'equal' && (
                      <input type="number" min="0" step="0.01" placeholder={splitMethod === 'percent' ? '%' : '₹'}
                        value={splitValues[p.id] || ''} onChange={(e) => setSplitValues((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        style={{ width: 72, padding: '0.45rem 0.5rem', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.85rem', textAlign: 'right' }} />
                    )}
                  </div>
                );
              })}
            </div>
          )
        }
      </div>

      {/* You row for amount/percent */}
      {selectedFriends.length > 0 && splitMethod !== 'equal' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.5rem' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(99,102,241,0.08)', border: '1.5px solid var(--accent-indigo,#6366f1)' }}>
            <div className="avatar-sm" style={{ background: '#8b5cf6' }}>You</div>
            <span style={{ flex: 1, fontSize: '0.88rem', fontWeight: 500 }}>You</span>
          </div>
          <input type="number" min="0" step="0.01" placeholder={splitMethod === 'percent' ? '%' : '₹'}
            value={splitValues['self'] || ''} onChange={(e) => setSplitValues((prev) => ({ ...prev, self: e.target.value }))}
            style={{ width: 72, padding: '0.45rem 0.5rem', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.85rem', textAlign: 'right' }} />
        </div>
      )}

      {validationMsg && <p style={{ fontSize: '0.78rem', marginTop: '0.5rem', textAlign: 'right', color: validationMsg.includes('remaining') ? 'var(--accent-yellow,#fbbf24)' : 'var(--accent-red,#f87171)' }}>{validationMsg}</p>}

      {/* Summary */}
      {selectedFriends.length > 0 && (
        <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>Total</span><span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>₹{total.toFixed(2)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>Split {allMembers.length} ways</span><span>{splitMethod === 'equal' ? 'equally' : splitMethod === 'percent' ? 'by %' : 'by amount'}</span></div>
          {allMembers.map((id) => (
            <div key={id} style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: getPersonColor(id), display: 'inline-block' }} />
                {getPersonName(id)}
              </span>
              <span style={{ color: id === 'self' ? 'var(--accent-indigo,#6366f1)' : 'var(--text-primary)', fontWeight: id === 'self' ? 700 : 400 }}>₹{(shares[id] || 0).toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="modal-actions" style={{ marginTop: '1.5rem', justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button type="button" className="btn btn-primary" disabled={selectedFriends.length === 0 || !isValid || submitting} onClick={handleDone}>
          {submitting ? 'Saving…' : 'Done ✓'}
        </button>
      </div>
    </Modal>
  );
}
