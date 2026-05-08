// ── Smart Insights Engine ──
// Runs lazily (called only when Insights tab is active).
// Reads from Zustand store, computes all four insight pillars,
// returns structured data for the UI to render.

import { useMemo } from 'react';
import useStore from '../store/useStore';
import { getCategory } from '../services/categories';
import { getMonthKey } from '../utils/formatters';

// ─────────────────────────────────────────────────────────────
// Helper: normalize a description/payee into a clean vendor key
// Strips common bank SMS noise so "ZOMATO INDIA PVT LTD" → "zomato"
// ─────────────────────────────────────────────────────────────
const STRIP_WORDS = [
  'pvt', 'ltd', 'private', 'limited', 'india', 'payment',
  'pay', 'upi', 'imps', 'neft', 'rtgs', 'txn', 'pos',
  'debit', 'credit', 'transfer', 'bank', 'fin', 'financial',
  'services', 'technologies', 'tech', 'solutions', 'online',
];

export function normalizeVendor(raw) {
  if (!raw) return 'unknown';
  let s = raw.toLowerCase().trim();
  // Remove special chars except spaces
  s = s.replace(/[^a-z0-9 ]/g, ' ');
  // Remove trailing noise words
  const parts = s.split(/\s+/).filter((w) => w.length > 1 && !STRIP_WORDS.includes(w));
  return parts.slice(0, 2).join(' ').trim() || s.trim();
}

// ─────────────────────────────────────────────────────────────
// 1. Payee / Vendor Recognition
// Groups all expense transactions by normalized description
// Returns top vendors by total spend
// ─────────────────────────────────────────────────────────────
function computeVendorInsights(transactions, totalIncome) {
  const isSettlement = (t) => t.isSettlement || (t.notes && t.notes.startsWith('Payment via'));
  const expenses = transactions.filter((t) => t.type === 'expense' && !isSettlement(t));

  const map = {}; // vendorKey → { displayName, total, count, category }
  expenses.forEach((t) => {
    const key = normalizeVendor(t.description);
    if (!map[key]) {
      map[key] = { displayName: t.description || key, total: 0, count: 0, category: t.category };
    }
    map[key].total += t.amount;
    map[key].count += 1;
    // keep the most recent description as display name
  });

  const sorted = Object.entries(map)
    .map(([key, v]) => ({ key, ...v }))
    .filter((v) => v.count >= 2 || v.total >= 500) // only meaningful vendors
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return sorted.map((v) => ({
    ...v,
    pctOfIncome: totalIncome > 0 ? Math.round((v.total / totalIncome) * 100) : null,
    cat: getCategory('expense', v.category),
  }));
}

// ─────────────────────────────────────────────────────────────
// 2. Burn Rate Forecast
// Uses current month spend-to-date + day of month
// Returns daily burn, projected month total, safe daily target
// ─────────────────────────────────────────────────────────────
function computeBurnRate(transactions, selectedMonth, budgets) {
  const now = new Date();
  const isCurrentMonth =
    now.getFullYear() === selectedMonth.getFullYear() &&
    now.getMonth() === selectedMonth.getMonth();

  if (!isCurrentMonth) return null;

  const isSettlement = (t) => t.isSettlement || (t.notes && t.notes.startsWith('Payment via'));
  const expenses = transactions.filter((t) => t.type === 'expense' && !isSettlement(t));
  const spentSoFar = expenses.reduce((s, t) => s + t.amount, 0);

  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - dayOfMonth;

  if (dayOfMonth < 3) return null; // too early, not meaningful

  const dailyBurn = spentSoFar / dayOfMonth;
  const projectedTotal = dailyBurn * daysInMonth;

  // Total budget = sum of all category budgets
  const totalBudget = Object.values(budgets).reduce((s, v) => s + v, 0);
  const budgetLeft = totalBudget - spentSoFar;
  const safeDaily = daysLeft > 0 ? budgetLeft / daysLeft : 0;

  const daysUntilBudgetExhausted =
    dailyBurn > 0 && budgetLeft > 0
      ? Math.floor(budgetLeft / dailyBurn)
      : null;

  const exhaustDate =
    daysUntilBudgetExhausted !== null
      ? new Date(now.getTime() + daysUntilBudgetExhausted * 86400000)
      : null;

  const isOnTrack = projectedTotal <= totalBudget;

  return {
    spentSoFar,
    dailyBurn: Math.round(dailyBurn),
    projectedTotal: Math.round(projectedTotal),
    totalBudget,
    budgetLeft: Math.round(budgetLeft),
    safeDaily: Math.round(safeDaily),
    daysLeft,
    dayOfMonth,
    daysInMonth,
    exhaustDate,
    isOnTrack,
    overageAmount: projectedTotal > totalBudget ? Math.round(projectedTotal - totalBudget) : 0,
  };
}

