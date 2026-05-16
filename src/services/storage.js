// ── Storage Service ──
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
  recurring: 'wp_recurring_txns',
};

function getJSON(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
}
function setJSON(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

export const storage = {
  getTransactions: () => getJSON(KEYS.transactions, []),
  saveTransactions: (txns) => setJSON(KEYS.transactions, txns),
  getBudgets: () => getJSON(KEYS.budgets, {}),
  saveBudgets: (budgets) => setJSON(KEYS.budgets, budgets),
  getPinHash: () => localStorage.getItem(KEYS.pinHash),
  savePinHash: (hash) => localStorage.setItem(KEYS.pinHash, hash),
  removePinHash: () => localStorage.removeItem(KEYS.pinHash),
  hasPinSet: () => !!localStorage.getItem(KEYS.pinHash),
  getSecQIndex: () => localStorage.getItem(KEYS.secQIndex),
  getSecQHash: () => localStorage.getItem(KEYS.secQHash),
  saveSecQ: (index, hash) => { localStorage.setItem(KEYS.secQIndex, index); localStorage.setItem(KEYS.secQHash, hash); },
  removeSecQ: () => { localStorage.removeItem(KEYS.secQIndex); localStorage.removeItem(KEYS.secQHash); },
  getPeople: () => getJSON(KEYS.people, [{ id: 'self', name: 'You', initials: 'You', color: '#8b5cf6', createdAt: new Date().toISOString() }]),
  savePeople: (people) => setJSON(KEYS.people, people),
  getGroups: () => getJSON(KEYS.groups, []),
  saveGroups: (groups) => setJSON(KEYS.groups, groups),
  getGroupExpenses: () => getJSON(KEYS.groupExpenses, []),
  saveGroupExpenses: (expenses) => setJSON(KEYS.groupExpenses, expenses),
  getPrivacyMode: () => localStorage.getItem(KEYS.privacyMode) === '1',
  savePrivacyMode: (isPrivate) => localStorage.setItem(KEYS.privacyMode, isPrivate ? '1' : '0'),
  isMigrated: () => localStorage.getItem(KEYS.migration) === 'done',
  markMigrated: () => localStorage.setItem(KEYS.migration, 'done'),
  getPendingSms: () => getJSON(KEYS.pendingSms, []),
  savePendingSms: (items) => setJSON(KEYS.pendingSms, items),
  getPayeeMemory: () => getJSON(KEYS.payeeMemory, {}),
  savePayeeMemory: (memory) => setJSON(KEYS.payeeMemory, memory),
  getSmsEnabled: () => localStorage.getItem(KEYS.smsEnabled) !== '0',
  saveSmsEnabled: (enabled) => localStorage.setItem(KEYS.smsEnabled, enabled ? '1' : '0'),
  getBiometricsEnabled: () => localStorage.getItem(KEYS.biometricsEnabled) === '1',
  saveBiometricsEnabled: (enabled) => localStorage.setItem(KEYS.biometricsEnabled, enabled ? '1' : '0'),
  // Recurring transactions (Fix #11)
  getRecurring: () => getJSON(KEYS.recurring, []),
  saveRecurring: (items) => setJSON(KEYS.recurring, items),
  resetAll: () => { Object.keys(localStorage).filter((k) => k.startsWith('wp_')).forEach((k) => localStorage.removeItem(k)); },
};

export function migrateFromVanillaApp() {
  if (storage.isMigrated()) return null;
  const data = { transactions: storage.getTransactions(), budgets: storage.getBudgets(), people: storage.getPeople(), groups: storage.getGroups(), groupExpenses: storage.getGroupExpenses() };
  storage.markMigrated();
  return data;
}
