// src/hooks/useAlerts.js
// ─────────────────────────────────────────────────────────────
// Runs alert checks whenever relevant store state changes.
// Mount this once in App.jsx — it watches:
//   • pendingSmsTransactions → syncs badge count
//   • budgets + monthly transactions → checks budget thresholds
//   • settlements + people → checks settlement reminders
//
// All checks are debounced 2 seconds to avoid hammering on rapid
// state changes (e.g. bulk import).
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';
import useStore from '../store/useStore';
import {
  syncPendingCount,
  checkBudgetAlerts,
  checkSettlementAlerts,
} from '../services/alertsService';

export function useAlerts() {
  const pendingSmsTransactions = useStore((s) => s.pendingSmsTransactions);
  const budgets                = useStore((s) => s.budgets);
  const transactions           = useStore((s) => s.getMonthlyTransactions());
  const allSettlements         = useStore((s) => s.getAllSettlements());
  const people                 = useStore((s) => s.people);
  const groupExpenses          = useStore((s) => s.groupExpenses);
  const alertsEnabled          = useStore((s) => s.alertsEnabled);

  const budgetTimer    = useRef(null);
  const settlTimer     = useRef(null);

  // ── Pending SMS — immediate, no debounce ──────────────────
  useEffect(() => {
    if (!alertsEnabled) {
      syncPendingCount(0); // clear badge
      return;
    }
    syncPendingCount(pendingSmsTransactions.length);
  }, [pendingSmsTransactions.length, alertsEnabled]);

  // ── Budget alerts — debounced 2s ──────────────────────────
  useEffect(() => {
    if (!alertsEnabled) return;
    clearTimeout(budgetTimer.current);
    budgetTimer.current = setTimeout(() => {
      checkBudgetAlerts(budgets, transactions);
    }, 2000);
    return () => clearTimeout(budgetTimer.current);
  }, [budgets, transactions, alertsEnabled]);

  // ── Settlement reminders — debounced 2s ───────────────────
  useEffect(() => {
    if (!alertsEnabled) return;
    clearTimeout(settlTimer.current);
    settlTimer.current = setTimeout(() => {
      checkSettlementAlerts(allSettlements, people, groupExpenses);
    }, 2000);
    return () => clearTimeout(settlTimer.current);
  }, [allSettlements, people, groupExpenses, alertsEnabled]);
}
