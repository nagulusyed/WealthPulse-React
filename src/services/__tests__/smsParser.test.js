// src/services/__tests__/smsParser.test.js
import { describe, it, expect } from 'vitest';
import {
  parseSms,
  splitMessages,
  extractType,
  isPersonalTransfer,
  detectCategory,
} from '../smsParser';

// ── Real HDFC message fixtures ──────────────────────────────────────────────
const HDFC_CREDIT =
  'Credit Alert!\nRs.1.00 credited to HDFC Bank A/c XX1245 on 07-05-26 from VPA 9848657887.wallet@phonepe (UPI 253309767740)';

const HDFC_SENT =
  'Sent Rs.1.00\nFrom HDFC Bank A/C *1245\nTo SAYYED  NAGULU\nOn 07/05/26\nRef 679689015689\nNot You?\nCall 18002586161...';

const HDFC_DEBIT_ALERT =
  'Debit Alert!\nRs.500.00 debited from HDFC Bank A/c XX1245 on 08-05-26 via UPI (UPI 987654321012)';

const OTP_MESSAGE =
  'Your OTP is 123456 for HDFC Bank transaction. Do not share.';

const SHORT_MESSAGE = 'Hi there!';

// ── parseSms ─────────────────────────────────────────────────────────────────

describe('parseSms', () => {
  describe('HDFC Credit Alert format', () => {
    it('returns a result object for a valid credit SMS', () => {
      const result = parseSms(HDFC_CREDIT);
      expect(result).not.toBeNull();
    });

    it('parses amount correctly', () => {
      const result = parseSms(HDFC_CREDIT);
      expect(result.amount).toBe(1.0);
    });

    it('parses type as credit', () => {
      const result = parseSms(HDFC_CREDIT);
      expect(result.type).toBe('credit');
    });

    it('parses date correctly (DD-MM-YY → YYYY-MM-DD)', () => {
      const result = parseSms(HDFC_CREDIT);
      expect(result.date).toBe('2026-05-07');
    });

    it('extracts UPI reference as the transaction ID', () => {
      const result = parseSms(HDFC_CREDIT);
      expect(result.id).toBe('253309767740');
    });

    it('extracts account number', () => {
      const result = parseSms(HDFC_CREDIT);
      expect(result.account).toBe('1245');
    });

    it('sets category to other_inc for credit transactions', () => {
      const result = parseSms(HDFC_CREDIT);
      expect(result.category).toBe('other_inc');
    });

    it('sets isSelfTransfer to false for credit transactions', () => {
      const result = parseSms(HDFC_CREDIT);
      expect(result.isSelfTransfer).toBe(false);
    });

    it('stores rawSms on the result', () => {
      const result = parseSms(HDFC_CREDIT);
      expect(result.rawSms).toBe(HDFC_CREDIT.trim());
    });
  });

  describe('HDFC Sent Rs format', () => {
    it('returns a result object for a valid sent SMS', () => {
      const result = parseSms(HDFC_SENT);
      expect(result).not.toBeNull();
    });

    it('parses amount correctly', () => {
      const result = parseSms(HDFC_SENT);
      expect(result.amount).toBe(1.0);
    });

    it('parses type as debit', () => {
      const result = parseSms(HDFC_SENT);
      expect(result.type).toBe('debit');
    });

    it('parses date correctly (DD/MM/YY → YYYY-MM-DD)', () => {
      const result = parseSms(HDFC_SENT);
      expect(result.date).toBe('2026-05-07');
    });

    it('extracts Ref number as the transaction ID', () => {
      const result = parseSms(HDFC_SENT);
      expect(result.id).toBe('679689015689');
    });

    it('extracts payee name from "To" line', () => {
      const result = parseSms(HDFC_SENT);
      expect(result.payee).toBe('SAYYED NAGULU');
    });

    it('flags isSelfTransfer true for a person name payee', () => {
      const result = parseSms(HDFC_SENT);
      expect(result.isSelfTransfer).toBe(true);
    });
  });

  describe('HDFC Debit Alert format', () => {
    it('returns a result object', () => {
      const result = parseSms(HDFC_DEBIT_ALERT);
      expect(result).not.toBeNull();
    });

    it('parses type as debit', () => {
      const result = parseSms(HDFC_DEBIT_ALERT);
      expect(result.type).toBe('debit');
    });

    it('parses amount correctly', () => {
      const result = parseSms(HDFC_DEBIT_ALERT);
      expect(result.amount).toBe(500.0);
    });

    it('parses date correctly', () => {
      const result = parseSms(HDFC_DEBIT_ALERT);
      expect(result.date).toBe('2026-05-08');
    });
  });

  describe('OTP messages', () => {
    it('returns null for OTP messages', () => {
      expect(parseSms(OTP_MESSAGE)).toBeNull();
    });

    it('returns null for "one time pass" variant', () => {
      expect(parseSms('Your one time password is 4567 for login.')).toBeNull();
    });

    it('returns null for "verification code" variant', () => {
      expect(parseSms('Your verification code is 998877 for bank login.')).toBeNull();
    });
  });

  describe('short / null messages', () => {
    it('returns null for messages shorter than 20 chars', () => {
      expect(parseSms(SHORT_MESSAGE)).toBeNull();
    });

    it('returns null for null input', () => {
      expect(parseSms(null)).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(parseSms('')).toBeNull();
    });
  });

  describe('fallback ID uniqueness', () => {
    // When no Ref/UPI ID is present the parser generates a random fallback ID.
    const NO_REF_SMS =
      'Debit Alert!\nRs.200.00 debited from Your A/c on 09-05-26 via ATM';

    it('same SMS body always produces the same stable fallback ID (deterministic hash)', () => {
      // Stable hash ensures the same message is deduplicated across sessions
      const ids = Array.from({ length: 5 }, () => parseSms(NO_REF_SMS)?.id);
      expect(new Set(ids).size).toBe(1); // all identical
      expect(ids[0]).toMatch(/^sms_[0-9a-f]{8}$/); // sms_ prefix + 8 hex chars
    });

    it('different SMS bodies produce different fallback IDs', () => {
      const sms1 = 'Debit Alert!\nRs.200.00 debited from Your A/c on 09-05-26 via ATM';
      const sms2 = 'Debit Alert!\nRs.300.00 debited from Your A/c on 09-05-26 via ATM';
      const id1 = parseSms(sms1)?.id;
      const id2 = parseSms(sms2)?.id;
      expect(id1).not.toBe(id2);
    });
  });
});

