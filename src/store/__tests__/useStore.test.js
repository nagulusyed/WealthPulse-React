// src/store/__tests__/useStore.test.js
//
// Strategy:
//   • vi.stubGlobal('localStorage', ...) gives us a fresh in-memory store per test.
//   • The store module (and its dependencies) are re-imported AFTER the stub is
//     in place, so every storage.get*() call during module initialisation reads
//     from our fake localStorage.
//   • Capacitor plugins (NativeBiometric, nativeService) are mocked at the
//     module level so the import does not throw in a Node/jsdom environment.
//   • storage.js is mocked so that getBiometricsEnabled (missing in real file)
//     and migrateFromVanillaApp don't crash, and DOM-dependent applyTheme is
//     safely stubbed via window.matchMedia + document stubs.
//
import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Mock Capacitor and native plugins ────────────────────────────────────────
vi.mock('@capgo/capacitor-native-biometric', () => ({
  NativeBiometric: {
    isAvailable: vi.fn().mockResolvedValue({ isAvailable: false }),
    verifyIdentity: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../services/nativeService', () => ({
  nativeService: {
    getBackgroundServiceStatus: vi.fn().mockResolvedValue(false),
    startBackgroundService: vi.fn().mockResolvedValue(undefined),
    stopBackgroundService: vi.fn().mockResolvedValue(undefined),
  },
}));

// ── Mock the storage service ─────────────────────────────────────────────────
// storage.js delegates entirely to localStorage, but it also calls
// getBiometricsEnabled which is missing from the real file.  We provide a
// thin wrapper that delegates to whatever localStorage is currently stubbed.
vi.mock('../../services/storage', () => {
  function getJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  }
  function setJSON(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

  const storage = {
    getTransactions: () => getJSON('wp_transactions', []),
    saveTransactions: (v) => setJSON('wp_transactions', v),
    getBudgets: () => getJSON('wp_budgets', {}),
    saveBudgets: (v) => setJSON('wp_budgets', v),
    getPeople: () => getJSON('wp_people', [
      { id: 'self', name: 'You', initials: 'You', color: '#8b5cf6', createdAt: new Date().toISOString() },
    ]),
    savePeople: (v) => setJSON('wp_people', v),
    getGroups: () => getJSON('wp_groups', []),
    saveGroups: (v) => setJSON('wp_groups', v),
    getGroupExpenses: () => getJSON('wp_group_expenses', []),
    saveGroupExpenses: (v) => setJSON('wp_group_expenses', v),
    getPendingSms: () => getJSON('wp_pending_sms', []),
    savePendingSms: (v) => setJSON('wp_pending_sms', v),
    getPayeeMemory: () => getJSON('wp_payee_memory', {}),
    savePayeeMemory: (v) => setJSON('wp_payee_memory', v),
    getPrivacyMode: () => localStorage.getItem('wp_privacy_mode') === '1',
    savePrivacyMode: (v) => localStorage.setItem('wp_privacy_mode', v ? '1' : '0'),
    getPinHash: () => localStorage.getItem('wp_pin_hash'),
    savePinHash: (h) => localStorage.setItem('wp_pin_hash', h),
    removePinHash: () => localStorage.removeItem('wp_pin_hash'),
    hasPinSet: () => !!localStorage.getItem('wp_pin_hash'),
    getSecQIndex: () => localStorage.getItem('wp_sec_q_index'),
    getSecQHash: () => localStorage.getItem('wp_sec_q_hash'),
    saveSecQ: (i, h) => { localStorage.setItem('wp_sec_q_index', i); localStorage.setItem('wp_sec_q_hash', h); },
    removeSecQ: () => { localStorage.removeItem('wp_sec_q_index'); localStorage.removeItem('wp_sec_q_hash'); },
    getSmsEnabled: () => localStorage.getItem('wp_sms_enabled') !== '0',
    saveSmsEnabled: (v) => localStorage.setItem('wp_sms_enabled', v ? '1' : '0'),
    getBiometricsEnabled: () => localStorage.getItem('wp_biometrics_enabled') === '1',
    saveBiometricsEnabled: (v) => localStorage.setItem('wp_biometrics_enabled', v ? '1' : '0'),
    getBudgetAlerts: () => localStorage.getItem('wp_budget_alerts') !== '0',
    saveBudgetAlerts: (v) => localStorage.setItem('wp_budget_alerts', v ? '1' : '0'),
    getSettlementReminders: () => localStorage.getItem('wp_settle_reminders') !== '0',
    saveSettlementReminders: (v) => localStorage.setItem('wp_settle_reminders', v ? '1' : '0'),
    isMigrated: () => localStorage.getItem('wp_migration_v3') === 'done',
    markMigrated: () => localStorage.setItem('wp_migration_v3', 'done'),
    resetAll: () => {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('wp_'))
        .forEach((k) => localStorage.removeItem(k));
    },
  };

  return { storage, migrateFromVanillaApp: () => null };
});

