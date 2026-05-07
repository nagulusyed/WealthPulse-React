// ── Zustand Store — Central State Management ──

import { create } from 'zustand';
import { hashPin, hashSecurityAnswer } from '../services/crypto';
import { storage, migrateFromVanillaApp } from '../services/storage';
import { DEFAULT_BUDGETS, AVATAR_COLORS } from '../services/categories';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { generateId, getInitials } from '../utils/helpers';
import { getMonthKey } from '../utils/formatters';

function applyTheme(theme) {
  const resolved = theme === 'auto'
    ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    : theme;
  document.documentElement.setAttribute('data-theme', resolved);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = resolved === 'light' ? '#f5f5f7' : '#050505';
}

const useStore = create((set, get) => ({
  // ── Auth ──
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
  prevMonth: () => set((s) => { const d = new Date(s.selectedMonth); d.setMonth(d.getMonth() - 1); return { selectedMonth: d }; }),
  nextMonth: () => set((s) => { const d = new Date(s.selectedMonth); d.setMonth(d.getMonth() + 1); return { selectedMonth: d }; }),

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
  budgets: (() => { const b = storage.getBudgets(); return Object.keys(b).length > 0 ? b : DEFAULT_BUDGETS; })(),
  setBudgetLimit: (categoryId, limit) => {
    const updated = { ...get().budgets, [categoryId]: limit };
    storage.saveBudgets(updated);
    set({ budgets: updated });
  },

  // ── People ──
  people: storage.getPeople(),
  addPerson: (name) => {
    const people = get().people;
    const person = { id: generateId('p_'), name: name.trim(), initials: getInitials(name.trim()), color: AVATAR_COLORS[people.length % AVATAR_COLORS.length], createdAt: new Date().toISOString() };
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
    const group = { id: generateId('g_'), name: name.trim(), memberIds: ['self', ...memberIds.filter((id) => id !== 'self')], createdAt: new Date().toISOString(), isActive: true };
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
    if (exp.paidBy === 'self') {
      const group = get().getGroupById(exp.groupId);
      get().addTransaction({ id: `group_exp_${exp.id}`, type: 'expense', amount: exp.amount, category: exp.category || 'other_exp', date: exp.date, description: `Group: ${group?.name || 'Group'} - ${exp.description}`, notes: 'Splitwise sync' });
    }
    set({ groupExpenses: updated });
    return exp;
  },
  updateGroupExpense: (id, data) => {
    const oldExp = get().groupExpenses.find((e) => e.id === id);
    const updated = get().groupExpenses.map((e) => e.id === id ? { ...e, ...data } : e);
    storage.saveGroupExpenses(updated);
    const updatedExp = updated.find((e) => e.id === id);
    if (updatedExp) {
      const txnId = `group_exp_${id}`;
      let existingTxn = get().transactions.find((t) => t.id === txnId);
      if (!existingTxn && oldExp?.paidBy === 'self') {
        existingTxn = get().transactions.find((t) => t.notes === 'Splitwise sync' && t.amount === oldExp.amount && t.date === oldExp.date);
      }
      if (updatedExp.paidBy === 'self') {
        const group = get().getGroupById(updatedExp.groupId);
        const txnData = { type: 'expense', amount: updatedExp.amount, category: updatedExp.category || 'other_exp', date: updatedExp.date, description: `Group: ${group?.name || 'Group'} - ${updatedExp.description}`, notes: 'Splitwise sync' };
        if (existingTxn) {
          if (existingTxn.id !== txnId) { get().deleteTransaction(existingTxn.id); get().addTransaction({ id: txnId, ...txnData }); }
          else get().updateTransaction(txnId, txnData);
        } else get().addTransaction({ id: txnId, ...txnData });
      } else if (existingTxn) get().deleteTransaction(existingTxn.id);
    }
    set({ groupExpenses: updated });
  },
  deleteGroupExpense: (id) => {
    const oldExp = get().groupExpenses.find((e) => e.id === id);
    const updated = get().groupExpenses.filter((e) => e.id !== id);
    storage.saveGroupExpenses(updated);
    const txnId = `group_exp_${id}`;
    let existingTxn = get().transactions.find((t) => t.id === txnId);
    if (!existingTxn && oldExp?.paidBy === 'self') {
      existingTxn = get().transactions.find((t) => t.notes === 'Splitwise sync' && t.amount === oldExp.amount && t.date === oldExp.date);
    }
    if (existingTxn) get().deleteTransaction(existingTxn.id);
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
      (exp.settledBy || []).forEach((s) => { if (s.from === personId) balance += s.amount; if (s.to === personId) balance -= s.amount; });
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
      const debtor = debtors[d]; const creditor = creditors[c];
      const amount = Math.min(Math.abs(debtor.balance), creditor.balance);
      if (amount > 0.01) transactions.push({ from: debtor.id, to: creditor.id, amount, groupId });
      debtor.balance += amount; creditor.balance -= amount;
      if (Math.abs(debtor.balance) < 0.01) d++;
      if (creditor.balance < 0.01) c++;
    }
    return transactions;
  },
  getAllSettlements: () => { let all = []; get().groups.forEach((g) => { all.push(...get().getSimplifiedSettlements(g.id)); }); return all; },
  settleDebt: (fromId, toId, groupId, amount) => {
    const exp = { id: generateId('set_'), groupId, description: 'Settlement', amount, paidBy: fromId, date: new Date().toISOString().split('T')[0], splitMethod: 'equal', splits: [{ personId: toId, share: amount }], settledBy: [], createdAt: new Date().toISOString() };
    const updated = [...get().groupExpenses, exp];
    storage.saveGroupExpenses(updated);
    set({ groupExpenses: updated });
  },

  // ── Export / Import ──
  exportData: () => ({ transactions: get().transactions, budgets: get().budgets, people: get().people, groups: get().groups, groupExpenses: get().groupExpenses, exportedAt: new Date().toISOString(), version: '3.0.0' }),
  importData: (data) => {
    if (data.transactions) storage.saveTransactions(data.transactions);
    if (data.budgets) storage.saveBudgets(data.budgets);
    if (data.people) storage.savePeople(data.people);
    if (data.groups) storage.saveGroups(data.groups);
    if (data.groupExpenses) storage.saveGroupExpenses(data.groupExpenses);
    set({ transactions: data.transactions || get().transactions, budgets: data.budgets || get().budgets, people: data.people || get().people, groups: data.groups || get().groups, groupExpenses: data.groupExpenses || get().groupExpenses });
  },

  // ── Full Reset ──
  resetAll: () => {
    storage.resetAll();
    set({ transactions: [], budgets: DEFAULT_BUDGETS, people: [{ id: 'self', name: 'You', initials: 'You', color: '#8b5cf6', createdAt: new Date().toISOString() }], groups: [], groupExpenses: [], pendingSmsTransactions: [], payeeMemory: {}, privacyMode: false, isLocked: true });
  },

  // ── SMS Auto-capture ──
  smsEnabled: storage.getSmsEnabled(),
  setSmsEnabled: (enabled) => { storage.saveSmsEnabled(enabled); set({ smsEnabled: enabled }); },

  // ── Biometrics ──
  biometricsEnabled: storage.getBiometricsEnabled(),
  isBiometricAvailable: false,
  setBiometricsEnabled: (enabled) => { storage.saveBiometricsEnabled(enabled); set({ biometricsEnabled: enabled }); },
  checkBiometricAvailability: async () => {
    try {
      const result = await NativeBiometric.isAvailable();
      console.log('[Store] Biometric availability:', result);
      set({ isBiometricAvailable: !!result.isAvailable });
    } catch (e) {
      console.warn('Biometrics not supported or plugin missing', e);
      set({ isBiometricAvailable: false });
    }
  },
  verifyBiometrics: async () => {
    try {
      console.log('[Store] Triggering biometric verification...');
      
      const result = await NativeBiometric.isAvailable();
      if (!result.isAvailable) {
        console.warn('Biometrics not available');
        return false;
      }

      await NativeBiometric.verifyIdentity({
        reason: "Unlock WealthPulse",
        title: "Biometric Login",
        subtitle: "Use fingerprint or face to unlock",
        description: "Please authenticate to continue",
      });
      
      console.log('[Store] Biometric verification successful');
      set({ isLocked: false });
      return true;
    } catch (e) {
      console.error('Biometric verification failed', e);
      return false;
    }
  },

  // ── Background Service (Foreground Service) ──
  bgServiceEnabled: true, // Initialized via initBgService
  initBgService: async () => {
    // Wait a bit for Capacitor bridge to be ready
    await new Promise(r => setTimeout(r, 500));
    const { nativeService } = await import('../services/nativeService');
    const enabled = await nativeService.getBackgroundServiceStatus();
    console.log('[Store] Initializing BG Service status:', enabled);
    set({ bgServiceEnabled: enabled });
  },
  toggleBgService: async () => {
    const { nativeService } = await import('../services/nativeService');
    const next = !get().bgServiceEnabled;
    if (next) {
      await nativeService.startBackgroundService();
    } else {
      await nativeService.stopBackgroundService();
    }
    set({ bgServiceEnabled: next });
  },

  // ── Pending SMS — identity-based dedup using stable txnId ──
  pendingSmsTransactions: storage.getPendingSms(),

  addPendingSms: (parsed) => {
    const existing = get().pendingSmsTransactions;
    if (existing.some((e) => e.id === parsed.id)) return false;
    const item = { ...parsed, detectedAt: new Date().toISOString() };
    const updated = [item, ...existing];
    storage.savePendingSms(updated);
    set({ pendingSmsTransactions: updated });
    return true;
  },

  dismissPendingSms: (id) => {
    const updated = get().pendingSmsTransactions.filter((s) => s.id !== id);
    storage.savePendingSms(updated);
    set({ pendingSmsTransactions: updated });
  },

  // Accept debit SMS as expense
  acceptPendingSmsAsExpense: (id, categoryOverride) => {
    const item = get().pendingSmsTransactions.find((s) => s.id === id);
    if (!item) return;
    const category = categoryOverride || item.category;
    get().rememberPayeeCategory(item.payee, category);
    get().addTransaction({ type: 'expense', amount: item.amount, category, date: item.date, description: item.payee, notes: 'via SMS' });
    get().dismissPendingSms(id);
  },

  // Accept credit SMS as income
  acceptPendingSmsAsIncome: (id, categoryOverride) => {
    const item = get().pendingSmsTransactions.find((s) => s.id === id);
    if (!item) return;
    const category = categoryOverride || 'other_inc';
    get().rememberPayeeCategory(item.payee, category);
    get().addTransaction({ type: 'income', amount: item.amount, category, date: item.date, description: item.payee, notes: 'via SMS' });
    get().dismissPendingSms(id);
  },

  // ── Payee Memory ──
  payeeMemory: storage.getPayeeMemory(),
  rememberPayeeCategory: (payee, categoryId) => {
    const key = (payee || '').toLowerCase().trim();
    if (!key) return;
    const updated = { ...get().payeeMemory, [key]: categoryId };
    storage.savePayeeMemory(updated);
    set({ payeeMemory: updated });
  },
  getCategoryForPayee: (payee) => {
    const key = (payee || '').toLowerCase().trim();
    return get().payeeMemory[key] || null;
  },
}));

applyTheme(useStore.getState().theme);
export default useStore;
