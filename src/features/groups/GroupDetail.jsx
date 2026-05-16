import { useState, useMemo, useEffect } from 'react';
import useStore from '../../store/useStore';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { getCategory } from '../../services/categories';
import { Modal, ConfirmModal } from '../../components/ui/Modal';
import { GroupExpenseForm } from './GroupExpenseForm';
import { SettleModal } from './SettleModal';
import './GroupDetail.css';

export function GroupDetail({ groupId, onBack }) {
  const groups             = useStore((s) => s.groups);
  const groupExpenses      = useStore((s) => s.groupExpenses);
  const people             = useStore((s) => s.people);
  const updateGroup        = useStore((s) => s.updateGroup);
  const deleteGroup        = useStore((s) => s.deleteGroup);
  const deleteGroupExpense = useStore((s) => s.deleteGroupExpense);
  const privacyMode        = useStore((s) => s.privacyMode);

  // Always use getState() for store methods that call get() internally
  const group                   = useStore.getState().getGroupById(groupId);
  const getPersonById           = (id) => useStore.getState().getPersonById(id);
  const getPersonBalanceInGroup = (pid, gid) => useStore.getState().getPersonBalanceInGroup(pid, gid);
  const getSimplifiedSettlements = (gid) => useStore.getState().getSimplifiedSettlements(gid);

  // Fix #15: tabKey forces fade-in CSS animation on tab switch
  const [tab, setTab]       = useState('expenses');
  const [tabKey, setTabKey] = useState(0);
  const switchTab = (t) => { setTab(t); setTabKey((k) => k + 1); };

  // Fix #16: save/restore scroll position when navigating back
  useEffect(() => {
    const mainContent = document.querySelector('.main-content');
    const saved = sessionStorage.getItem(`gd_scroll_${groupId}`);
    if (saved && mainContent) mainContent.scrollTo(0, parseInt(saved, 10));
    return () => {
      const mc = document.querySelector('.main-content');
      if (mc) sessionStorage.setItem(`gd_scroll_${groupId}`, String(mc.scrollTop));
    };
  }, [groupId]);

  const [showAddExpense,           setShowAddExpense]           = useState(false);
  const [editingExpense,           setEditingExpense]           = useState(null);
  const [showExpenseDetail,        setShowExpenseDetail]        = useState(null);
  const [showEditGroup,            setShowEditGroup]            = useState(false);
  const [showDeleteGroupConfirm,   setShowDeleteGroupConfirm]   = useState(false);
  const [showDeleteExpenseConfirm, setShowDeleteExpenseConfirm] = useState(false);
  const [editGroupName,   setEditGroupName]   = useState('');
  const [editGroupMembers,setEditGroupMembers]= useState([]);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleData,      setSettleData]      = useState(null);

  const expenses = useMemo(() =>
    groupExpenses.filter((e) => e.groupId === groupId && e.description !== 'Settlement').sort((a, b) => new Date(b.date) - new Date(a.date)),
    [groupExpenses, groupId]
  );

  const settlementRecords = useMemo(() =>
    groupExpenses.filter((e) => e.groupId === groupId && e.description === 'Settlement').sort((a, b) => new Date(b.date) - new Date(a.date)),
    [groupExpenses, groupId]
  );

  const totalSpent   = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);
  const myShareTotal = useMemo(() => expenses.reduce((s, e) => { const sp = e.splits?.find((x) => x.personId === 'self'); return s + (sp?.share || 0); }, 0), [expenses]);
  const myBal        = useMemo(() => getPersonBalanceInGroup('self', groupId), [groupExpenses, groups]);
  const settlements  = useMemo(() => getSimplifiedSettlements(groupId), [groupExpenses, groups]);

  const memberSummary = useMemo(() => {
    const grp = useStore.getState().getGroupById(groupId);
    if (!grp) return [];
    return grp.memberIds.map((mId) => {
      const p    = getPersonById(mId);
      const paid = expenses.reduce((s, e) => e.paidBy === mId ? s + e.amount : s, 0);
      const share = expenses.reduce((s, e) => { const sp = e.splits?.find((x) => x.personId === mId); return s + (sp?.share || 0); }, 0);
      return { id: mId, person: p, paid, share };
    }).sort((a, b) => b.paid - a.paid);
  }, [groupExpenses, groups, expenses]);

  const blur = privacyMode ? 'private-blur' : '';

  if (!group) return null;

  const openEditGroup = () => { setEditGroupName(group.name); setEditGroupMembers([...group.memberIds.filter((id) => id !== 'self')]); setShowEditGroup(true); };
  const handleSaveEditGroup = (e) => { e.preventDefault(); if (!editGroupName.trim()) return; updateGroup(group.id, editGroupName, ['self', ...editGroupMembers]); setShowEditGroup(false); };
  const handleDeleteGroup = () => { deleteGroup(group.id); onBack(); };
  const handleDeleteExpense = () => { if (showExpenseDetail) { deleteGroupExpense(showExpenseDetail.id); setShowExpenseDetail(null); } };
  const otherPeople = people.filter((p) => p.id !== 'self');
  const toggleEditMember = (id) => setEditGroupMembers((prev) => prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]);
  const topPayer = memberSummary.find((m) => m.paid > 0);

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

      {/* Members row */}
      <div className="people-row" style={{ marginBottom: '1rem' }}>
        {group.memberIds.map((mId) => {
          const p = getPersonById(mId);
          if (!p) return null;
          return (
            <div key={mId} className="avatar-chip">
              {p.avatar ? <img src={p.avatar} className="avatar-sm" alt={p.name} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} /> : null}
              <div className="avatar-sm" style={{ background: p.color, display: p.avatar ? 'none' : 'flex' }}>{p.initials}</div>
              <span>{p.name}</span>
            </div>
          );
        })}
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
        {[
          { label: 'Total Spent', val: formatCurrency(totalSpent), color: 'var(--text-primary)' },
          { label: 'Your Share',  val: formatCurrency(myShareTotal), color: 'var(--text-primary)' },
          { label: 'Balance', val: (myBal < 0 ? '-' : '') + formatCurrency(Math.abs(myBal)), color: myBal > 0.01 ? 'var(--accent-green)' : myBal < -0.01 ? 'var(--accent-red)' : 'var(--text-primary)' },
        ].map((s) => (
          <div key={s.label} className="card" style={{ textAlign: 'center', padding: '0.75rem' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
            <div className={blur} style={{ fontSize: '1rem', fontWeight: 700, marginTop: '0.15rem', color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Who paid bar */}
      {expenses.length > 0 && totalSpent > 0 && (
        <div className="card" style={{ marginBottom: '1rem', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Who Paid</h3>
            {topPayer && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>🏆 {topPayer.person?.name} paid most</span>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {memberSummary.filter((m) => m.paid > 0 || m.share > 0).map((m) => {
              const pct = totalSpent > 0 ? (m.paid / totalSpent) * 100 : 0;
              const bal = getPersonBalanceInGroup(m.id, groupId);
              return (
                <div key={m.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 4 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: m.person?.color || '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>{m.person?.initials || '?'}</div>
                    <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 500 }}>{m.person?.name || 'Unknown'}</span>
                    <span className={blur} style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{formatCurrency(m.paid)}</span>
                    <span className={blur} style={{ fontSize: '0.7rem', fontWeight: 600, padding: '1px 7px', borderRadius: 999, background: bal > 0.01 ? 'rgba(16,185,129,0.12)' : bal < -0.01 ? 'rgba(239,68,68,0.12)' : 'rgba(148,163,184,0.1)', color: bal > 0.01 ? 'var(--accent-green)' : bal < -0.01 ? 'var(--accent-red)' : 'var(--text-muted)' }}>
                      {bal > 0.01 ? `+${formatCurrency(bal)}` : bal < -0.01 ? `-${formatCurrency(Math.abs(bal))}` : 'Even'}
                    </span>
                  </div>
                  <div style={{ height: 5, borderRadius: 999, background: 'var(--bg-elevated)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, borderRadius: 999, background: m.person?.color || 'var(--accent-indigo)', transition: 'width 0.4s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="filter-tabs" style={{ marginBottom: '1rem' }}>
        {['expenses', 'balances', 'history'].map((t) => (
          <button key={t} className={`filter-tab ${tab === t ? 'active' : ''}`} onClick={() => switchTab(t)}>
            {t === 'expenses' ? 'Expenses' : t === 'balances' ? 'Balances' : (
              <span>History{settlementRecords.length > 0 && <span style={{ marginLeft: 4, background: 'rgba(99,102,241,0.18)', color: 'var(--accent-indigo)', fontSize: '0.68rem', fontWeight: 700, padding: '1px 6px', borderRadius: 999 }}>{settlementRecords.length}</span>}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content — Fix #15: key prop re-mounts for fade-in */}
      <div key={tabKey} className="group-tab-content">

        {tab === 'expenses' && (
          expenses.length === 0 ? (
            <div className="empty-state"><p>No expenses yet. Tap "+ Expense" to start splitting!</p></div>
          ) : (
            <div className="txn-list">
              {expenses.map((exp) => {
                const p = getPersonById(exp.paidBy);
                const cat = getCategory('expense', exp.category);
                const mySplit = exp.splits?.find((s) => s.personId === 'self');
                let myText = '', myClass = '';
                if (exp.paidBy === 'self') { myText = `you lent ${formatCurrency(exp.amount - (mySplit?.share || 0))}`; myClass = 'income'; }
                else if (mySplit) { myText = `you borrowed ${formatCurrency(mySplit.share)}`; myClass = 'expense'; }
                else { myText = 'not involved'; }
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
            </div>
          )
        )}

        {tab === 'balances' && (
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
                      {p.avatar ? <img src={p.avatar} className="avatar-sm" alt={p.name} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} /> : null}
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
              {settlements.length === 0 ? <p className="empty-text">All settled up!</p> : (
                <div className="txn-list">
                  {settlements.map((t, i) => {
                    const fromP = getPersonById(t.from);
                    const toP   = getPersonById(t.to);
                    const isYouInvolved = t.from === 'self' || t.to === 'self';
                    return (
                      <div key={i} className="txn-item">
                        {fromP?.avatar ? <img src={fromP.avatar} className="avatar-sm" alt={fromP?.name} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} /> : null}
                        <div className="avatar-sm" style={{ background: fromP?.color || '#888', display: fromP?.avatar ? 'none' : 'flex' }}>{fromP?.initials}</div>
                        <div className="txn-details" style={{ fontSize: '0.85rem' }}><strong>{fromP?.name}</strong> → <strong>{toP?.name}</strong></div>
                        <div className={blur} style={{ fontWeight: 600, marginRight: '0.5rem', fontSize: '0.85rem' }}>{formatCurrency(t.amount)}</div>
                        <button className={`btn ${isYouInvolved ? 'btn-success' : 'btn-ghost'}`} style={{ padding: '0.3rem 0.6rem', fontSize: '0.72rem' }} onClick={() => { setSettleData(t); setShowSettleModal(true); }}>
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

        {tab === 'history' && (
          settlementRecords.length === 0 ? (
            <div className="empty-state">
              <p>No settlements recorded yet.</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Settlements appear here after you mark payments.</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                <div className="card" style={{ textAlign: 'center', padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Settled</div>
                  <div className={blur} style={{ fontSize: '1rem', fontWeight: 700, marginTop: '0.15rem', color: 'var(--accent-green)' }}>
                    {formatCurrency(settlementRecords.reduce((s, e) => s + e.amount, 0))}
                  </div>
                </div>
                <div className="card" style={{ textAlign: 'center', padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Payments</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, marginTop: '0.15rem' }}>{settlementRecords.length}</div>
                </div>
              </div>
              <div className="txn-list">
                {settlementRecords.map((s) => {
                  const payer    = getPersonById(s.paidBy);
                  const receiver = getPersonById(s.splits?.[0]?.personId);
                  const isYouPaid     = s.paidBy === 'self';
                  const isYouReceived = s.splits?.[0]?.personId === 'self';
                  const isYouInvolved = isYouPaid || isYouReceived;
                  return (
                    <div key={s.id} className="txn-item" style={{ alignItems: 'flex-start', paddingTop: '0.85rem', paddingBottom: '0.85rem' }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: payer?.color || '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>{payer?.initials || '?'}</div>
                      <div className="txn-details" style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span>{payer?.name || 'Unknown'}</span>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                          <span>{receiver?.name || 'Unknown'}</span>
                          {isYouInvolved && <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '1px 6px', borderRadius: 999, background: 'rgba(99,102,241,0.12)', color: 'var(--accent-indigo)' }}>You</span>}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{formatDate(s.date)}</div>
                      </div>
                      <div className={blur} style={{ fontWeight: 700, fontSize: '0.95rem', flexShrink: 0, color: isYouPaid ? 'var(--accent-red)' : isYouReceived ? 'var(--accent-green)' : 'var(--text-primary)' }}>
                        {formatCurrency(s.amount)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )
        )}
      </div>

      {/* Modals */}
      {showAddExpense && <GroupExpenseForm groupId={groupId} expense={editingExpense} onClose={() => { setShowAddExpense(false); setEditingExpense(null); }} />}

      {showExpenseDetail && (
        <Modal isOpen onClose={() => setShowExpenseDetail(null)} title={showExpenseDetail.description}>
          <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{getPersonById(showExpenseDetail.paidBy)?.name} paid · {formatDate(showExpenseDetail.date)}</div>
            <h1 className={blur} style={{ fontSize: '2rem', margin: '0.5rem 0' }}>{formatCurrency(showExpenseDetail.amount)}</h1>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.25rem' }}>
            {showExpenseDetail.splits?.map((sp) => {
              const p = getPersonById(sp.personId);
              if (!p) return null;
              return (
                <div key={sp.personId} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.4rem 0' }}>
                  {p.avatar ? <img src={p.avatar} className="avatar-sm" alt={p.name} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} /> : null}
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
            <button className="btn btn-primary" onClick={() => { setEditingExpense(showExpenseDetail); setShowExpenseDetail(null); setShowAddExpense(true); }}>Edit</button>
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
                  {p.avatar ? <img src={p.avatar} className="avatar-sm" alt={p.name} onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} /> : null}
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

      <ConfirmModal isOpen={showDeleteGroupConfirm} onClose={() => setShowDeleteGroupConfirm(false)} onConfirm={handleDeleteGroup} message={`Delete "${group.name}" and all its expenses?`} />
      <ConfirmModal isOpen={showDeleteExpenseConfirm} onClose={() => setShowDeleteExpenseConfirm(false)} onConfirm={handleDeleteExpense} message="Delete this expense?" />
      {showSettleModal && <SettleModal isOpen={showSettleModal} onClose={() => { setShowSettleModal(false); setSettleData(null); }} settleData={settleData} />}
    </div>
  );
}
