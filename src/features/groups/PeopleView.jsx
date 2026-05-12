import { useState, useEffect } from 'react';
import useStore from '../../store/useStore';
import { formatCurrency } from '../../utils/formatters';
import { Modal, ConfirmModal } from '../../components/ui/Modal';
import {
  searchContacts,
  checkContactsPermission,
  requestContactsPermission,
  getContact,
  getUpiAppLabel,
} from '../../services/contactsService';
import './PeopleView.css';

export function PeopleView() {
  const people        = useStore((s) => s.people);
  const addPerson     = useStore((s) => s.addPerson);
  const updatePerson  = useStore((s) => s.updatePerson);
  const deletePerson  = useStore((s) => s.deletePerson);
  const privacyMode   = useStore((s) => s.privacyMode);

  const [showForm, setShowForm]         = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);
  const [mode, setMode]                 = useState('manual'); // 'manual' | 'contacts'

  // Form fields
  const [name, setName]         = useState('');
  const [phone, setPhone]       = useState('');
  const [upiId, setUpiId]       = useState('');
  const [contactId, setContactId] = useState(null);
  const [avatar, setAvatar]     = useState(null);

  // Contact search
  const [searchQuery, setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching]   = useState(false);

  const [nameError, setNameError]           = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget]     = useState(null);

  const blur = privacyMode ? 'private-blur' : '';
  const otherPeople = people.filter((p) => p.id !== 'self');

  // Debounced contact search
  useEffect(() => {
    if (mode !== 'contacts' || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      const contacts = await searchContacts(searchQuery);
      setSearchResults(contacts);
      setIsSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, mode]);

  const getBalance = (personId) => useStore.getState().getGlobalBalance(personId);

  const openForm = (person = null) => {
    setEditingPerson(person);
    setMode('manual');
    setName(person?.name || '');
    setPhone(person?.phone || '');
    setUpiId(person?.upiId || '');
    setContactId(person?.contactId || null);
    setAvatar(person?.avatar || null);
    setNameError('');
    setSearchQuery('');
    setSearchResults([]);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingPerson(null);
    setMode('manual');
    setName(''); setPhone(''); setUpiId(''); setContactId(null); setAvatar(null);
    setSearchQuery(''); setSearchResults([]);
    setNameError('');
  };

  // Switch to contacts mode — check permission first, only request if not granted
  const handleContactsMode = async () => {
    const granted = await checkContactsPermission()
      || await requestContactsPermission();
    if (granted) {
      setMode('contacts');
      setSearchQuery('');
      setSearchResults([]);
    } else {
      setNameError('Contacts permission denied. Please allow it in Settings.');
    }
  };

  // Contact selected from search — populate form fields and switch to manual to confirm
  const selectContact = (contact) => {
    setName(contact.name);
    setPhone(contact.phone || '');
    setUpiId(contact.upiId || '');
    setContactId(contact.id);
    setAvatar(contact.avatar || null);
    setMode('manual');
  };

  // Re-sync a linked contact to pick up updated UPI ID / phone
  const handleResync = async () => {
    if (!contactId) return;
    const contact = await getContact(contactId);
    if (contact) {
      setName(contact.name);
      setPhone(contact.phone || '');
      setUpiId(contact.upiId || upiId); // keep existing if contact has none
      setAvatar(contact.avatar || avatar);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const isDuplicate = people.some(
      (p) => p.id !== editingPerson?.id && p.name.toLowerCase() === name.trim().toLowerCase()
    );
    if (isDuplicate) {
      setNameError('Person name must be unique');
      return;
    }

    const personData = {
      name: name.trim(),
      phone: phone.trim(),
      upiId: upiId.trim().toLowerCase(),
      contactId,
      avatar,
    };

    if (editingPerson) {
      updatePerson(editingPerson.id, personData);
    } else {
      addPerson(personData);
    }
    closeForm();
  };

  const handleDelete = () => {
    if (deleteTarget) {
      deletePerson(deleteTarget.id);
      setDeleteTarget(null);
      closeForm();
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
        <div className="empty-state"><p>No people added yet. Add a friend to start splitting bills.</p></div>
      ) : (
        <div className="people-grid">
          {otherPeople.map((p) => {
            const bal = getBalance(p.id);
            return (
              <div key={p.id} className="person-card" onClick={() => openForm(p)}>
                <PersonAvatar person={p} size="md" />
                <div className="person-details">
                  <div className="person-name">
                    {p.name}
                    {p.upiId && <span title={`UPI: ${p.upiId}`} style={{ marginLeft: 5, fontSize: '0.7rem', opacity: 0.6 }}>💳</span>}
                  </div>
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

      {/* Add / Edit Modal */}
      <Modal isOpen={showForm} onClose={closeForm} title={editingPerson ? 'Edit Person' : 'Add Person'} className="modal-small">

        {/* Mode Toggle */}
        <div className="mode-toggle">
          <button className={`mode-btn ${mode === 'manual' ? 'active' : ''}`} onClick={() => setMode('manual')}>
            ✏️ Manual
          </button>
          <button className={`mode-btn ${mode === 'contacts' ? 'active' : ''}`} onClick={handleContactsMode}>
            📱 From Contacts
          </button>
        </div>

        {/* ── Contacts Search Mode ── */}
        {mode === 'contacts' ? (
          <div className="contact-search-container">
            <input
              className="form-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contacts by name..."
              autoFocus
            />
            <div className="search-results">
              {isSearching ? (
                <p className="search-status">Searching...</p>
              ) : searchQuery.trim().length < 2 ? (
                <p className="search-status">Type at least 2 characters to search</p>
              ) : searchResults.length === 0 ? (
                <p className="search-status">No contacts found for "{searchQuery}"</p>
              ) : (
                searchResults.map((c) => (
                  <div key={c.id} className="search-item" onClick={() => selectContact(c)}>
                    <PersonAvatar person={{ name: c.name, initials: c.initials, avatar: c.avatar, color: '#8b5cf6' }} size="xs" />
                    <div className="search-item-info">
                      <div className="search-item-name">{c.name}</div>
                      <div className="search-item-meta">
                        {c.phone && <span>{c.phone}</span>}
                        {c.upiId
                          ? <span className="upi-found">✅ {getUpiAppLabel(c.upiApp)} linked</span>
                          : <span style={{ color: 'var(--text-muted)' }}>No UPI found</span>
                        }
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          /* ── Manual Form Mode ── */
          <form onSubmit={handleSubmit}>
            {/* Contact photo preview if linked */}
            {avatar && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', padding: '0.6rem', background: 'var(--bg-card-hover)', borderRadius: 'var(--radius-md)' }}>
                <PersonAvatar person={{ name, initials: name.slice(0, 2).toUpperCase(), avatar, color: '#8b5cf6' }} size="md" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{name}</div>
                  {contactId && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Linked to contact</div>}
                </div>
                {contactId && (
                  <button type="button" className="btn btn-ghost" style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }} onClick={handleResync}>
                    🔄 Sync
                  </button>
                )}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Name *</label>
              <input
                className="form-input"
                value={name}
                onChange={(e) => { setName(e.target.value); setNameError(''); }}
                placeholder="e.g. Rahul"
                required maxLength={40}
                autoFocus={!avatar}
              />
              {nameError && <p className="pin-error" style={{ textAlign: 'left', marginTop: 4 }}>{nameError}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">Phone <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
              <input className="form-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98486 XXXXX" inputMode="tel" />
            </div>

            <div className="form-group">
              <label className="form-label">
                UPI ID <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
                {upiId && <span style={{ marginLeft: 6, fontSize: '0.7rem', color: 'var(--accent-green)' }}>✅ Ready for Pay via UPI</span>}
              </label>
              <input
                className="form-input"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. name@okicici"
                inputMode="email"
              />
            </div>

            {/* Link to contact button for manually-added people */}
            {!contactId && (
              <button
                type="button"
                className="btn btn-ghost"
                style={{ width: '100%', marginBottom: '0.5rem', border: '1px dashed var(--border-color)', fontSize: '0.82rem' }}
                onClick={handleContactsMode}
              >
                🔗 Link to a Contact
              </button>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              {editingPerson && editingPerson.id !== 'self' && (
                <button type="button" className="btn btn-danger" onClick={() => { setDeleteTarget(editingPerson); setShowDeleteConfirm(true); }}>
                  Delete
                </button>
              )}
              <div style={{ flex: 1 }} />
              <button type="button" className="btn btn-ghost" onClick={closeForm}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save</button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        message={`Delete ${deleteTarget?.name}? Their group expenses will be removed too.`}
      />
    </div>
  );
}

// ── Reusable avatar component — fixes the broken fallback ─────
export function PersonAvatar({ person, size = 'md' }) {
  const [imgFailed, setImgFailed] = useState(false);
  const sizes = { xs: 28, sm: 32, md: 40, lg: 48 };
  const px = sizes[size] || 40;
  const fontSize = px <= 28 ? '0.6rem' : px <= 32 ? '0.65rem' : '0.75rem';

  const style = {
    width: px, height: px, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, color: 'white', flexShrink: 0, fontSize,
    background: person?.color || '#8b5cf6',
    overflow: 'hidden',
  };

  if (person?.avatar && !imgFailed) {
    return (
      <div style={style}>
        <img
          src={person.avatar}
          alt={person.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={() => setImgFailed(true)}
        />
      </div>
    );
  }

  return (
    <div style={style} className={size === 'md' ? 'avatar-md' : size === 'sm' ? 'avatar-sm' : ''}>
      {person?.initials || '?'}
    </div>
  );
}
