// src/services/alertsService.js
// ─────────────────────────────────────────────────────────────
// Bridges JS state → Android push notifications via AlertsPlugin.
//
// Called from:
//   • useAlerts hook (runs on mount + whenever key state changes)
//   • addPendingSms in useStore (immediate sync on new SMS)
//
// All calls are no-ops on web (Capacitor not available).
// ─────────────────────────────────────────────────────────────

import { Capacitor } from '@capacitor/core';
import { getCategory } from './categories';

// Lazy-load the plugin — only resolves on Android
let _plugin = null;
function getPlugin() {
  if (_plugin) return _plugin;
  if (!Capacitor.isNativePlatform()) return null;
  try {
    _plugin = Capacitor.Plugins.AlertsPlugin;
    return _plugin;
  } catch {
    return null;
  }
}

// ── 1. Sync pending SMS badge count ───────────────────────────
export async function syncPendingCount(count) {
  const plugin = getPlugin();
  if (!plugin) return;
  try {
    await plugin.syncPendingCount({ count });
  } catch (e) {
    console.warn('[Alerts] syncPendingCount failed:', e);
  }
}

// ── 2. Check budgets and fire alerts if thresholds breached ───
// budgets: { catId: limit }
// transactions: current month's expense transactions
export async function checkBudgetAlerts(budgets, transactions) {
  const plugin = getPlugin();
  if (!plugin) return;

  // Tally spending per category
  const spent = {};
  transactions
    .filter((t) => t.type === 'expense' && !t.isSettlement)
    .forEach((t) => {
      spent[t.category] = (spent[t.category] || 0) + t.amount;
    });

  const payload = [];
  let index = 0;

  Object.entries(budgets).forEach(([catId, limit]) => {
    if (!limit || limit <= 0) return;
    const catSpent = Math.round(spent[catId] || 0);
    const pct = Math.round((catSpent / limit) * 100);

    // Only care about categories that are at least 75% through
    if (pct < 75) return;

    const cat = getCategory('expense', catId);
    payload.push({
      name: `${cat.emoji} ${cat.name}`,
      pct,
      spent: catSpent,
      limit: Math.round(limit),
      index,
    });
    index++;
  });

  if (payload.length === 0) return;

  try {
    await plugin.checkBudgets({ budgets: payload });
  } catch (e) {
    console.warn('[Alerts] checkBudgets failed:', e);
  }
}

// ── 3. Check settlements and fire reminders ────────────────────
// settlements: array of { from, to, amount, groupId }
// people: array of { id, name }
// groups: array of { id, groupExpenses }
// groupExpenses: all group expenses
export async function checkSettlementAlerts(allSettlements, people, groupExpenses) {
  const plugin = getPlugin();
  if (!plugin) return;

  if (!allSettlements || allSettlements.length === 0) return;

  // Work out how old each settlement is by looking at the earliest unpaid expense
  // in that group between those two people.
  const getOldestExpenseDate = (from, to, groupId) => {
    const relevant = groupExpenses.filter(
      (e) => e.groupId === groupId &&
        e.paidBy === to &&
        e.splits?.some((s) => s.personId === from) &&
        !(e.settledBy || []).some((s) => s.from === from && s.to === to)
    );
    if (relevant.length === 0) return new Date();
    const oldest = relevant.reduce((a, b) =>
      new Date(a.createdAt) < new Date(b.createdAt) ? a : b
    );
    return new Date(oldest.createdAt);
  };

  const payload = [];
  let index = 0;

  allSettlements.forEach((s) => {
    // Only show settlements involving "self"
    if (s.from !== 'self' && s.to !== 'self') return;

    const youAreOwed = s.to === 'self';
    const otherPersonId = youAreOwed ? s.from : s.to;
    const person = people.find((p) => p.id === otherPersonId);
    if (!person || person.id === 'self') return;

    const oldestDate = getOldestExpenseDate(s.from, s.to, s.groupId);
    const daysOld = Math.floor((Date.now() - oldestDate.getTime()) / 86400000);

    payload.push({
      name: person.name,
      amount: Math.round(s.amount),
      daysOld,
      youAreOwed,
      index,
    });
    index++;
  });

  if (payload.length === 0) return;

  try {
    await plugin.checkSettlements({ settlements: payload });
  } catch (e) {
    console.warn('[Alerts] checkSettlements failed:', e);
  }
}
