import { useState, useMemo } from 'react';
import useStore from '../../store/useStore';
import { getCategory, CATEGORIES } from '../../services/categories';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { TransactionForm } from './TransactionForm';
import './TransactionList.css';

export function TransactionList() {
  const transactions = useStore((s) => s.transactions);
  const privacyMode = useStore((s) => s.privacyMode);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [editingTxn, setEditingTxn] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [defaultType, setDefaultType] = useState('expense');

  const filtered = useMemo(() => {
    let list = [...transactions];
    if (filter !== 'all') list = list.filter((t) => t.type === filter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((t) =>
        t.description.toLowerCase().includes(q) ||
        getCategory(t.type, t.category).name.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, filter, search]);

  const blur = privacyMode ? 'private-blur' : '';

  const openForm = (type = 'expense', txn = null) => {
    setDefaultType(type);
    setEditingTxn(txn);
    setShowForm(true);
  };

  return (
    <div className="transactions-view animate-in">
      <div className="txn-header">
        <h2 className="view-title">Transactions</h2>
        <button className="btn btn-primary" onClick={() => openForm()}>+ Add</button>
      </div>

      {/* Search */}
      <div className="search-bar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        <input
          type="text"
          placeholder="Search transactions..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        {['all', 'income', 'expense'].map((f) => (
          <button key={f} className={`filter-tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? 'All' : f === 'income' ? 'Income' : 'Expenses'}
          </button>
        ))}
      </div>

      {/* Transaction List */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <p>No transactions found</p>
        </div>
      ) : (
        <div className="txn-list">
          {filtered.map((t, i) => {
            const cat = getCategory(t.type, t.category);
            return (
              <div
                key={t.id}
                className="txn-item animate-in"
                style={{ animationDelay: `${i * 0.03}s` }}
                onClick={() => openForm(t.type, t)}
              >
                <div className="txn-icon" style={{ background: cat.color + '15', color: cat.color }}>{cat.emoji}</div>
                <div className="txn-details">
                  <div className="txn-desc">{t.description}</div>
                  <div className="txn-meta">{cat.name} · {formatDate(t.date)}</div>
                </div>
                <div className={`txn-amount ${t.type} ${blur}`}>
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Transaction Form Modal */}
      {showForm && (
        <TransactionForm
          transaction={editingTxn}
          defaultType={defaultType}
          onClose={() => { setShowForm(false); setEditingTxn(null); }}
        />
      )}
    </div>
  );
}