// ── splitMessages ─────────────────────────────────────────────────────────────

describe('splitMessages', () => {
  it('returns empty array for null input', () => {
    expect(splitMessages(null)).toEqual([]);
  });

  it('returns empty array for blank string', () => {
    expect(splitMessages('   ')).toEqual([]);
  });

  it('returns single-element array when no split boundary found', () => {
    const single = 'Some random bank message with no keyword.';
    const parts = splitMessages(single);
    expect(parts).toHaveLength(1);
  });

  it('splits batched Credit Alert + Debit Alert messages', () => {
    const batched = `Credit Alert!\nRs.100.00 credited to HDFC Bank A/c XX1245 on 07-05-26 from VPA abc@upi (UPI 111111111111)Debit Alert!\nRs.200.00 debited from HDFC Bank A/c XX1245 on 07-05-26 via UPI (UPI 222222222222)`;
    const parts = splitMessages(batched);
    expect(parts.length).toBeGreaterThanOrEqual(2);
    expect(parts[0]).toMatch(/Credit Alert/i);
    expect(parts[1]).toMatch(/Debit Alert/i);
  });

  it('splits batched Sent Rs messages', () => {
    const batched =
      'Sent Rs.50.00\nFrom HDFC Bank A/C *1245\nTo ALICE\nOn 07/05/26\nRef 100000000001\n' +
      'Sent Rs.75.00\nFrom HDFC Bank A/C *1245\nTo BOB\nOn 07/05/26\nRef 100000000002';
    const parts = splitMessages(batched);
    expect(parts.length).toBeGreaterThanOrEqual(2);
    expect(parts[0]).toContain('Sent Rs.50.00');
    expect(parts[1]).toContain('Sent Rs.75.00');
  });
});

// ── extractType ───────────────────────────────────────────────────────────────

