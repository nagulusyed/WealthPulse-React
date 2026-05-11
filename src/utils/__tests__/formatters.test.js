// src/utils/__tests__/formatters.test.js
import { describe, it, expect } from 'vitest';
import { formatCurrency, formatCurrencyCompact, getMonthKey } from '../formatters';

// ── formatCurrencyCompact ────────────────────────────────────────────────────

describe('formatCurrencyCompact', () => {
  it('formats values < 1000 as ₹<rounded integer> (no raw float)', () => {
    expect(formatCurrencyCompact(0)).toBe('₹0');
    expect(formatCurrencyCompact(1)).toBe('₹1');
    expect(formatCurrencyCompact(500)).toBe('₹500');
    expect(formatCurrencyCompact(999)).toBe('₹999');
  });

  it('rounds fractional values < 1000', () => {
    expect(formatCurrencyCompact(999.6)).toBe('₹1000');
    expect(formatCurrencyCompact(1.4)).toBe('₹1');
    expect(formatCurrencyCompact(1.5)).toBe('₹2');
  });

  it('formats values >= 1000 and < 100000 as ₹<N>k', () => {
    expect(formatCurrencyCompact(1000)).toBe('₹1k');
    expect(formatCurrencyCompact(1500)).toBe('₹2k');
    expect(formatCurrencyCompact(25000)).toBe('₹25k');
    expect(formatCurrencyCompact(99999)).toBe('₹100k');
  });

  it('formats values >= 100000 as ₹<N.N>L (Lakhs)', () => {
    expect(formatCurrencyCompact(100000)).toBe('₹1.0L');
    expect(formatCurrencyCompact(150000)).toBe('₹1.5L');
    expect(formatCurrencyCompact(1000000)).toBe('₹10.0L');
    expect(formatCurrencyCompact(250000)).toBe('₹2.5L');
  });
});

// ── formatCurrency ────────────────────────────────────────────────────────────

describe('formatCurrency', () => {
  it('prefixes with ₹ symbol', () => {
    expect(formatCurrency(100)).toMatch(/^₹/);
  });

  it('formats 1000 with a comma separator (Indian locale)', () => {
    // en-IN: 1,000
    expect(formatCurrency(1000)).toBe('₹1,000');
  });

  it('formats 25000 correctly', () => {
    expect(formatCurrency(25000)).toBe('₹25,000');
  });

  it('formats 100000 correctly (1,00,000 in Indian locale)', () => {
    // Node.js Intl library formats 100000 as 1,00,000 in en-IN
    expect(formatCurrency(100000)).toMatch(/₹1,00,000/);
  });

  it('formats 0 as ₹0', () => {
    expect(formatCurrency(0)).toBe('₹0');
  });

  it('formats fractional amounts with up to 2 decimal places', () => {
    expect(formatCurrency(1.5)).toBe('₹1.5');
    expect(formatCurrency(1.55)).toBe('₹1.55');
  });

  it('accepts string input (Number coercion)', () => {
    expect(formatCurrency('500')).toBe('₹500');
  });
});

// ── getMonthKey ───────────────────────────────────────────────────────────────

describe('getMonthKey', () => {
  it('returns YYYY-MM format for a known date', () => {
    const date = new Date(2026, 4, 7); // May 7 2026 (month is 0-based)
    expect(getMonthKey(date)).toBe('2026-05');
  });

  it('pads single-digit months with a leading zero', () => {
    const date = new Date(2026, 0, 15); // January
    expect(getMonthKey(date)).toBe('2026-01');
  });

  it('handles December correctly', () => {
    const date = new Date(2025, 11, 31); // December
    expect(getMonthKey(date)).toBe('2025-12');
  });

  it('handles start of year correctly', () => {
    const date = new Date(2026, 0, 1); // January 1
    expect(getMonthKey(date)).toBe('2026-01');
  });

  it('returns a string that can prefix-match transaction date strings', () => {
    const date = new Date(2026, 4, 7);
    const key = getMonthKey(date);
    const txnDate = '2026-05-07';
    expect(txnDate.startsWith(key)).toBe(true);
  });
});
