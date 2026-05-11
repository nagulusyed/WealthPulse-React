import { useState, useMemo } from 'react';
import useStore from '../../store/useStore';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { getCategory } from '../../services/categories';
import { Modal, ConfirmModal } from '../../components/ui/Modal';
import { GroupExpenseForm } from './GroupExpenseForm';
import { SettleModal } from './SettleModal';

export function GroupDetail({ groupId, onBack }) {
  const group = useStore((s) => s.getGroupById(groupId));
  const groupExpenses = useStore((s) => s.groupExpenses);
  const people = useStore((s) => s.people);
  const getPersonById = useStore((s) => s.getPersonById);
  const getPersonBalanceInGroup = useStore((s) => s.getPersonBalanceInGroup);
  const getSimplifiedSettlements = useStore((s) => s.getSimplifiedSettlements);
  const updateGroup = useStore((s) => s.updateGroup);
  const deleteGroup = useStore((s) => s.deleteGroup);
  const deleteGroupExpense = useStore((s) => s.deleteGroupExpense);
  const privacyMode = useStore((s) => s.privacyMode);

  const [tab, setTab] = useState('expenses');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [showExpenseDetail, setShowExpenseDetail] = useState(null);
  const [showEditGroup, setShowEditGroup] = useState(false);
  const [showDeleteGroupConfirm, setShowDeleteGroupConfirm] = useState(false);
  const [showDeleteExpenseConfirm, setShowDeleteExpenseConfirm] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupMembers, setEditGroupMembers] = useState([]);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleData, setSettleData] = useState(null);

  const expenses = useMemo(() =>
    groupExpenses
      .filter((e) => e.groupId === groupId && e.description !== 'Settlement')
      .sort((a, b) => new Date(b.date) - new Date(a.date)),
    [groupExpenses, groupId]
  );

  const settlementRecords = useMemo(() =>
    groupExpenses
      .filter((e) => e.groupId === groupId && e.description === 'Settlement')
      .sort((a, b) => new Date(b.date) - new Date(a.date)),
    [groupExpenses, groupId]
  );

  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const myShareTotal = useMemo(() => {
    return expenses.reduce((s, e) => {
      const mySplit = e.splits?.find((sp) => sp.personId === 'self');
      return s + (mySplit?.share || 0);
    }, 0);
  }, [expenses]);
  const myBal = getPersonBalanceInGroup('self', groupId);
  const settlements = getSimplifiedSettlements(groupId);
  const blur = privacyMode ? 'private-blur' : '';

  if (!group) return null;

  const openEditGroup = () => {
    setEditGroupName(group.name);
    setEditGroupMembers([...group.memberIds.filter((id) => id !== 'self')]);
    setShowEditGroup(true);
  };

  const handleSaveEditGroup = (e) => {
    e.preventDefault();
    if (!editGroupName.trim()) return;
    updateGroup(group.id, editGroupName, ['self', ...editGroupMembers]);
    setShowEditGroup(false);
  };

  const handleDeleteGroup = () => {
    deleteGroup(group.id);
    onBack();
  };

  const handleDeleteExpense = () => {
    if (showExpenseDetail) {
      deleteGroupExpense(showExpenseDetail.id);
      setShowExpenseDetail(null);
    }
  };

  const otherPeople = people.filter((p) => p.id !== 'self');
  const toggleEditMember = (id) => {
    setEditGroupMembers((prev) => prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]);
  };

  return (
    <div className="animate-in" style={{ maxWidth: 700, margin: '0 auto' }}>
      {/* Header */}
      <div className="txn-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
          <button className="btn btn-ghost" onClick={onBack} style={{ padding: '0.4rem', flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <h2 className="view-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.name}</h2>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
          <button className="btn btn-ghost" onClick={openEditGroup}>Edit</button>
          <button className="btn btn-primary" onClick={() => { setEditingExpense(null); setShowAddExpense(true); }}>+ Expense</button>
        </div>
      </div>

      {/* Members */}
      <div className="people-row" style={{ marginBottom: '1rem' }}>
        {group.memberIds.map((mId) => {
          const p = getPersonById(mId);
          if (!p) return null;
          return (
            <div key={mId} className="avatar-chip">
              {p.avatar ? (
                <img src={p.avatar} className="avatar-sm" alt={p.name} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
              ) : null}
              <div className="avatar-sm" style={{ background: p.color, display: p.avatar ? 'none' : 'flex' }}>{p.initials}</div>
              <span>{p.name}</span>
            </div>
          );
        })}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
        <div className="card" style={{ textAlign: 'center', padding: '0.75rem' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Total Spent</div>
          <div className={blur} style={{ fontSize: '1rem', fontWeight: 700, marginTop: '0.15rem' }}>{formatCurrency(totalSpent)}</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '0.75rem' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Your Share</div>
          <div className={blur} style={{ fontSize: '1rem', fontWeight: 700, marginTop: '0.15rem' }}>{formatCurrency(myShareTotal)}</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '0.75rem' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Balance</div>
          <div className={blur} style={{ fontSize: '1rem', fontWeight: 700, marginTop: '0.15rem', color: myBal > 0.01 ? 'var(--accent-green)' : myBal < -0.01 ? 'var(--accent-red)' : 'var(--text-primary)' }}>
            {myBal < 0 ? '-' : ''}{formatCurrency(Math.abs(myBal))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="filter-tabs" style={{ marginBottom: '1rem' }}>
        <button className={`filter-tab ${tab === 'expenses' ? 'active' : ''}`} onClick={() => setTab('expenses')}>Expenses</button>
        <button className={`filter-tab ${tab === 'balances' ? 'active' : ''}`} onClick={() => setTab('balances')}>Balances</button>
      </div>

      {tab === 'expenses' ? (
        <>
          {expenses.length === 0 && settlementRecords.length === 0 ? (
            <div className="empty-state"><p>No expenses yet. Tap "+ Expense" to start splitting!</p></div>
          ) : (
            <div className="txn-list">
              {expenses.map((exp) => {
                const p = getPersonById(exp.paidBy);
                const cat = getCategory('expense', exp.category);
                const mySplit = exp.splits?.find((s) => s.personId === 'self');
                let myText = '', myClass = '';
                if (exp.paidBy === 'self') {
                  myText = `you lent ${formatCurrency(exp.amount - (mySplit?.share || 0))}`;
                  myClass = 'income';
                } else if (mySplit) {
                  myText = `you borrowed ${formatCurrency(mySplit.share)}`;
                  myClass = 'expense';
                } else {
                  myText = 'not involved';
                }
                return (
                  <div key={exp.id} className="txn-item" onClick={() => setShowExpenseDetail(exp)} style={{ cursor: 'pointer' }}>
                    <div className="txn-icon" style={{ background: cat.color + '15', color: cat.color }}>{cat.emoji}</div>
                    <div className="txn-details">
                      <div className="txn-desc">{exp.description}</div>
                      <div className="txn-meta">{p?.name} paid {formatCurrency(exp.amount)} · {formatDate(exp.date)}</div>
                    </div>
                    <div className={`txn-amount ${myClass} ${blur}`} style={{ fontSize: '0.8rem' }}>{myText}</div>
                  </div>
                );
              })}
              {/* Show settlement records in history */}
              {settlementRecords.map((s) => {
                const payer = getPersonById(s.paidBy);
                const receiver = getPersonById(s.splits?.[0]?.personId);
                const isThirdParty = s.paidBy !== 'self' && s.splits?.[0]?.personId !== 'self';
                return (
                  <div key={s.id} className="txn-item" style={{ opacity: 0.75 }}>
                    <div className="txn-icon" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--accent-indigo)', fontSize: '0.9rem' }}>💸</div>
                    <div className="txn-details">
                      <div className="txn-desc">{payer?.name} paid {receiver?.name}</div>
                      <div className="txn-meta">Settlement · {formatDate(s.date)}</div>
                    </div>
                    <div className={`txn-amount income ${blur}`} style={{ fontSize: '0.8rem' }}>{formatCurrency(s.amount)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <div>
          <div className="card" style={{ marginBottom: '0.75rem' }}>
            <h3 className="card-title">Member Balances</h3>
            <div className="txn-list">
              {group.memberIds.map((mId) => {
                const p = getPersonById(mId);
                const bal = getPersonBalanceInGroup(mId, groupId);
                if (!p) return null;
                return (
                  <div key={mId} className="txn-item">
                    {p.avatar ? (
                      <img src={p.avatar} className="avatar-sm" alt={p.name} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                    ) : null}
                    <div className="avatar-sm" style={{ background: p.color, display: p.avatar ? 'none' : 'flex' }}>{p.initials}</div>
                    <div className="txn-details"><div className="txn-desc">{p.name}</div></div>
                    <div className={`txn-amount ${bal > 0.01 ? 'income' : bal < -0.01 ? 'expense' : ''} ${blur}`}>
                      {bal > 0.01 ? `Gets ${formatCurrency(bal)}` : bal < -0.01 ? `Owes ${formatCurrency(Math.abs(bal))}` : 'Settled'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <h3 className="card-title">Suggested Settlements</h3>
            {settlements.length === 0 ? (
              <p className="empty-text">All settled up!</p>
            ) : (
              <div className="txn-list">
                {settlements.map((t, i) => {
                  const fromP = getPersonById(t.from);
                  const toP = getPersonById(t.to);
                  const isYouInvolved = t.from === 'self' || t.to === 'self';
                  return (
                    <div key={i} className="txn-item">
                      {fromP?.avatar ? (
                        <img src={fromP.avatar} className="avatar-sm" alt={fromP?.name} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                      ) : null}
                      <div className="avatar-sm" style={{ background: fromP?.color || '#888', display: fromP?.avatar ? 'none' : 'flex' }}>{fromP?.initials}</div>
                      <div className="txn-details" style={{ fontSize: '0.85rem' }}>
                        <strong>{fromP?.name}</strong> → <strong>{toP?.name}</strong>
                      </div>
                      <div className={blur} style={{ fontWeight: 600, marginRight: '0.5rem', fontSize: '0.85rem' }}>{formatCurrency(t.amount)}</div>
                      <button
                        className={`btn ${isYouInvolved ? 'btn-success' : 'btn-ghost'}`}
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }}
                        onClick={() => { setSettleData(t); setShowSettleModal(true); }}
                      >
                        {isYouInvolved ? 'Settle' : 'Record'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {showAddExpense && (
        <GroupExpenseForm groupId={groupId} expense={editingExpense}
          onClose={() => { setShowAddExpense(false); setEditingExpense(null); }} />
      )}

      {showExpenseDetail && (
        <Modal isOpen onClose={() => setShowExpenseDetail(null)} title={showExpenseDetail.description}>
          <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              {getPersonById(showExpenseDetail.paidBy)?.name} paid · {formatDate(showExpenseDetail.date)}
            </div>
            <h1 className={blur} style={{ fontSize: '2rem', margin: '0.5rem 0' }}>{formatCurrency(showExpenseDetail.amount)}</h1>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.25rem' }}>
            {showExpenseDetail.splits?.map((sp) => {
              const p = getPersonById(sp.personId);
              if (!p) return null;
              return (
                <div key={sp.personId} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.4rem 0' }}>
                  {p.avatar ? (
                    <img src={p.avatar} className="avatar-sm" alt={p.name} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                  ) : null}
                  <div className="avatar-sm" style={{ background: p.color, display: p.avatar ? 'none' : 'flex' }}>{p.initials}</div>
                  <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 500 }}>{p.name}</span>
                  <span className={blur} style={{ fontSize: '0.875rem', fontWeight: 600 }}>{formatCurrency(sp.share)}</span>
                </div>
              );
            })}
          </div>
          <div className="modal-actions">
            <button className="btn btn-danger" onClick={() => setShowDeleteExpenseConfirm(true)}>Delete</button>
            <div style={{ flex: 1 }} />
            <button className="btn btn-ghost" onClick={() => setShowExpenseDetail(null)}>Close</button>
            <button className="btn btn-primary" onClick={() => {
              setEditingExpense(showExpenseDetail);
              setShowExpenseDetail(null);
              setShowAddExpense(true);
            }}>Edit</button>
          </div>
        </Modal>
      )}

      <Modal isOpen={showEditGroup} onClose={() => setShowEditGroup(false)} title="Edit Group">
        <form onSubmit={handleSaveEditGroup}>
          <div className="form-group">
            <label className="form-label">Group Name</label>
            <input className="form-input" value={editGroupName} onChange={(e) => setEditGroupName(e.target.value)} required maxLength={50} />
          </div>
          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label className="form-label">Members</label>
            <div className="member-checkboxes">
              {otherPeople.map((p) => (
                <label key={p.id} className="member-checkbox">
                  <input type="checkbox" checked={editGroupMembers.includes(p.id)} onChange={() => toggleEditMember(p.id)} />
                  {p.avatar ? (
                    <img src={p.avatar} className="avatar-sm" alt={p.name} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                  ) : null}
                  <div className="avatar-sm" style={{ background: p.color, display: p.avatar ? 'none' : 'flex' }}>{p.initials}</div>
                  <span>{p.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-danger" onClick={() => { setShowEditGroup(false); setShowDeleteGroupConfirm(true); }}>Delete</button>
            <div style={{ flex: 1 }} />
            <button type="button" className="btn btn-ghost" onClick={() => setShowEditGroup(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal isOpen={showDeleteGroupConfirm} onClose={() => setShowDeleteGroupConfirm(false)} onConfirm={handleDeleteGroup}
        message={`Delete "${group.name}" and all its expenses?`} />
      <ConfirmModal isOpen={showDeleteExpenseConfirm} onClose={() => setShowDeleteExpenseConfirm(false)} onConfirm={handleDeleteExpense}
        message="Delete this expense?" />
      {showSettleModal && (
        <SettleModal isOpen={showSettleModal} onClose={() => { setShowSettleModal(false); setSettleData(null); }} settleData={settleData} />
      )}
    </div>
  );
}
