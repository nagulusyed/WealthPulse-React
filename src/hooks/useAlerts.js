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
  const budgetAlertsEnabled    = useStore((s) => s.budgetAlertsEnabled);
  const settlementAlertsEnabled = useStore((s) => s.settlementAlertsEnabled);

  const budgetTimer = useRef(null);
  const settlTimer  = useRef(null);

  // ── Pending SMS badge — immediate, no debounce ──
  useEffect(() => {
    if (!alertsEnabled) {
      syncPendingCount(0);
      return;
    }
    syncPendingCount(pendingSmsTransactions.length);
  }, [pendingSmsTransactions.length, alertsEnabled]);

  // ── Budget alerts — debounced 2s, respects per-type toggle ──
  useEffect(() => {
    if (!alertsEnabled || !budgetAlertsEnabled) return;
    clearTimeout(budgetTimer.current);
    budgetTimer.current = setTimeout(() => {
      checkBudgetAlerts(budgets, transactions);
    }, 2000);
    return () => clearTimeout(budgetTimer.current);
  }, [budgets, transactions, alertsEnabled, budgetAlertsEnabled]);

  // ── Settlement reminders — debounced 2s, respects per-type toggle ──
  useEffect(() => {
    if (!alertsEnabled || !settlementAlertsEnabled) return;
    clearTimeout(settlTimer.current);
    settlTimer.current = setTimeout(() => {
      checkSettlementAlerts(allSettlements, people, groupExpenses);
    }, 2000);
    return () => clearTimeout(settlTimer.current);
  }, [allSettlements, people, groupExpenses, alertsEnabled, settlementAlertsEnabled]);
}
