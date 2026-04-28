// ── Formatting Utilities ──

/**
 * Format a number as Indian Rupee currency string.
 * e.g. 25000 → "₹25,000"
 */
export function formatCurrency(n) {
  return '₹' + Number(n).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/**
 * Compact currency for chart labels.
 * e.g. 25000 → "₹25k"
 */
export function formatCurrencyCompact(n) {
  if (n >= 100000) return '₹' + (n / 100000).toFixed(1) + 'L';
  if (n >= 1000) return '₹' + (n / 1000).toFixed(0) + 'k';
  return '₹' + n;
}

/**
 * Format an ISO date string to short display format.
 * e.g. "2026-04-23" → "23 Apr"
 */
export function formatDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

/**
 * Format a month label from a Date object.
 * e.g. → "April 2026"
 */
export function formatMonthLabel(date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Get "YYYY-MM" key from a Date object for filtering transactions.
 */
export function getMonthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
