import { useState } from 'react';
import useStore from '../../store/useStore';
import { formatCurrency } from '../../utils/formatters';
import { Modal, ConfirmModal } from '../../components/ui/Modal';
import './PeopleView.css';

export function PeopleView() {
  const people = useStore((s) => s.people);
  const groups = useStore((s) => s.groups);
  const groupExpenses = useStore((s) => s.groupExpenses);
  const addPerson = useStore((s) => s.addPerson);
  const updatePerson = useStore((s) => s.updatePerson);
  const deletePerson = useStore((s) => s.deletePerson);
  const privacyMode = useStore((s) => s.privacyMode);

  const [showForm, setShowForm] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const blur = privacyMode ? 'private-blur' : '';
  const otherPeople = people.filter((p) => p.id !== 'self');

  const getBalance = (personId) => {
    return useStore.getState().getGlobalBalance(personId);
  };

  const openForm = (person = null) => {
    setEditingPerson(person);
    setName(person?.name || '');
    setNameError('');
    setShowForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const isDuplicate = people.some((p) => p.id !== editingPerson?.id && p.name.toLowerCase() === name.trim().toLowerCase());
    if (isDuplicate) {
      setNameError('Person name must be unique');
      return;
    }
    if (editingPerson) {
      updatePerson(editingPerson.id, name);
    } else {
      addPerson(name);
    }
    setShowForm(false);
    setEditingPerson(null);
    setName('');
  };

  const handleDelete = () => {
    if (deleteTarget) {
      deletePerson(deleteTarget.id);
      setDeleteTarget(null);
      setShowForm(false);
      setEditingPerson(null);
    }
  };

  return (
    <div className="people-view animate-in">
      <div className="txn-header">
        <div>
          <h2 className="view-title">People</h2>
          <p className="view-subtitle">Friends you split expenses with</p>
        </div>
        <button className="btn btn-primary" onClick={() => openForm()}>+ Add Person</button>
      </div>

      {otherPeople.length === 0 ? (
        <div className="empty-state"><p>No people added yet.</p></div>
      ) : (
        <div className="people-grid">
          {otherPeople.map((p) => {
            const bal = getBalance(p.id);
            return (
              <div key={p.id} className="person-card" onClick={() => openForm(p)}>
                <div className="avatar-md" style={{ background: p.color }}>{p.initials}</div>
                <div className="person-details">
                  <div className="person-name">{p.name}</div>
                  <div className="person-meta">Added {new Date(p.createdAt).toLocaleDateString()}</div>
                </div>
                <div className={`balance-badge ${bal > 0.01 ? 'positive' : bal < -0.01 ? 'negative' : 'neutral'} ${blur}`}>
                  {bal > 0.01 ? `Gets ${formatCurrency(bal)}` : bal < -0.01 ? `Owes ${formatCurrency(Math.abs(bal))}` : 'Settled'}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Person Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editingPerson ? 'Edit Person' : 'Add Person'} className="modal-small">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Name</label>
            <input className="form-input" value={name} onChange={(e) => { setName(e.target.value); setNameError(''); }} placeholder="e.g. Rahul" required maxLength={40} autoFocus />
            {nameError && <p className="pin-error" style={{ textAlign: 'left', marginTop: 4 }}>{nameError}</p>}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
            {editingPerson && editingPerson.id !== 'self' && (
              <button type="button" className="btn btn-danger" onClick={() => { setDeleteTarget(editingPerson); setShowDeleteConfirm(true); }}>Delete</button>
            )}
            <div style={{ flex: 1 }} />
            <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        message={`Delete ${deleteTarget?.name}? This will not remove their group expenses.`}
      />
    </div>
  );
}
