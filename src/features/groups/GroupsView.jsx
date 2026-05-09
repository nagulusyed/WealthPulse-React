import { useState } from 'react';
import useStore from '../../store/useStore';
import { formatCurrency } from '../../utils/formatters';
import { Modal, ConfirmModal } from '../../components/ui/Modal';
import { GroupDetail } from './GroupDetail';
import './GroupsView.css';

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
  const [personError, setPersonError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const blur = privacyMode ? 'private-blur' : '';

  if (selectedGroupId) {
    return <GroupDetail groupId={selectedGroupId} onBack={() => setSelectedGroupId(null)} />;
  }

  const otherPeople = people.filter((p) => p.id !== 'self');
  const getBalance = (personId) => useStore.getState().getGlobalBalance(personId);
  const getPersonBalance = (selfId, groupId) => useStore.getState().getPersonBalanceInGroup(selfId, groupId);

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

  const openPersonForm = (person = null) => {
    setEditingPerson(person);
    setPersonName(person?.name || '');
    setPersonError('');
    setShowPersonForm(true);
  };

  const handleSavePerson = (e) => {
    e.preventDefault();
    if (!personName.trim()) return;
    const isDuplicate = people.some((p) => p.id !== editingPerson?.id && p.name.toLowerCase() === personName.trim().toLowerCase());
    if (isDuplicate) { setPersonError('Name already exists'); return; }
    if (editingPerson) updatePerson(editingPerson.id, personName);
    else addPerson(personName);
    setShowPersonForm(false);
    setEditingPerson(null);
    setPersonName('');
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

      {/* People Row */}
      {otherPeople.length > 0 && (
        <div className="people-section">
          <div className="people-row">
            {otherPeople.map((p) => {
              const bal = getBalance(p.id);
              return (
                <div key={p.id} className="avatar-chip clickable" onClick={() => openPersonForm(p)}>
                  <div className="avatar-sm" style={{ background: p.color }}>{p.initials}</div>
                  <div className="chip-info">
                    <span className="chip-name">{p.name}</span>
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

      {/* Groups List or Empty State */}
      {groups.length === 0 ? (
        <div className="groups-empty">
          <div className="groups-empty-icon">🤝</div>
          <p className="groups-empty-title">No groups yet</p>
          <p className="groups-empty-sub">
            Split bills for trips, flat expenses, dinners — and track who owes what automatically.
          </p>
          <button
            className="btn btn-primary"
            onClick={() => otherPeople.length === 0 ? openPersonForm() : setShowAddGroup(true)}
          >
            {otherPeople.length === 0 ? '+ Add a Person First' : '+ Create Group'}
          </button>
          {otherPeople.length === 0 && (
            <p className="groups-empty-hint">You need to add at least one person before creating a group.</p>
          )}
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
                    <div className="avatar-sm" style={{ background: p.color }}>{p.initials}</div>
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
      <Modal isOpen={showPersonForm} onClose={() => { setShowPersonForm(false); setEditingPerson(null); }} title={editingPerson ? 'Edit Person' : 'Add Person'}>
        <form onSubmit={handleSavePerson}>
          <div className="form-group">
            <label className="form-label">Name</label>
            <input className="form-input" value={personName} onChange={(e) => { setPersonName(e.target.value); setPersonError(''); }} placeholder="e.g. Rahul" required autoFocus maxLength={40} />
            {personError && <p style={{ color: 'var(--accent-error)', fontSize: '0.8rem', marginTop: '0.3rem' }}>{personError}</p>}
          </div>
          {editingPerson && (
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Global Balance</div>
              <div className={blur} style={{ fontSize: '1rem', fontWeight: 600 }}>
                {(() => {
                  const bal = getBalance(editingPerson.id);
                  return bal > 0.01 ? <span style={{ color: 'var(--accent-green)' }}>Gets {formatCurrency(bal)}</span>
                    : bal < -0.01 ? <span style={{ color: 'var(--accent-red)' }}>Owes {formatCurrency(Math.abs(bal))}</span>
                    : <span style={{ color: 'var(--text-muted)' }}>Settled</span>;
                })()}
              </div>
            </div>
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
