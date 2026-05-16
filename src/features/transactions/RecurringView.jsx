import { useState } from 'react';
import useStore from '../../store/useStore';
import { CATEGORIES, getCategory } from '../../services/categories';
import { formatCurrency } from '../../utils/formatters';
import { Modal, ConfirmModal } from '../../components/ui/Modal';
import { SelectPicker } from '../../components/ui/SelectPicker';

const FREQUENCIES = [
  { value: 'daily',   label: 'Daily',   emoji: '📅' },
  { value: 'weekly',  label: 'Weekly',  emoji: '🗓️' },
  { value: 'monthly', label: 'Monthly', emoji: '📆' },
  { value: 'yearly',  label: 'Yearly',  emoji: '🎯' },
];

const freqLabel = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' };

function RecurringForm({ item, onClose }) {
  const addRecurring    = useStore((s) => s.addRecurring);
  const updateRecurring = useStore((s) => s.updateRecurring);
  const isEditing = !!item;

  const [type, setType]             = useState(item?.type || 'expense');
  const [description, setDescription] = useState(item?.description || '');
  const [amount, setAmount]         = useState(item?.amount || '');
  const [category, setCategory]     = useState(item?.category || 'food');
  const [frequency, setFrequency]   = useState(item?.frequency || 'monthly');
  const [startDate, setStartDate]   = useState(item?.nextDate || new Date().toISOString().split('T')[0]);

  const handleTypeChange = (t) => {
    setType(t);
    setCategory(CATEGORIES[t]?.[0]?.id || '');
  };

  const categoryOptions = CATEGORIES[type].map((c) => ({ value: c.id, label: c.name, emoji: c.emoji }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!description.trim() || !amt) return;
    const data = { type, description: description.trim(), amount: amt, category, frequency, nextDate: startDate };
    if (isEditing) updateRecurring(item.id, data);
    else addRecurring(data);
    onClose();
  };

  return (
    <Modal isOpen onClose={onClose} title={isEditing ? 'Edit Recurring' : 'Add Recurring'}>
      <form onSubmit={handleSubmit}>
        <div className="type-toggle" style={{ marginBottom: '1rem' }}>
          <button type="button" className={`type-btn expense ${type === 'expense' ? 'active' : ''}`} onClick={() => handleTypeChange('expense')}>Expense</button>
          <button type="button" className={`type-btn income ${type === 'income' ? 'active' : ''}`} onClick={() => handleTypeChange('income')}>Income</button>
        </div>

        <div className="form-group">
          <label className="form-label">Description</label>
          <input className="form-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Netflix, Rent, Salary" required autoFocus maxLength={100} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div className="form-group">
            <label className="form-label">Amount (₹)</label>
            <input className="form-input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" min="1" step="0.01" required />
          </div>
          <div className="form-group">
            <label className="form-label">Frequency</label>
            <SelectPicker value={frequency} onChange={setFrequency} options={FREQUENCIES} placeholder="How often?" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div className="form-group">
            <label className="form-label">Category</label>
            <SelectPicker value={category} onChange={setCategory} options={categoryOptions} placeholder="Category" />
          </div>
          <div className="form-group">
            <label className="form-label">Next Date</label>
            <input className="form-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary">{isEditing ? 'Save' : 'Add'}</button>
        </div>
      </form>
    </Modal>
  );
}

export function RecurringView() {
  const recurringTxns  = useStore((s) => s.recurringTxns);
  const deleteRecurring = useStore((s) => s.deleteRecurring);

  const [showForm, setShowForm]         = useState(false);
  const [editingItem, setEditingItem]   = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const expenses = recurringTxns.filter((r) => r.type === 'expense');
  const incomes  = recurringTxns.filter((r) => r.type === 'income');

  const toMonthly = (r) => {
    if (r.frequency === 'daily')  return r.amount * 30;
    if (r.frequency === 'weekly') return r.amount * 4;
    if (r.frequency === 'yearly') return r.amount / 12;
    return r.amount;
  };

  const totalMonthlyExpense = expenses.reduce((s, r) => s + toMonthly(r), 0);
  const totalMonthlyIncome  = incomes.reduce((s, r) => s + toMonthly(r), 0);

  const openEdit = (item) => { setEditingItem(item); setShowForm(true); };

  const RecurringCard = ({ item }) => {
    const cat = getCategory(item.type, item.category);
    const isOverdue = item.nextDate && item.nextDate < new Date().toISOString().split('T')[0];
    return (
      <div className="txn-item" style={{ cursor: 'pointer' }} onClick={() => openEdit(item)}>
        <div className="txn-icon" style={{ background: cat.color + '15', color: cat.color }}>{cat.emoji}</div>
        <div className="txn-details">
          <div className="txn-desc" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {item.description}
            <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '1px 6px', borderRadius: 999, background: 'rgba(99,102,241,0.12)', color: 'var(--accent-indigo)' }}>
              {freqLabel[item.frequency]}
            </span>
          </div>
          <div className="txn-meta" style={{ color: isOverdue ? 'var(--accent-red)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <span>{isOverdue ? '⚠️ Overdue · ' : 'Next: '}{item.nextDate || '—'}</span>
            {isOverdue && (
              <button
                onClick={(e) => { e.stopPropagation(); useStore.getState().applyDueRecurring(); }}
                style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--accent-indigo)', padding: '1px 6px', borderRadius: 999, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)', cursor: 'pointer' }}
              >Apply now</button>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          <div className={`txn-amount ${item.type}`}>
            {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(item); }}
            style={{ fontSize: '0.7rem', color: 'var(--accent-red)', fontWeight: 600 }}
          >Delete</button>
        </div>
      </div>
    );
  };

  return (
    <div className="animate-in" style={{ maxWidth: 700, margin: '0 auto' }}>
      <div className="txn-header">
        <div>
          <h2 className="view-title">Recurring</h2>
          <p className="view-subtitle">Auto-added transactions on schedule</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingItem(null); setShowForm(true); }}>+ Add</button>
      </div>

      {/* Summary */}
      {recurringTxns.length > 0 && (
        <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Monthly Expenses</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-red)', marginTop: '2px' }}>{formatCurrency(Math.round(totalMonthlyExpense))}</div>
          </div>
          {totalMonthlyIncome > 0 && (
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Monthly Income</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-green)', marginTop: '2px' }}>{formatCurrency(Math.round(totalMonthlyIncome))}</div>
            </div>
          )}
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Active</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '2px' }}>{recurringTxns.length}</div>
          </div>
        </div>
      )}

      {recurringTxns.length === 0 ? (
        <div className="empty-state">
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🔄</div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>No recurring transactions</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Add rent, EMIs, subscriptions — they'll be added automatically.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {expenses.length > 0 && (
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>Expenses</div>
              <div className="txn-list">
                {expenses.map((r) => <RecurringCard key={r.id} item={r} />)}
              </div>
            </div>
          )}
          {incomes.length > 0 && (
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>Income</div>
              <div className="txn-list">
                {incomes.map((r) => <RecurringCard key={r.id} item={r} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {showForm && (
        <RecurringForm item={editingItem} onClose={() => { setShowForm(false); setEditingItem(null); }} />
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { deleteRecurring(deleteTarget.id); setDeleteTarget(null); }}
        message={`Delete recurring "${deleteTarget?.description}"?`}
      />
    </div>
  );
}