describe('extractType', () => {
  it('returns "credit" for "Credit Alert!" first line', () => {
    expect(extractType('Credit Alert!\nRs.10 credited to your account')).toBe('credit');
  });

  it('returns "debit" for "Sent Rs" first line', () => {
    expect(extractType('Sent Rs.100\nFrom HDFC Bank A/C *1234\nTo PERSON\nOn 01/01/26\nRef 123456789')).toBe('debit');
  });

  it('returns "debit" for "Sent INR" first line', () => {
    expect(extractType('Sent INR 500\nFrom HDFC Bank A/C *1234\nTo VPA abc@upi')).toBe('debit');
  });

  it('returns "debit" for "Debit Alert!" first line', () => {
    expect(extractType('Debit Alert!\nRs.300 debited from your account')).toBe('debit');
  });

  it('returns "debit" for full-text "debited" fallback', () => {
    expect(extractType('Your account has been debited with Rs.500 on 01-01-26')).toBe('debit');
  });

  it('returns "credit" for full-text "credited" fallback', () => {
    expect(extractType('Rs.1000 has been credited to your account on 01-01-26')).toBe('credit');
  });

  it('returns null when no type can be determined', () => {
    expect(extractType('Please update your KYC details before 30-05-26.')).toBeNull();
  });
});

// ── isPersonalTransfer ────────────────────────────────────────────────────────

describe('isPersonalTransfer', () => {
  it('returns false for well-known merchant names', () => {
    expect(isPersonalTransfer('Zomato')).toBe(false);
    expect(isPersonalTransfer('Amazon')).toBe(false);
    expect(isPersonalTransfer('Swiggy')).toBe(false);
    expect(isPersonalTransfer('Apollo Pharmacy')).toBe(false);
  });

  it('returns true for plain person names (only letters and spaces)', () => {
    expect(isPersonalTransfer('SAYYED NAGULU')).toBe(true);
    expect(isPersonalTransfer('John Doe')).toBe(true);
    expect(isPersonalTransfer('Priya')).toBe(true);
  });

  it('returns false for empty string', () => {
    expect(isPersonalTransfer('')).toBe(false);
  });

  it('returns false when name contains digits (likely a VPA username)', () => {
    expect(isPersonalTransfer('9848657887wallet')).toBe(false);
  });
});

// ── detectCategory ────────────────────────────────────────────────────────────

describe('detectCategory', () => {
  it('returns "food" for Zomato', () => {
    expect(detectCategory('Zomato')).toBe('food');
  });

  it('returns "food" for Swiggy', () => {
    expect(detectCategory('Swiggy')).toBe('food');
  });

  it('returns "transport" for Uber', () => {
    expect(detectCategory('Uber')).toBe('transport');
  });

  it('returns "transport" for IRCTC', () => {
    expect(detectCategory('IRCTC ticket booking')).toBe('transport');
  });

  it('returns "shopping" for Amazon', () => {
    expect(detectCategory('Amazon')).toBe('shopping');
  });

  it('returns "shopping" for Flipkart', () => {
    expect(detectCategory('Flipkart')).toBe('shopping');
  });

  it('returns "bills" for Airtel', () => {
    expect(detectCategory('Airtel Recharge')).toBe('bills');
  });

  it('returns "bills" for Netflix', () => {
    expect(detectCategory('Netflix')).toBe('bills');
  });

  it('returns "health" for Apollo Pharmacy', () => {
    expect(detectCategory('Apollo Pharmacy')).toBe('health');
  });

  it('returns "entertainment" for BookMyShow', () => {
    expect(detectCategory('BookMyShow')).toBe('entertainment');
  });

  it('returns "education" for Udemy', () => {
    expect(detectCategory('Udemy')).toBe('education');
  });

  it('returns "rent" for rent payment', () => {
    expect(detectCategory('Monthly Rent')).toBe('rent');
  });

  it('returns "other_exp" for unknown merchants', () => {
    expect(detectCategory('XYZ Unknown Shop')).toBe('other_exp');
  });

  it('returns "other_exp" for null/undefined input', () => {
    expect(detectCategory(null)).toBe('other_exp');
    expect(detectCategory(undefined)).toBe('other_exp');
  });
});
