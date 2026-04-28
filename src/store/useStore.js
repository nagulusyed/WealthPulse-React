// ── Zustand Store — Central State Management ──

import { create } from 'zustand';
import { storage } from '../services/storage';
import { DEFAULT_BUDGETS, AVATAR_COLORS } from '../services/categories';
import { generateId, getInitials } from '../utils/helpers';
import { getMonthKey } from '../utils/formatters';

// Apply theme to DOM
function applyTheme(theme) {
  const resolved = theme === 'auto'
    ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    : theme;
  document.documentElement.setAttribute('data-theme', resolved);
  // Update meta theme-color for Android status bar
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = resolved === 'light' ? '#f5f5f7' : '#050505';
}

const useStore = create((set, get) => ({
  // ── Auth State ──
  isLocked: true,
  setLocked: (locked) => set({ isLocked: locked }),

  // ── Privacy ──
  privacyMode: storage.getPrivacyMode(),
  togglePrivacy: () => {
    const next = !get().privacyMode;
    storage.savePrivacyMode(next);
    set({ privacyMode: next });
  },

  // ── Theme ──
  theme: localStorage.getItem('wp_theme') || 'dark',
  setTheme: (theme) => {
    localStorage.setItem('wp_theme', theme);
    applyTheme(theme);
    set({ theme });
  },

  // ── Month Navigation ──
  selectedMonth: new Date(),
  prevMonth: () => set((s) => {
    const d = new Date(s.selectedMonth);
    d.setMonth(d.getMonth() - 1);
    return { selectedMonth: d };
  }),
  nextMonth: () => set((s) => {
    const d = new Date(s.selectedMonth);
    d.setMonth(d.getMonth() + 1);
    return { selectedMonth: d };
  }),

  // ── Transactions ──
  transactions: storage.getTransactions(),

  addTransaction: (txnData) => {
    const txn = { ...txnData, id: txnData.id || generateId() };
    const updated = [txn, ...get().transactions];
    storage.saveTransactions(updated);
    set({ transactions: updated });
    return txn;
  },

  updateTransaction: (id, txnData) => {
    const updated = get().transactions.map((t) => t.id === id ? { ...txnData, id } : t);
    storage.saveTransactions(updated);
    set({ transactions: updated });
  },

  deleteTransaction: (id) => {
    const updated = get().transactions.filter((t) => t.id !== id);
    storage.saveTransactions(updated);
    set({ transactions: updated });
  },

  getMonthlyTransactions: (date) => {
    const key = getMonthKey(date || get().selectedMonth);
    return get().transactions.filter((t) => t.date.startsWith(key));
  },

  // ── Budgets ──
  budgets: (() => {
    const b = storage.getBudgets();
    return Object.keys(b).length > 0 ? b : DEFAULT_BUDGETS;
  })(),

  setBudgetLimit: (categoryId, limit) => {
    const updated = { ...get().budgets, [categoryId]: limit };
    storage.saveBudgets(updated);
    set({ budgets: updated });
  },

  // ── People ──
  people: storage.getPeople(),

  addPerson: (name) => {
    const people = get().people;
    const person = {
      id: generateId('p_'),
      name: name.trim(),
      initials: getInitials(name.trim()),
      color: AVATAR_COLORS[people.length % AVATAR_COLORS.length],
      createdAt: new Date().toISOString(),
    };
    const updated = [...people, person];
    storage.savePeople(updated);
    set({ people: updated });
    return person;
  },

  updatePerson: (id, name) => {
    const updated = get().people.map((p) => p.id === id ? { ...p, name: name.trim(), initials: getInitials(name.trim()) } : p);
    storage.savePeople(updated);
    set({ people: updated });
  },

  deletePerson: (id) => {
    const updated = get().people.filter((p) => p.id !== id);
    storage.savePeople(updated);
    set({ people: updated });
  },

  getPersonById: (id) => get().people.find((p) => p.id === id),

  // ── Groups ──
  groups: storage.getGroups(),

  addGroup: (name, memberIds) => {
    const group = {
      id: generateId('g_'),
      name: name.trim(),
      memberIds: ['self', ...memberIds.filter((id) => id !== 'self')],
      createdAt: new Date().toISOString(),
      isActive: true,
    };
    const updated = [...get().groups, group];
    storage.saveGroups(updated);
    set({ groups: updated });
    return group;
  },

  updateGroup: (id, name, memberIds) => {
    const updated = get().groups.map((g) => g.id === id ? { ...g, name: name.trim(), memberIds } : g);
    storage.saveGroups(updated);
    set({ groups: updated });
  },

  deleteGroup: (id) => {
    const updated = get().groups.filter((g) => g.id !== id);
    storage.saveGroups(updated);
    const updatedExpenses = get().groupExpenses.filter((e) => e.groupId !== id);
    storage.saveGroupExpenses(updatedExpenses);
    set({ groups: updated, groupExpenses: updatedExpenses });
  },

  getGroupById: (id) => get().groups.find((g) => g.id === id),

  // ── Group Expenses ──
  groupExpenses: storage.getGroupExpenses(),

  addGroupExpense: (expense) => {
    const exp = { ...expense, id: expense.id || generateId('e_'), settledBy: expense.settledBy || [], createdAt: new Date().toISOString() };
    const updated = [...get().groupExpenses, exp];
    storage.saveGroupExpenses(updated);
    set({ groupExpenses: updated });
    return exp;
  },

  updateGroupExpense: (id, data) => {
    const updated = get().groupExpenses.map((e) => e.id === id ? { ...e, ...data } : e);
    storage.saveGroupExpenses(updated);
    set({ groupExpenses: updated });
  },

  deleteGroupExpense: (id) => {
    const updated = get().groupExpenses.filter((e) => e.id !== id);
    storage.saveGroupExpenses(updated);
    set({ groupExpenses: updated });
  },

  // ── Balance Calculations ──
  getPersonBalanceInGroup: (personId, groupId) => {
    const expenses = get().groupExpenses.filter((e) => e.groupId === groupId);
    let balance = 0;
    expenses.forEach((exp) => {
      if (exp.paidBy === personId) balance += exp.amount;
      const mySplit = exp.splits.find((s) => s.personId === personId);
      if (mySplit) balance -= mySplit.share;
      (exp.settledBy || []).forEach((settlement) => {
        if (settlement.from === personId) balance += settlement.amount;
        if (settlement.to === personId) balance -= settlement.amount;
      });
    });
    return balance;
  },

  getGlobalBalance: (personId = 'self') => {
    let balance = 0;
    get().groups.forEach((g) => { balance += get().getPersonBalanceInGroup(personId, g.id); });
    return balance;
  },

  getSimplifiedSettlements: (groupId) => {
    const group = get().getGroupById(groupId);
    if (!group) return [];
    const balances = group.memberIds.map((id) => ({ id, balance: get().getPersonBalanceInGroup(id, groupId) }));
    const debtors = balances.filter((b) => b.balance < -0.01).sort((a, b) => a.balance - b.balance);
    const creditors = balances.filter((b) => b.balance > 0.01).sort((a, b) => b.balance - a.balance);
    const transactions = [];
    let d = 0, c = 0;
    while (d < debtors.length && c < creditors.length) {
      const debtor = debtors[d];
      const creditor = creditors[c];
      const amount = Math.min(Math.abs(debtor.balance), creditor.balance);
      if (amount > 0.01) transactions.push({ from: debtor.id, to: creditor.id, amount, groupId });
      debtor.balance += amount;
      creditor.balance -= amount;
      if (Math.abs(debtor.balance) < 0.01) d++;
      if (creditor.balance < 0.01) c++;
    }
    return transactions;
  },

  getAllSettlements: () => {
    let all = [];
    get().groups.forEach((g) => { all.push(...get().getSimplifiedSettlements(g.id)); });
    return all;
  },

  settleDebt: (fromId, toId, groupId, amount) => {
    const exp = {
      id: generateId('set_'), groupId, description: 'Settlement', amount, paidBy: fromId,
      date: new Date().toISOString().split('T')[0], splitMethod: 'equal',
      splits: [{ personId: toId, share: amount }], settledBy: [], createdAt: new Date().toISOString(),
    };
    const updated = [...get().groupExpenses, exp];
    storage.saveGroupExpenses(updated);
    set({ groupExpenses: updated });
  },

  // ── Export / Import ──
  exportData: () => ({
    transactions: get().transactions, budgets: get().budgets, people: get().people,
    groups: get().groups, groupExpenses: get().groupExpenses,
    exportedAt: new Date().toISOString(), version: '3.0.0',
  }),

  importData: (data) => {
    if (data.transactions) storage.saveTransactions(data.transactions);
    if (data.budgets) storage.saveBudgets(data.budgets);
    if (data.people) storage.savePeople(data.people);
    if (data.groups) storage.saveGroups(data.groups);
    if (data.groupExpenses) storage.saveGroupExpenses(data.groupExpenses);
    set({
      transactions: data.transactions || get().transactions,
      budgets: data.budgets || get().budgets,
      people: data.people || get().people,
      groups: data.groups || get().groups,
      groupExpenses: data.groupExpenses || get().groupExpenses,
    });
  },

  // ── Full Reset ──
  resetAll: () => {
    storage.resetAll();
    set({
      transactions: [], budgets: DEFAULT_BUDGETS,
      people: [{ id: 'self', name: 'You', initials: 'You', color: '#8b5cf6', createdAt: new Date().toISOString() }],
      groups: [], groupExpenses: [], privacyMode: false, isLocked: true,
    });
  },
}));

// Apply saved theme on load
applyTheme(useStore.getState().theme);

export default useStore;
