import { useState } from 'react';
import { Modal, ConfirmModal } from '../../components/ui/Modal';
import { SelectPicker } from '../../components/ui/SelectPicker';
import { CATEGORIES } from '../../services/categories';
import useStore from '../../store/useStore';
import { hapticMedium, hapticHeavy, hapticWarning } from '../../utils/haptics';

export function TransactionForm({ transaction, defaultType = 'expense', onClose }) {
  const addTransaction    = useStore((s) => s.addTransaction);
  const updateTransaction = useStore((s) => s.updateTransaction);
  const deleteTransaction = useStore((s) => s.deleteTransaction);
  // Fix #13: use selectedMonth to set default date
  const selectedMonth     = useStore((s) => s.selectedMonth);

  const isEditing = !!transaction;

  // Fix #13: default date = last day of selectedMonth (or today if current month)
  const getDefaultDate = () => {
    if (transaction?.date) return transaction.date;
    const now = new Date();
    const sel = selectedMonth;
    const isCurrentMonth = sel.getFullYear() === now.getFullYear() && sel.getMonth() === now.getMonth();
    if (isCurrentMonth) return now.toISOString().split('T')[0];
    // Last day of selected month
    const lastDay = new Date(sel.getFullYear(), sel.getMonth() + 1, 0);
    return lastDay.toISOString().split('T')[0];
  };

  const [type, setType]               = useState(transaction?.type || defaultType);
  const [description, setDescription] = useState(transaction?.description || '');
  const [amount, setAmount]           = useState(transaction?.amount || '');
  const [category, setCategory]       = useState(transaction?.category || CATEGORIES[transaction?.type || defaultType]?.[0]?.id || '');
  const [date, setDate]               = useState(getDefaultDate());
  const [notes, setNotes]             = useState(transaction?.notes || '');
  const [showDeleteConfirm, setShowDeleteConfirm]   = useState(false);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);

  const isDirty = description !== (transaction?.description || '')
    || String(amount) !== String(transaction?.amount || '')
    || category !== (transaction?.category || CATEGORIES[transaction?.type || defaultType]?.[0]?.id || '')
    || date !== (transaction?.date || getDefaultDate())
    || notes !== (transaction?.notes || '');

  const handleTypeChange = (newType) => {
    setType(newType);
    setCategory(CATEGORIES[newType]?.[0]?.id || '');
  };

  const handleClose = () => {
    if (isDirty) { hapticWarning(); setShowUnsavedConfirm(true); }
    else onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = { type, description: description.trim(), amount: parseFloat(amount), category, date, notes: notes.trim() };
    if (!data.description || !data.amount || !data.date) return;
    await hapticMedium();
    if (isEditing) updateTransaction(transaction.id, data);
    else addTransaction(data);
    onClose();
  };

  const handleDelete = async () => {
    await hapticHeavy();
    deleteTransaction(transaction.id);
    onClose();
  };

  const cats = CATEGORIES[type] || [];
  const categoryOptions = cats.map((c) => ({ value: c.id, label: c.name, emoji: c.emoji }));

  return (
    <>
      <Modal isOpen onClose={handleClose} title={isEditing ? 'Edit Transaction' : 'Add Transaction'}>
        <form onSubmit={handleSubmit}>
          <div className="type-toggle">
            <button type="button" className={`type-btn expense ${type === 'expense' ? 'active' : ''}`} onClick={() => handleTypeChange('expense')}>Expense</button>
            <button type="button" className={`type-btn income ${type === 'income' ? 'active' : ''}`} onClick={() => handleTypeChange('income')}>Income</button>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <input className="form-input" type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Grocery shopping" maxLength={100} required autoFocus />
          </div>

          {/* Fix #6: ₹ prefix on amount field */}
          <div className="form-group">
            <label className="form-label">Amount</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.9rem', pointerEvents: 'none' }}>₹</span>
              <input
                className="form-input"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                min="0"
                step="0.01"
                required
                style={{ paddingLeft: '1.75rem' }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Category</label>
            <SelectPicker value={category} onChange={setCategory} options={categoryOptions} placeholder="Select category..." />
          </div>

          <div className="form-group">
            <label className="form-label">Date</label>
            <input className="form-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>

          <div className="form-group">
            <label className="form-label">Notes <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
            <input className="form-input" type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add a note..." maxLength={150} />
          </div>

          <div className="modal-actions">
            {isEditing && <button type="button" className="btn btn-danger" onClick={() => setShowDeleteConfirm(true)}>Delete</button>}
            <div style={{ flex: 1 }} />
            <button type="button" className="btn btn-ghost" onClick={handleClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">{isEditing ? 'Save' : 'Add'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} onConfirm={handleDelete} message="Delete this transaction? This cannot be undone." />
      <ConfirmModal isOpen={showUnsavedConfirm} onClose={() => setShowUnsavedConfirm(false)} onConfirm={onClose} message="You have unsaved changes. Discard them?" />
    </>
  );
}