// ─────────────────────────────────────────────────────────────
// 3. Anomaly Detection
// Compares current month category spend vs. 3-month rolling avg
// Flags categories that are significantly over average
// ─────────────────────────────────────────────────────────────
function computeAnomalies(currentTxns, allTransactions, selectedMonth) {
  const isSettlement = (t) => t.isSettlement || (t.notes && t.notes.startsWith('Payment via'));

  // Current month category totals
  const currentCatTotals = {};
  currentTxns
    .filter((t) => t.type === 'expense' && !isSettlement(t))
    .forEach((t) => {
      currentCatTotals[t.category] = (currentCatTotals[t.category] || 0) + t.amount;
    });

  // Build 3-month history (months before selectedMonth)
  const historyMonths = [];
  for (let i = 1; i <= 3; i++) {
    const d = new Date(selectedMonth);
    d.setMonth(d.getMonth() - i);
    historyMonths.push(getMonthKey(d));
  }

  const historyCatTotals = {}; // catId → [amounts per month]
  allTransactions
    .filter(
      (t) =>
        t.type === 'expense' &&
        !isSettlement(t) &&
        historyMonths.some((mk) => t.date.startsWith(mk))
    )
    .forEach((t) => {
      const mk = t.date.slice(0, 7);
      const monthIdx = historyMonths.indexOf(mk);
      if (monthIdx === -1) return;
      if (!historyCatTotals[t.category]) historyCatTotals[t.category] = [0, 0, 0];
      historyCatTotals[t.category][monthIdx] += t.amount;
    });

  const anomalies = [];

  Object.entries(currentCatTotals).forEach(([catId, currentAmount]) => {
    const history = historyCatTotals[catId];
    if (!history) return; // no history, can't compare

    const nonZeroMonths = history.filter((v) => v > 0);
    if (nonZeroMonths.length < 2) return; // need at least 2 months of data

    const avg = nonZeroMonths.reduce((s, v) => s + v, 0) / nonZeroMonths.length;
    if (avg < 100) return; // ignore trivially small categories

    const pctChange = Math.round(((currentAmount - avg) / avg) * 100);

    if (pctChange >= 30) {
      // spike
      anomalies.push({
        catId,
        cat: getCategory('expense', catId),
        currentAmount,
        avg: Math.round(avg),
        pctChange,
        type: 'spike',
        excess: Math.round(currentAmount - avg),
      });
    } else if (pctChange <= -40) {
      // rare: significantly under — could mean a missed bill
      anomalies.push({
        catId,
        cat: getCategory('expense', catId),
        currentAmount,
        avg: Math.round(avg),
        pctChange,
        type: 'drop',
        excess: Math.round(avg - currentAmount),
      });
    }
  });

  // Also check categories that had history but are zero this month (possibly missed bills)
  Object.entries(historyCatTotals).forEach(([catId, history]) => {
    if (currentCatTotals[catId] !== undefined) return; // already handled
    const nonZeroMonths = history.filter((v) => v > 0);
    if (nonZeroMonths.length < 2) return;
    const avg = nonZeroMonths.reduce((s, v) => s + v, 0) / nonZeroMonths.length;
    if (avg < 200) return;
    // Category had regular spend but nothing this month — possible missed bill
    anomalies.push({
      catId,
      cat: getCategory('expense', catId),
      currentAmount: 0,
      avg: Math.round(avg),
      pctChange: -100,
      type: 'missing',
      excess: Math.round(avg),
    });
  });

  return anomalies.sort((a, b) => Math.abs(b.pctChange) - Math.abs(a.pctChange)).slice(0, 4);
}

