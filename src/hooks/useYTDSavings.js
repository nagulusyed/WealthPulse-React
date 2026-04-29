import { useMemo } from 'react';
import useStore from '../store/useStore';

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

    const isSettlement = (t) => t.isSettlement || (t.notes && t.notes.includes('Settlement'));

    const totalIncome = ytdTxns
      .filter((t) => t.type === 'income' && !isSettlement(t))
      .reduce((s, t) => s + t.amount, 0);

    const totalExpense = ytdTxns
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0);

    const settlementIncome = ytdTxns
      .filter((t) => t.type === 'income' && isSettlement(t))
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
