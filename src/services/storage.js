// ── Storage Service ──
// Abstraction over localStorage. Swap this file for IndexedDB/Supabase later.

const KEYS = {
  transactions: 'wp_transactions',
  budgets: 'wp_budgets',
  pinHash: 'wp_pin_hash',
  secQIndex: 'wp_sec_q_index',
  secQHash: 'wp_sec_q_hash',
  people: 'wp_people',
  groups: 'wp_groups',
  groupExpenses: 'wp_group_expenses',
  privacyMode: 'wp_privacy_mode',
  migration: 'wp_migration_v3',
  pendingSms: 'wp_pending_sms',
  payeeMemory: 'wp_payee_memory',
  smsEnabled: 'wp_sms_enabled',
  biometricsEnabled: 'wp_biometrics_enabled',
  // Onboarding / first-run
  checklistDismissed: 'wp_checklist_dismissed',
  smsPromptShown: 'wp_sms_prompt_shown',
  sessionCount: 'wp_session_count',
  firstExpenseAdded: 'wp_first_expense_added',
};

function getJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export const storage = {
  // Transactions
  getTransactions: () => getJSON(KEYS.transactions, []),
  saveTransactions: (txns) => setJSON(KEYS.transactions, txns),

  // Budgets
  getBudgets: () => getJSON(KEYS.budgets, {}),
  saveBudgets: (budgets) => setJSON(KEYS.budgets, budgets),

  // PIN
  getPinHash: () => localStorage.getItem(KEYS.pinHash),
  savePinHash: (hash) => localStorage.setItem(KEYS.pinHash, hash),
  removePinHash: () => localStorage.removeItem(KEYS.pinHash),
  hasPinSet: () => !!localStorage.getItem(KEYS.pinHash),

  // Security Question
  getSecQIndex: () => localStorage.getItem(KEYS.secQIndex),
  getSecQHash: () => localStorage.getItem(KEYS.secQHash),
  saveSecQ: (index, hash) => {
    localStorage.setItem(KEYS.secQIndex, index);
    localStorage.setItem(KEYS.secQHash, hash);
  },
  removeSecQ: () => {
    localStorage.removeItem(KEYS.secQIndex);
    localStorage.removeItem(KEYS.secQHash);
  },

  // People
  getPeople: () => getJSON(KEYS.people, [
    { id: 'self', name: 'You', initials: 'You', color: '#8b5cf6', createdAt: new Date().toISOString() },
  ]),
  savePeople: (people) => setJSON(KEYS.people, people),

  // Groups
  getGroups: () => getJSON(KEYS.groups, []),
  saveGroups: (groups) => setJSON(KEYS.groups, groups),

  // Group Expenses
  getGroupExpenses: () => getJSON(KEYS.groupExpenses, []),
  saveGroupExpenses: (expenses) => setJSON(KEYS.groupExpenses, expenses),

  // Privacy
  getPrivacyMode: () => localStorage.getItem(KEYS.privacyMode) === '1',
  savePrivacyMode: (isPrivate) => localStorage.setItem(KEYS.privacyMode, isPrivate ? '1' : '0'),

  // Migration flag
  isMigrated: () => localStorage.getItem(KEYS.migration) === 'done',
  markMigrated: () => localStorage.setItem(KEYS.migration, 'done'),

  // ── Pending SMS Transactions ──
  getPendingSms: () => getJSON(KEYS.pendingSms, []),
  savePendingSms: (items) => setJSON(KEYS.pendingSms, items),

  // ── Payee Memory (payee name → category id) ──
  getPayeeMemory: () => getJSON(KEYS.payeeMemory, {}),
  savePayeeMemory: (memory) => setJSON(KEYS.payeeMemory, memory),

  // ── SMS Auto-capture toggle ──
  getSmsEnabled: () => localStorage.getItem(KEYS.smsEnabled) !== '0', // default ON
  saveSmsEnabled: (enabled) => localStorage.setItem(KEYS.smsEnabled, enabled ? '1' : '0'),

  // ── Biometrics ──
  getBiometricsEnabled: () => localStorage.getItem(KEYS.biometricsEnabled) === '1', // default OFF
  saveBiometricsEnabled: (enabled) => localStorage.setItem(KEYS.biometricsEnabled, enabled ? '1' : '0'),

  // ── Onboarding / First-run ──
  isChecklistDismissed: () => localStorage.getItem(KEYS.checklistDismissed) === '1',
  dismissChecklist: () => localStorage.setItem(KEYS.checklistDismissed, '1'),

  isSmsPromptShown: () => localStorage.getItem(KEYS.smsPromptShown) === '1',
  markSmsPromptShown: () => localStorage.setItem(KEYS.smsPromptShown, '1'),

  getSessionCount: () => parseInt(localStorage.getItem(KEYS.sessionCount) || '0', 10),
  incrementSessionCount: () => {
    const count = parseInt(localStorage.getItem(KEYS.sessionCount) || '0', 10);
    localStorage.setItem(KEYS.sessionCount, String(count + 1));
    return count + 1;
  },

  isFirstExpenseAdded: () => localStorage.getItem(KEYS.firstExpenseAdded) === '1',
  markFirstExpenseAdded: () => localStorage.setItem(KEYS.firstExpenseAdded, '1'),

  // Full reset
  resetAll: () => {
    Object.keys(localStorage)
      .filter((key) => key.startsWith('wp_'))
      .forEach((key) => localStorage.removeItem(key));
  },
};

/**
 * Migrate data from vanilla app to React store format.
 * Runs once on first launch — idempotent.
 */
export function migrateFromVanillaApp() {
  if (storage.isMigrated()) return null;

  const data = {
    transactions: storage.getTransactions(),
    budgets: storage.getBudgets(),
    people: storage.getPeople(),
    groups: storage.getGroups(),
    groupExpenses: storage.getGroupExpenses(),
  };

  storage.markMigrated();
  return data;
}
