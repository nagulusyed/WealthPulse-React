import { useMemo } from 'react';
import useStore from '../store/useStore';

// Shared settlement check — consistent across the whole app.
// A transaction is a settlement if it has the isSettlement flag OR
// its notes start with "Settlement" (covers SettleModal-created txns).
export function isSettlementTxn(t) {
  return t.isSettlement || (t.notes && t.notes.startsWith('Settlement'));
}

/**
 * Computes Yearly Savings (YTD) from aggregated current-year transactions.
 * Savings = Total Income − Total Expenses (net of settlements)
 * Savings Rate = (Savings / Total Income) × 100
 */
export function useYTDSavings() {
  const allTransactions = useStore((s) => s.transactions);

  return useMemo(() => {
    const currentYear = new Date().getFullYear().toString();
    const ytdTxns = allTransactions.filter((t) => t.date.startsWith(currentYear));

    const totalIncome = ytdTxns
      .filter((t) => t.type === 'income' && !isSettlementTxn(t))
      .reduce((s, t) => s + t.amount, 0);

    const totalExpense = ytdTxns
      .filter((t) => t.type === 'expense' && !isSettlementTxn(t))
      .reduce((s, t) => s + t.amount, 0);

    const settlementIncome = ytdTxns
      .filter((t) => t.type === 'income' && isSettlementTxn(t))
      .reduce((s, t) => s + t.amount, 0);

    const netExpense = totalExpense - settlementIncome;
    const savings = totalIncome - netExpense;
    const savingsRate = totalIncome > 0 ? Math.round((savings / totalIncome) * 100) : 0;

    return {
      totalIncome,
      totalExpense: netExpense,
      savings,
      savingsRate,
      year: currentYear,
    };
  }, [allTransactions]);
}
