import { useState } from 'react';
import { Modal, ConfirmModal } from '../../components/ui/Modal';
import { CATEGORIES } from '../../services/categories';
import useStore from '../../store/useStore';

export function TransactionForm({ transaction, defaultType = 'expense', onClose }) {
  const addTransaction = useStore((s) => s.addTransaction);
  const updateTransaction = useStore((s) => s.updateTransaction);
  const deleteTransaction = useStore((s) => s.deleteTransaction);

  const isEditing = !!transaction;
  const [type, setType] = useState(transaction?.type || defaultType);
  const [description, setDescription] = useState(transaction?.description || '');
  const [amount, setAmount] = useState(transaction?.amount || '');
  const [category, setCategory] = useState(transaction?.category || CATEGORIES[type]?.[0]?.id || '');
  const [date, setDate] = useState(transaction?.date || new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState(transaction?.notes || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleTypeChange = (newType) => {
    setType(newType);
    setCategory(CATEGORIES[newType]?.[0]?.id || '');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      type,
      description: description.trim(),
      amount: parseFloat(amount),
      category,
      date,
      notes: notes.trim(),
    };
    if (!data.description || !data.amount || !data.date) return;

    if (isEditing) {
      updateTransaction(transaction.id, data);
    } else {
      addTransaction(data);
    }
    onClose();
  };

  const handleDelete = () => {
    deleteTransaction(transaction.id);
    onClose();
  };

  const cats = CATEGORIES[type] || [];

  return (
    <>
      <Modal isOpen onClose={onClose} title={isEditing ? 'Edit Transaction' : 'Add Transaction'}>
        <form onSubmit={handleSubmit}>
          <div className="type-toggle">
            <button type="button" className={`type-btn expense ${type === 'expense' ? 'active' : ''}`} onClick={() => handleTypeChange('expense')}>Expense</button>
            <button type="button" className={`type-btn income ${type === 'income' ? 'active' : ''}`} onClick={() => handleTypeChange('income')}>Income</button>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <input className="form-input" type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Grocery shopping" maxLength={100} required autoFocus />
          </div>

          <div className="form-group">
            <label className="form-label">Amount (₹)</label>
            <input className="form-input" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" min="0" step="0.01" required />
          </div>

          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Date</label>
            <input className="form-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>

          <div className="form-group">
            <label className="form-label">Notes (optional)</label>
            <input className="form-input" type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add a note..." maxLength={150} />
          </div>

          <div className="modal-actions">
            {isEditing && (
              <button type="button" className="btn btn-danger" onClick={() => setShowDeleteConfirm(true)}>Delete</button>
            )}
            <div style={{ flex: 1 }} />
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">{isEditing ? 'Save' : 'Add'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        message="Delete this transaction? This action cannot be undone."
      />
    </>
  );
}