// ─────────────────────────────────────────────────────────────
// 4. Subscription Audit
// Detects recurring transactions: same normalized description,
// amount within 5% variance, appears every month (or bimonthly)
// ─────────────────────────────────────────────────────────────
function computeSubscriptions(allTransactions) {
  const isSettlement = (t) => t.isSettlement || (t.notes && t.notes.startsWith('Payment via'));
  const expenses = allTransactions
    .filter((t) => t.type === 'expense' && !isSettlement(t))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  // Group by normalized vendor
  const vendorMap = {};
  expenses.forEach((t) => {
    const key = normalizeVendor(t.description);
    if (!vendorMap[key]) vendorMap[key] = [];
    vendorMap[key].push(t);
  });

  const subscriptions = [];

  Object.entries(vendorMap).forEach(([key, txns]) => {
    if (txns.length < 2) return;

    // Check if amounts are consistent (within 10% variance of median)
    const amounts = txns.map((t) => t.amount).sort((a, b) => a - b);
    const median = amounts[Math.floor(amounts.length / 2)];
    if (median < 50) return; // too small to be a subscription

    const consistent = amounts.every(
      (a) => Math.abs(a - median) / median <= 0.1
    );
    if (!consistent) return;

    // Check if they appear in different months
    const months = [...new Set(txns.map((t) => t.date.slice(0, 7)))];
    if (months.length < 2) return;

    // Check approximate monthly recurrence (max ~35 day gaps)
    const sortedDates = txns
      .map((t) => new Date(t.date))
      .sort((a, b) => a - b);

    const gaps = [];
    for (let i = 1; i < sortedDates.length; i++) {
      gaps.push((sortedDates[i] - sortedDates[i - 1]) / 86400000);
    }
    const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length;
    if (avgGap > 45) return; // not monthly-ish

    const lastDate = sortedDates[sortedDates.length - 1];
    const daysSinceLast = (new Date() - lastDate) / 86400000;
    const isActive = daysSinceLast <= avgGap + 10; // allow 10-day buffer

    if (!isActive) return;

    subscriptions.push({
      key,
      displayName: txns[0].description || key,
      amount: median,
      frequency: avgGap <= 10 ? 'weekly' : avgGap <= 20 ? 'bi-weekly' : 'monthly',
      occurrences: txns.length,
      lastDate: txns[0].date,
      yearlyEstimate: Math.round(median * (avgGap <= 10 ? 52 : avgGap <= 20 ? 26 : 12)),
      cat: getCategory('expense', txns[0].category),
    });
  });

  return subscriptions.sort((a, b) => b.amount - a.amount);
}

// ─────────────────────────────────────────────────────────────
// Main hook — compose all four pillars
// ─────────────────────────────────────────────────────────────
export function useInsights() {
  const transactions = useStore((s) => s.getMonthlyTransactions());
  const allTransactions = useStore((s) => s.transactions);
  const selectedMonth = useStore((s) => s.selectedMonth);
  const budgets = useStore((s) => s.budgets);

  // Total income for this month (used for % of income calc)
  const totalIncome = useMemo(
    () =>
      transactions
        .filter((t) => t.type === 'income')
        .reduce((s, t) => s + t.amount, 0),
    [transactions]
  );

  const vendors = useMemo(
    () => computeVendorInsights(allTransactions, totalIncome),
    [allTransactions, totalIncome]
  );

  const burnRate = useMemo(
    () => computeBurnRate(transactions, selectedMonth, budgets),
    [transactions, selectedMonth, budgets]
  );

  const anomalies = useMemo(
    () => computeAnomalies(transactions, allTransactions, selectedMonth),
    [transactions, allTransactions, selectedMonth]
  );

  const subscriptions = useMemo(
    () => computeSubscriptions(allTransactions),
    [allTransactions]
  );

  const subscriptionYearlyTotal = subscriptions.reduce(
    (s, sub) => s + sub.yearlyEstimate,
    0
  );

  return {
    vendors,
    burnRate,
    anomalies,
    subscriptions,
    subscriptionYearlyTotal,
    hasData: allTransactions.length > 0,
  };
}