// ── DOM stubs needed by applyTheme (called at module load) ───────────────────
// jsdom provides window.matchMedia as undefined; stub it once globally.
vi.stubGlobal('matchMedia', (query) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

// applyTheme also calls document.querySelector('meta[name="theme-color"]')
// jsdom supports this but returns null; that's fine — the code guards with `if (meta)`.

// ── In-memory localStorage stub factory ──────────────────────────────────────
function makeLocalStorage() {
  let store = {};
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (i) => Object.keys(store)[i] ?? null,
    // expose raw store for inspection
    _store: store,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build a minimal group expense object.
 * `splits` is an array of { personId, share }.
 */
function makeExpense(overrides = {}) {
  return {
    id: `e_${Math.random().toString(36).slice(2)}`,
    groupId: 'g_test',
    description: 'Test expense',
    amount: 100,
    paidBy: 'self',
    date: '2026-05-07',
    splitMethod: 'equal',
    splits: [
      { personId: 'self', share: 50 },
      { personId: 'p_alice', share: 50 },
    ],
    settledBy: [],
    isSettlement: false,
    category: 'other_exp',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Build a minimal group object.
 */
function makeGroup(overrides = {}) {
  return {
    id: 'g_test',
    name: 'Test Group',
    memberIds: ['self', 'p_alice'],
    createdAt: new Date().toISOString(),
    isActive: true,
    ...overrides,
  };
}

// ── Test suite ────────────────────────────────────────────────────────────────

describe('useStore', () => {
  let useStore;

  beforeEach(async () => {
    // Provide a fresh localStorage before the store module is (re-)loaded.
    vi.stubGlobal('localStorage', makeLocalStorage());

    // Reset module registry so the store re-initialises from the empty localStorage.
    vi.resetModules();

    // Dynamically import AFTER stubs are applied.
    const mod = await import('../useStore');
    useStore = mod.default;
  });

  // ── getPersonBalanceInGroup ──────────────────────────────────────────────

  describe('getPersonBalanceInGroup', () => {
    it('basic: person pays ₹100, split equally 2-way → balance = +50', () => {
      const group = makeGroup();
      const expense = makeExpense(); // paidBy: 'self', share: 50

      useStore.setState({
        groups: [group],
        groupExpenses: [expense],
      });

      const { getPersonBalanceInGroup } = useStore.getState();
      // self paid 100, owes 50 → net = +50
      expect(getPersonBalanceInGroup('self', 'g_test')).toBeCloseTo(50, 5);
      // alice paid nothing, owes 50 → net = -50
      expect(getPersonBalanceInGroup('p_alice', 'g_test')).toBeCloseTo(-50, 5);
    });

    it('after settleDebt: debtor balance increases, creditor balance decreases', () => {
      const group = makeGroup();
      const expense = makeExpense();

      useStore.setState({
        groups: [group],
        groupExpenses: [expense],
        transactions: [],
      });

      const state = useStore.getState();
      // alice owes self ₹50 — alice settles
      state.settleDebt('p_alice', 'self', 'g_test', 50);

      const { getPersonBalanceInGroup } = useStore.getState();
      // After settlement: alice sent 50 to self
      //   alice: was -50, settlement adds +50 → 0
      expect(getPersonBalanceInGroup('p_alice', 'g_test')).toBeCloseTo(0, 5);
      //   self: was +50, settlement subtracts 50 → 0
      expect(getPersonBalanceInGroup('self', 'g_test')).toBeCloseTo(0, 5);
    });
  });

  // ── settleDebt ───────────────────────────────────────────────────────────

  describe('settleDebt', () => {
    it('creates a settlement record with amount:0, isSettlement:true, correct settledBy', () => {
      const group = makeGroup();
      const expense = makeExpense();

      useStore.setState({ groups: [group], groupExpenses: [expense], transactions: [] });

      useStore.getState().settleDebt('p_alice', 'self', 'g_test', 50);

      const { groupExpenses } = useStore.getState();
      const settlement = groupExpenses.find((e) => e.isSettlement);

      expect(settlement).toBeDefined();
      expect(settlement.amount).toBe(0);
      expect(settlement.isSettlement).toBe(true);
      expect(settlement.settledBy).toHaveLength(1);
      expect(settlement.settledBy[0]).toMatchObject({
        from: 'p_alice',
        to: 'self',
        amount: 50,
      });
    });
  });

  // ── getSimplifiedSettlements ─────────────────────────────────────────────

  describe('getSimplifiedSettlements', () => {
    it('3-person group produces correct debtor→creditor pairs', () => {
      // alice paid 90 for all 3 (30 each).
      // bob paid 0 → owes 30
      // self paid 0 → owes 30
      // alice is owed 60 total
      const group = makeGroup({
        id: 'g_3',
        memberIds: ['self', 'p_alice', 'p_bob'],
      });

      const expense = makeExpense({
        id: 'e_1',
        groupId: 'g_3',
        amount: 90,
        paidBy: 'p_alice',
        splits: [
          { personId: 'self', share: 30 },
          { personId: 'p_alice', share: 30 },
          { personId: 'p_bob', share: 30 },
        ],
      });

      useStore.setState({ groups: [group], groupExpenses: [expense], transactions: [] });

      const settlements = useStore.getState().getSimplifiedSettlements('g_3');

      // Both self and p_bob owe p_alice
      expect(settlements.length).toBeGreaterThanOrEqual(2);
      const toAlice = settlements.filter((s) => s.to === 'p_alice');
      expect(toAlice.length).toBe(2);

      const fromSelf = toAlice.find((s) => s.from === 'self');
      expect(fromSelf?.amount).toBeCloseTo(30, 5);

      const fromBob = toAlice.find((s) => s.from === 'p_bob');
      expect(fromBob?.amount).toBeCloseTo(30, 5);
    });
  });

  // ── importData ───────────────────────────────────────────────────────────

  describe('importData', () => {
    it('valid data imports correctly into the store', () => {
      const data = {
        transactions: [{ id: 'txn1', type: 'expense', amount: 200, category: 'food', date: '2026-05-01', description: 'Lunch' }],
        people: [{ id: 'self', name: 'You', initials: 'You', color: '#8b5cf6', createdAt: new Date().toISOString() }],
        groups: [],
        groupExpenses: [],
        budgets: { food: 5000 },
      };

      useStore.setState({ transactions: [], people: [], groups: [], groupExpenses: {}, budgets: {} });

      const result = useStore.getState().importData(data);
      expect(result).toBe(true);

      const state = useStore.getState();
      expect(state.transactions).toHaveLength(1);
      expect(state.transactions[0].id).toBe('txn1');
      expect(state.budgets.food).toBe(5000);
    });

    it('rolls back storage when a save throws mid-import', async () => {
      // Set up original state in the store
      const originalTxns = [{ id: 'orig', type: 'income', amount: 1000, date: '2026-04-01', description: 'Salary', category: 'salary' }];
      useStore.setState({ transactions: originalTxns, groups: [], groupExpenses: [], people: [], budgets: {} });

      // Persist original state to our fake localStorage manually so the
      // rollback snapshot contains something meaningful.
      localStorage.setItem('wp_transactions', JSON.stringify(originalTxns));
      localStorage.setItem('wp_groups', JSON.stringify([]));
      localStorage.setItem('wp_group_expenses', JSON.stringify([]));
      localStorage.setItem('wp_people', JSON.stringify([]));
      localStorage.setItem('wp_budgets', JSON.stringify({}));

      // Make saveGroups throw to simulate a quota error mid-import.
      const originalSetItem = localStorage.setItem.bind(localStorage);
      let callCount = 0;
      localStorage.setItem = vi.fn((key, value) => {
        callCount++;
        // Fail on the second write (saveGroups is the second call in importData)
        if (callCount === 2) throw new DOMException('QuotaExceededError');
        originalSetItem(key, value);
      });

      const badData = {
        people: [{ id: 'new_person', name: 'New', initials: 'NE', color: '#fff', createdAt: new Date().toISOString() }],
        groups: [{ id: 'g_new', name: 'New Group', memberIds: ['self'], createdAt: new Date().toISOString(), isActive: true }],
        transactions: [{ id: 'new_txn', type: 'expense', amount: 500, date: '2026-05-01', description: 'Test', category: 'food' }],
        groupExpenses: [],
        budgets: { food: 9999 },
      };

      expect(() => useStore.getState().importData(badData)).toThrow();

      // After rollback, original transactions should be restored in localStorage
      const restoredRaw = localStorage.getItem('wp_transactions');
      // Restore original setItem so JSON.parse works cleanly
      localStorage.setItem = originalSetItem;
      const restored = JSON.parse(restoredRaw);
      expect(restored).toEqual(originalTxns);
    });
  });

  // ── addGroupExpense (paidBy === 'self') ──────────────────────────────────

  describe('addGroupExpense', () => {
    it('creates a personal transaction when paidBy === "self"', () => {
      const group = makeGroup();
      useStore.setState({ groups: [group], groupExpenses: [], transactions: [] });

      const expenseData = {
        groupId: 'g_test',
        description: 'Dinner',
        amount: 300,
        paidBy: 'self',
        date: '2026-05-07',
        splitMethod: 'equal',
        splits: [{ personId: 'self', share: 150 }, { personId: 'p_alice', share: 150 }],
        settledBy: [],
        category: 'food',
      };

      const added = useStore.getState().addGroupExpense(expenseData);

      const { transactions } = useStore.getState();
      const linkedTxn = transactions.find((t) => t.id === `group_exp_${added.id}`);

      expect(linkedTxn).toBeDefined();
      expect(linkedTxn.amount).toBe(300);
      expect(linkedTxn.type).toBe('expense');
      expect(linkedTxn.description).toContain('Test Group');
      expect(linkedTxn.notes).toBe('Splitwise sync');
    });

    it('does NOT create a personal transaction when paidBy !== "self"', () => {
      const group = makeGroup();
      useStore.setState({ groups: [group], groupExpenses: [], transactions: [] });

      const expenseData = {
        groupId: 'g_test',
        description: 'Lunch',
        amount: 200,
        paidBy: 'p_alice',
        date: '2026-05-07',
        splitMethod: 'equal',
        splits: [{ personId: 'self', share: 100 }, { personId: 'p_alice', share: 100 }],
        settledBy: [],
        category: 'food',
      };

      useStore.getState().addGroupExpense(expenseData);

      const { transactions } = useStore.getState();
      expect(transactions).toHaveLength(0);
    });
  });

  // ── updateGroupExpense ───────────────────────────────────────────────────

  describe('updateGroupExpense', () => {
    it('updates the linked personal transaction when paidBy stays "self"', () => {
      const group = makeGroup();
      useStore.setState({ groups: [group], groupExpenses: [], transactions: [] });

      // Add an expense first
      const exp = useStore.getState().addGroupExpense({
        groupId: 'g_test',
        description: 'Dinner',
        amount: 300,
        paidBy: 'self',
        date: '2026-05-07',
        splitMethod: 'equal',
        splits: [{ personId: 'self', share: 150 }, { personId: 'p_alice', share: 150 }],
        settledBy: [],
        category: 'food',
      });

      // Update amount + description
      useStore.getState().updateGroupExpense(exp.id, {
        ...exp,
        amount: 600,
        description: 'Dinner Updated',
      });

      const { transactions } = useStore.getState();
      const linkedTxn = transactions.find((t) => t.id === `group_exp_${exp.id}`);

      expect(linkedTxn).toBeDefined();
      expect(linkedTxn.amount).toBe(600);
      expect(linkedTxn.description).toContain('Dinner Updated');
    });

    it('removes the linked personal transaction when paidBy changes from "self" to someone else', () => {
      const group = makeGroup();
      useStore.setState({ groups: [group], groupExpenses: [], transactions: [] });

      const exp = useStore.getState().addGroupExpense({
        groupId: 'g_test',
        description: 'Trip',
        amount: 500,
        paidBy: 'self',
        date: '2026-05-07',
        splitMethod: 'equal',
        splits: [{ personId: 'self', share: 250 }, { personId: 'p_alice', share: 250 }],
        settledBy: [],
        category: 'transport',
      });

      // Confirm linked txn exists
      expect(useStore.getState().transactions.find((t) => t.id === `group_exp_${exp.id}`)).toBeDefined();

      // Change paidBy to p_alice
      useStore.getState().updateGroupExpense(exp.id, {
        ...exp,
        paidBy: 'p_alice',
      });

      const { transactions } = useStore.getState();
      expect(transactions.find((t) => t.id === `group_exp_${exp.id}`)).toBeUndefined();
    });
  });

  // ── deleteGroupExpense ───────────────────────────────────────────────────

  describe('deleteGroupExpense', () => {
    it('removes the linked personal transaction on delete', () => {
      const group = makeGroup();
      useStore.setState({ groups: [group], groupExpenses: [], transactions: [] });

      const exp = useStore.getState().addGroupExpense({
        groupId: 'g_test',
        description: 'Movie',
        amount: 120,
        paidBy: 'self',
        date: '2026-05-07',
        splitMethod: 'equal',
        splits: [{ personId: 'self', share: 60 }, { personId: 'p_alice', share: 60 }],
        settledBy: [],
        category: 'entertainment',
      });

      // Sanity check: linked txn exists
      expect(useStore.getState().transactions.find((t) => t.id === `group_exp_${exp.id}`)).toBeDefined();

      useStore.getState().deleteGroupExpense(exp.id);

      expect(useStore.getState().groupExpenses.find((e) => e.id === exp.id)).toBeUndefined();
      expect(useStore.getState().transactions.find((t) => t.id === `group_exp_${exp.id}`)).toBeUndefined();
    });

    it('does not throw when deleting an expense that has no linked transaction', () => {
      const group = makeGroup();
      const expense = makeExpense({ paidBy: 'p_alice' }); // paidBy !== 'self', no linked txn

      useStore.setState({ groups: [group], groupExpenses: [expense], transactions: [] });

      expect(() => useStore.getState().deleteGroupExpense(expense.id)).not.toThrow();
      expect(useStore.getState().groupExpenses).toHaveLength(0);
    });
  });
});
