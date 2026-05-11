import { useState, useEffect } from 'react';
import useStore from '../../store/useStore';
import { formatCurrency } from '../../utils/formatters';
import { Modal, ConfirmModal } from '../../components/ui/Modal';
import { GroupDetail } from './GroupDetail';
import { searchContacts, requestContactsPermission, getUpiAppLabel } from '../../services/contactsService';
import './GroupsView.css';
import './PeopleView.css'; // Reuse PeopleView styles for the search results

export function GroupsView() {
  const groups = useStore((s) => s.groups);
  const people = useStore((s) => s.people);
  const groupExpenses = useStore((s) => s.groupExpenses);
  const addGroup = useStore((s) => s.addGroup);
  const addPerson = useStore((s) => s.addPerson);
  const updatePerson = useStore((s) => s.updatePerson);
  const deletePerson = useStore((s) => s.deletePerson);
  const privacyMode = useStore((s) => s.privacyMode);

  const [showAddGroup, setShowAddGroup] = useState(false);
  const [showPersonForm, setShowPersonForm] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [personName, setPersonName] = useState('');
  const [personPhone, setPersonPhone] = useState('');
  const [personUpiId, setPersonUpiId] = useState('');
  const [personContactId, setPersonContactId] = useState(null);
  const [mode, setMode] = useState('manual'); // 'manual' | 'contacts'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [personError, setPersonError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const blur = privacyMode ? 'private-blur' : '';

  // Contact search effect
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

  if (selectedGroupId) {
    return <GroupDetail groupId={selectedGroupId} onBack={() => setSelectedGroupId(null)} />;
  }

  const otherPeople = people.filter((p) => p.id !== 'self');

  const getBalance = (personId) => useStore.getState().getGlobalBalance(personId);
  const getPersonBalance = (selfId, groupId) => useStore.getState().getPersonBalanceInGroup(selfId, groupId);

  // --- Group handlers ---
  const handleCreateGroup = (e) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    addGroup(groupName, selectedMembers);
    setShowAddGroup(false);
    setGroupName('');
    setSelectedMembers([]);
  };

  const toggleMember = (id) => {
    setSelectedMembers((prev) => prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]);
  };

  // --- Person handlers ---
  const openPersonForm = (person = null) => {
    setEditingPerson(person);
    setMode('manual');
    setPersonName(person?.name || '');
    setPersonPhone(person?.phone || '');
    setPersonUpiId(person?.upiId || '');
    setPersonContactId(person?.contactId || null);
    setPersonError('');
    setShowPersonForm(true);
  };

  const selectContact = (contact) => {
    setPersonName(contact.name);
    setPersonPhone(contact.phone || '');
    setPersonUpiId(contact.upiId || '');
    setPersonContactId(contact.id);
    setMode('manual');
    if (editingPerson) {
      setEditingPerson({ ...editingPerson, avatar: contact.avatar });
    }
  };

  const handleContactsMode = async () => {
    const granted = await requestContactsPermission();
    if (granted) {
      setMode('contacts');
      setSearchQuery('');
    } else {
      setPersonError('Permission denied');
    }
  };

  const handleSavePerson = (e) => {
    e.preventDefault();
    if (!personName.trim()) return;
    const isDuplicate = people.some((p) => p.id !== editingPerson?.id && p.name.toLowerCase() === personName.trim().toLowerCase());
    if (isDuplicate) { setPersonError('Name already exists'); return; }

    const personData = {
      name: personName.trim(),
      phone: personPhone.trim(),
      upiId: personUpiId.trim(),
      contactId: personContactId,
      avatar: editingPerson?.avatar || null
    };

    if (editingPerson) {
      updatePerson(editingPerson.id, personData);
    } else {
      addPerson(personData);
    }
    setShowPersonForm(false);
    setEditingPerson(null);
    setPersonName('');
    setPersonPhone('');
    setPersonUpiId('');
    setPersonContactId(null);
  };

  const handleDeletePerson = () => {
    if (editingPerson) {
      deletePerson(editingPerson.id);
      setShowDeleteConfirm(false);
      setShowPersonForm(false);
      setEditingPerson(null);
    }
  };

  return (
    <div className="groups-view animate-in">
      <div className="txn-header">
        <h2 className="view-title">Groups</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-ghost" onClick={() => openPersonForm()}>+ Person</button>
          <button className="btn btn-primary" onClick={() => setShowAddGroup(true)}>+ Group</button>
        </div>
      </div>

      {/* People Row — click to edit/delete */}
      {otherPeople.length > 0 && (
        <div className="people-section">
          <div className="people-row">
            {otherPeople.map((p) => {
              const bal = getBalance(p.id);
              return (
                <div key={p.id} className="avatar-chip clickable" onClick={() => openPersonForm(p)}>
                  {p.avatar ? (
                    <img src={p.avatar} className="avatar-sm" alt={p.name} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                  ) : null}
                  <div className="avatar-sm" style={{ background: p.color, display: p.avatar ? 'none' : 'flex' }}>{p.initials}</div>
                  <div className="chip-info">
                    <span className="chip-name">
                      {p.name}
                      {p.upiId && <span title="UPI Linked" style={{ marginLeft: '4px', fontSize: '0.7rem', opacity: 0.7 }}>💳</span>}
                    </span>
                    <span className={`chip-balance ${bal > 0.01 ? 'positive' : bal < -0.01 ? 'negative' : ''} ${blur}`}>
                      {bal > 0.01 ? `+${formatCurrency(bal)}` : bal < -0.01 ? `-${formatCurrency(Math.abs(bal))}` : 'Settled'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Groups List */}
      {groups.length === 0 ? (
        <div className="empty-state">
          <p>No groups yet. Create a group to start splitting expenses.</p>
        </div>
      ) : (
        <div className="groups-list">
          {groups.map((g) => {
            const bal = getPersonBalance('self', g.id);
            return (
              <div key={g.id} className="group-card" onClick={() => setSelectedGroupId(g.id)}>
                <div className="group-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <div className="group-details">
                  <div className="group-name">{g.name}</div>
                  <div className="group-meta">{g.memberIds.length} members</div>
                </div>
                <div className={`balance-badge ${bal > 0.01 ? 'positive' : bal < -0.01 ? 'negative' : 'neutral'} ${blur}`}>
                  {bal > 0.01 ? `You get ${formatCurrency(bal)}` : bal < -0.01 ? `You owe ${formatCurrency(Math.abs(bal))}` : 'Settled'}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Group Modal */}
      <Modal isOpen={showAddGroup} onClose={() => setShowAddGroup(false)} title="Create Group">
        <form onSubmit={handleCreateGroup}>
          <div className="form-group">
            <label className="form-label">Group Name</label>
            <input className="form-input" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="e.g. Flat Expenses" required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Members</label>
            {otherPeople.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Add people first using the "+ Person" button</p>
            ) : (
              <div className="member-checkboxes">
                {otherPeople.map((p) => (
                  <label key={p.id} className="member-checkbox">
                    <input type="checkbox" checked={selectedMembers.includes(p.id)} onChange={() => toggleMember(p.id)} />
                    {p.avatar ? (
                      <img src={p.avatar} className="avatar-sm" alt={p.name} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                    ) : null}
                    <div className="avatar-sm" style={{ background: p.color, display: p.avatar ? 'none' : 'flex' }}>{p.initials}</div>
                    <span>{p.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button type="button" className="btn btn-ghost" onClick={() => setShowAddGroup(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Create</button>
          </div>
        </form>
      </Modal>

      {/* Add / Edit Person Modal */}
      <Modal 
        isOpen={showPersonForm} 
        onClose={() => { setShowPersonForm(false); setEditingPerson(null); }} 
        title={editingPerson ? 'Edit Person' : 'Add Person'}
        className="modal-small"
      >
        <div className="mode-toggle">
          <button 
            type="button"
            className={`mode-btn ${mode === 'manual' ? 'active' : ''}`}
            onClick={() => setMode('manual')}
          >
            Manual
          </button>
          <button 
            type="button"
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
            <div className="search-results" style={{ maxHeight: '250px' }}>
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
          <form onSubmit={handleSavePerson}>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-input" value={personName} onChange={(e) => { setPersonName(e.target.value); setPersonError(''); }} placeholder="e.g. Rahul" required autoFocus maxLength={40} />
              {personError && <p style={{ color: 'var(--accent-error)', fontSize: '0.8rem', marginTop: '0.3rem' }}>{personError}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">Phone (Optional)</label>
              <input className="form-input" value={personPhone} onChange={(e) => setPersonPhone(e.target.value)} placeholder="+91 XXXXX XXXXX" />
            </div>
            <div className="form-group">
              <label className="form-label">UPI ID (Optional)</label>
              <input className="form-input" value={personUpiId} onChange={(e) => setPersonUpiId(e.target.value)} placeholder="e.g. name@upi" />
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

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              {editingPerson && (
                <button type="button" className="btn btn-danger" onClick={() => setShowDeleteConfirm(true)}>Delete</button>
              )}
              <div style={{ flex: 1 }} />
              <button type="button" className="btn btn-ghost" onClick={() => { setShowPersonForm(false); setEditingPerson(null); }}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save</button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeletePerson}
        message={`Delete ${editingPerson?.name}? Their group expenses will remain but they won't appear in people list.`}
      />
    </div>
  );
}
