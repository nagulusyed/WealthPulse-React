import { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../components/ui/Modal';
import { CATEGORIES } from '../../services/categories';
import useStore from '../../store/useStore';
import { formatCurrency } from '../../utils/formatters';

export function GroupExpenseForm({ groupId, expense, onClose }) {
  const groups = useStore((s) => s.groups);
  const getPersonById = useStore((s) => s.getPersonById);
  const getGroupById = useStore((s) => s.getGroupById);
  const addGroupExpense = useStore((s) => s.addGroupExpense);
  const updateGroupExpense = useStore((s) => s.updateGroupExpense);
  const addTransaction = useStore((s) => s.addTransaction);

  const isEditing = !!expense;

  // If no groupId, show group selector
  const [selectedGroupId, setSelectedGroupId] = useState(groupId || expense?.groupId || '');
  const [description, setDescription] = useState(expense?.description || '');
  const [amount, setAmount] = useState(expense?.amount || '');
  const [paidBy, setPaidBy] = useState(expense?.paidBy || 'self');
  const [date, setDate] = useState(expense?.date || new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState(expense?.category || 'other_exp');
  const [splitMethod, setSplitMethod] = useState(expense?.splitMethod || 'equal');
  const [splitValues, setSplitValues] = useState({});
  const [validationMsg, setValidationMsg] = useState('');

  const group = getGroupById(selectedGroupId);
  const members = group?.memberIds || [];
  const amt = parseFloat(amount) || 0;

  // Initialize split values when group or method changes
  useEffect(() => {
    if (!group) return;
    if (expense && isEditing) {
      const vals = {};
      expense.splits.forEach((s) => {
        if (splitMethod === 'amount') vals[s.personId] = s.share;
        else if (splitMethod === 'percent') vals[s.personId] = amt > 0 ? (s.share / amt * 100) : 0;
      });
      setSplitValues(vals);
    } else {
      setSplitValues({});
    }
  }, [selectedGroupId, splitMethod]);

  // Validation
  useEffect(() => {
    if (splitMethod === 'equal' || amt <= 0) { setValidationMsg(''); return; }
    let sum = 0;
    members.forEach((id) => { sum += parseFloat(splitValues[id]) || 0; });
    if (splitMethod === 'amount') {
      const diff = amt - sum;
      if (Math.abs(diff) < 0.01) setValidationMsg('');
      else setValidationMsg(diff > 0 ? `₹${diff.toFixed(2)} remaining` : `Over by ₹${Math.abs(diff).toFixed(2)}`);
    } else if (splitMethod === 'percent') {
      const diff = 100 - sum;
      if (Math.abs(diff) < 0.1) setValidationMsg('');
      else setValidationMsg(diff > 0 ? `${diff.toFixed(1)}% remaining` : `Over by ${Math.abs(diff).toFixed(1)}%`);
    }
  }, [splitValues, amount, splitMethod, members]);

  const isValid = validationMsg === '' || splitMethod === 'equal';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedGroupId || !description.trim() || !amt || !isValid) return;

    let splits = [];
    if (splitMethod === 'equal') {
      const share = amt / members.length;
      splits = members.map((id) => ({ personId: id, share }));
    } else if (splitMethod === 'amount') {
      splits = members.map((id) => ({ personId: id, share: parseFloat(splitValues[id]) || 0 }));
    } else if (splitMethod === 'percent') {
      splits = members.map((id) => ({ personId: id, share: amt * ((parseFloat(splitValues[id]) || 0) / 100) }));
    }

    const data = {
      groupId: selectedGroupId,
      description: description.trim(),
      amount: amt,
      paidBy,
      date,
      splitMethod,
      splits,
      category,
    };

    if (isEditing) {
      updateGroupExpense(expense.id, data);
    } else {
      addGroupExpense(data);
      // Sync to personal transactions if user paid
      if (paidBy === 'self') {
        addTransaction({
          type: 'expense',
          amount: amt,
          category: 'other_exp',
          date,
          description: `Group: ${group?.name} - ${description.trim()}`,
          notes: 'Splitwise sync',
        });
      }
    }
    onClose();
  };

  const updateSplitValue = (personId, val) => {
    setSplitValues((prev) => ({ ...prev, [personId]: val }));
  };

  return (
    <Modal isOpen onClose={onClose} title={isEditing ? 'Edit Expense' : 'Add Group Expense'} className="modal-large">
      <form onSubmit={handleSubmit}>
        {/* Group selector (if no groupId provided) */}
        {!groupId && (
          <div className="form-group">
            <label className="form-label">Group</label>
            <select className="form-select" value={selectedGroupId} onChange={(e) => setSelectedGroupId(e.target.value)} required>
              <option value="">Select a group...</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Description</label>
          <input className="form-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Dinner at restaurant" required maxLength={100} autoFocus />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div className="form-group">
            <label className="form-label">Amount (₹)</label>
            <input className="form-input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} min="1" step="0.01" required />
          </div>
          <div className="form-group">
            <label className="form-label">Paid By</label>
            <select className="form-select" value={paidBy} onChange={(e) => setPaidBy(e.target.value)} required>
              {members.map((id) => {
                const p = getPersonById(id);
                return <option key={id} value={id}>{p?.name || id}</option>;
              })}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Date</label>
            <input className="form-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.expense.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
            </select>
          </div>
        </div>

        {/* Split Method */}
        <div style={{ marginTop: '1rem' }}>
          <label className="form-label">Split Method</label>
          <div className="type-toggle">
            {[{ key: 'equal', label: 'Equally' }, { key: 'amount', label: 'By Amount' }, { key: 'percent', label: 'By %' }].map((m) => (
              <button key={m.key} type="button" className={`type-btn ${splitMethod === m.key ? 'active' : ''}`} onClick={() => setSplitMethod(m.key)}>{m.label}</button>
            ))}
          </div>
        </div>

        {/* Split Rows */}
        {group && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
            {members.map((id) => {
              const p = getPersonById(id);
              if (!p) return null;
              return (
                <div key={id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div className="avatar-sm" style={{ background: p.color }}>{p.initials}</div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500, flex: 1 }}>{p.name}</span>
                  {splitMethod === 'equal' ? (
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {amt > 0 ? formatCurrency(Math.round((amt / members.length) * 100) / 100) : 'Auto'}
                    </span>
                  ) : (
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={splitMethod === 'amount' ? '0.00' : '0%'}
                      value={splitValues[id] || ''}
                      onChange={(e) => updateSplitValue(id, e.target.value)}
                      style={{ width: 100, marginLeft: 'auto', padding: '0.4rem 0.6rem', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {validationMsg && (
          <p style={{ fontSize: '0.8rem', color: validationMsg.includes('remaining') ? 'var(--text-primary)' : 'var(--accent-red)', textAlign: 'right', marginTop: '0.5rem' }}>
            {validationMsg}
          </p>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={!isValid}>Save</button>
        </div>
      </form>
    </Modal>
  );
}
