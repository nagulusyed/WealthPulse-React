import { useState, useEffect } from 'react';
import useStore from '../../store/useStore';
import { formatCurrency } from '../../utils/formatters';
import { Modal, ConfirmModal } from '../../components/ui/Modal';
import { searchContacts, requestContactsPermission, getUpiAppLabel } from '../../services/contactsService';
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
  const [mode, setMode] = useState('manual'); // 'manual' | 'contacts'
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [upiId, setUpiId] = useState('');
  const [contactId, setContactId] = useState(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [nameError, setNameError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const blur = privacyMode ? 'private-blur' : '';
  const otherPeople = people.filter((p) => p.id !== 'self');

  const getBalance = (personId) => {
    return useStore.getState().getGlobalBalance(personId);
  };

  useEffect(() => {
    if (mode === 'contacts' && searchQuery.length >= 2) {
      const timer = setTimeout(async () => {
        setIsSearching(true);
        const contacts = await searchContacts(searchQuery);
        setSearchResults(contacts);
        setIsSearching(false);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, mode]);

  const openForm = (person = null) => {
    setEditingPerson(person);
    setMode('manual');
    setName(person?.name || '');
    setPhone(person?.phone || '');
    setUpiId(person?.upiId || '');
    setContactId(person?.contactId || null);
    setNameError('');
    setShowForm(true);
  };

  const selectContact = (contact) => {
    setName(contact.name);
    setPhone(contact.phone || '');
    setUpiId(contact.upiId || '');
    setContactId(contact.id);
    // Auto-update avatar if it exists
    const avatarUrl = contact.avatar || null;
    
    setMode('manual'); // Switch back to manual to confirm details
    
    // If we were already editing, we keep the avatar in local state
    if (editingPerson) {
      setEditingPerson({ ...editingPerson, avatar: avatarUrl });
    }
  };

  const handleContactsMode = async () => {
    const granted = await requestContactsPermission();
    if (granted) {
      setMode('contacts');
      setSearchQuery('');
    } else {
      setNameError('Permission denied');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const isDuplicate = people.some((p) => p.id !== editingPerson?.id && p.name.toLowerCase() === name.trim().toLowerCase());
    if (isDuplicate) {
      setNameError('Person name must be unique');
      return;
    }

    const personData = {
      name: name.trim(),
      phone: phone.trim(),
      upiId: upiId.trim(),
      contactId,
      avatar: editingPerson?.avatar || null
    };

    if (editingPerson) {
      updatePerson(editingPerson.id, personData);
    } else {
      addPerson(personData);
    }
    setShowForm(false);
    setEditingPerson(null);
    setName('');
    setPhone('');
    setUpiId('');
    setContactId(null);
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
                {p.avatar ? (
                  <img src={p.avatar} className="avatar-md" alt={p.name} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                ) : null}
                <div className="avatar-md" style={{ background: p.color, display: p.avatar ? 'none' : 'flex' }}>{p.initials}</div>
                <div className="person-details">
                  <div className="person-name">{p.name}</div>
                  <div className="person-meta">{p.phone || `Added ${new Date(p.createdAt).toLocaleDateString()}`}</div>
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
      <Modal 
        isOpen={showForm} 
        onClose={() => setShowForm(false)} 
        title={editingPerson ? 'Edit Person' : 'Add Person'} 
        className="modal-small"
      >
        <div className="mode-toggle">
          <button 
            className={`mode-btn ${mode === 'manual' ? 'active' : ''}`}
            onClick={() => setMode('manual')}
          >
            Manual
          </button>
          <button 
            className={`mode-btn ${mode === 'contacts' ? 'active' : ''}`}
            onClick={handleContactsMode}
          >
            From Contacts
          </button>
        </div>

        {mode === 'contacts' ? (
          <div className="contact-search-container">
            <input 
              className="form-input search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contacts by name..."
              autoFocus
            />
            <div className="search-results">
              {isSearching ? (
                <p className="search-status">Searching...</p>
              ) : searchQuery.length < 2 ? (
                <p className="search-status">Type at least 2 characters</p>
              ) : searchResults.length === 0 ? (
                <p className="search-status">No contacts found</p>
              ) : (
                searchResults.map(c => (
                  <div key={c.id} className="search-item" onClick={() => selectContact(c)}>
                    {c.avatar ? (
                      <img src={c.avatar} className="avatar-xs" alt={c.name} />
                    ) : (
                      <div className="avatar-xs">{c.initials}</div>
                    )}
                    <div className="search-item-info">
                      <div className="search-item-name">{c.name}</div>
                      <div className="search-item-meta">
                        {c.phone && <span>{c.phone}</span>}
                        {c.upiId && <span className="upi-found">✅ {getUpiAppLabel(c.upiApp)} linked</span>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" value={name} onChange={(e) => { setName(e.target.value); setNameError(''); }} placeholder="e.g. Rahul" required maxLength={40} autoFocus />
              {nameError && <p className="pin-error" style={{ textAlign: 'left', marginTop: 4 }}>{nameError}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">Phone (Optional)</label>
              <input className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" />
            </div>
            <div className="form-group">
              <label className="form-label">UPI ID (Optional)</label>
              <input className="form-input" value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="e.g. name@upi" />
            </div>

            {editingPerson && !editingPerson.contactId && (
              <button 
                type="button" 
                className="btn btn-ghost" 
                style={{ width: '100%', marginBottom: '1rem', border: '1px dashed var(--border-color)' }}
                onClick={handleContactsMode}
              >
                🔗 Link to Contact
              </button>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              {editingPerson && editingPerson.id !== 'self' && (
                <button type="button" className="btn btn-danger" onClick={() => { setDeleteTarget(editingPerson); setShowDeleteConfirm(true); }}>Delete</button>
              )}
              <div style={{ flex: 1 }} />
              <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save</button>
            </div>
          </form>
        )}
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
