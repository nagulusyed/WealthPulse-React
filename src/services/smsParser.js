// ── SMS Parser Service ──
// Confirmed real formats from device (JX-HDFCBK-S sender):
//
// Credit: "Credit Alert!\nRs.1.00 credited to HDFC Bank A/c XX1245 on 07-05-26 from VPA 9848657887.wallet@phonepe (UPI 253309767740)"
// Sent:   "Sent Rs.1.00\nFrom HDFC Bank A/C *1245\nTo SAYYED  NAGULU\nOn 07/05/26\nRef 679689015689\nNot You?\nCall 18002586161..."

const MERCHANT_CATEGORY_MAP = [
  { keywords: ['zomato', 'swiggy', 'zepto', 'blinkit', 'dunzo', 'dominos', 'pizza', 'kfc', 'mcdonalds', 'subway', 'burger', 'cafe', 'restaurant', 'food', 'biryani', 'hotel'], category: 'food' },
  { keywords: ['uber', 'ola', 'rapido', 'namma yatri', 'auto', 'cab', 'petrol', 'fuel', 'bpcl', 'hpcl', 'iocl', 'metro', 'irctc', 'redbus', 'makemytrip', 'goibibo', 'indigo', 'airline'], category: 'transport' },
  { keywords: ['amazon', 'flipkart', 'myntra', 'ajio', 'nykaa', 'meesho', 'snapdeal', 'reliance', 'dmart', 'bigbasket', 'grofers', 'blinkit', 'jiomart', 'shopping', 'store', 'mall', 'mart'], category: 'shopping' },
  { keywords: ['bescom', 'tsspdcl', 'apspdcl', 'electricity', 'airtel', 'jio', 'vodafone', 'vi', 'bsnl', 'broadband', 'internet', 'recharge', 'gas', 'lpg', 'water', 'municipal', 'bill', 'utility', 'netflix', 'hotstar', 'prime', 'spotify'], category: 'bills' },
  { keywords: ['apollo', 'medplus', 'pharma', 'medical', 'clinic', 'hospital', 'doctor', 'health', 'pharmacy', 'medicine', 'diagnostic', 'lab', 'dental'], category: 'health' },
  { keywords: ['pvr', 'inox', 'bookmyshow', 'cinema', 'movie', 'theatre', 'entertainment', 'game', 'gaming', 'steam'], category: 'entertainment' },
  { keywords: ['udemy', 'coursera', 'byjus', 'unacademy', 'school', 'college', 'university', 'tuition', 'education', 'books', 'stationery'], category: 'education' },
  { keywords: ['rent', 'housing', 'pg', 'hostel', 'maintenance', 'society', 'landlord'], category: 'rent' },
];

export function detectCategory(payeeName) {
  const lower = (payeeName || '').toLowerCase();
  for (const entry of MERCHANT_CATEGORY_MAP) {
    if (entry.keywords.some((kw) => lower.includes(kw))) return entry.category;
  }
  return 'other_exp';
}

export function isPersonalTransfer(payeeName) {
  const lower = (payeeName || '').toLowerCase();
  const merchantMatch = MERCHANT_CATEGORY_MAP.some((e) => e.keywords.some((kw) => lower.includes(kw)));
  if (merchantMatch) return false;
  return /^[a-zA-Z\s]+$/.test((payeeName || '').trim());
}

function extractTxnId(text) {
  const patterns = [
    /\bref\s+([0-9]{9,})/i,                          // "Ref 679689015689" — HDFC Sent format
    /upi\s+([0-9]{10,})/i,                            // "UPI 253309767740" — HDFC Credit format
    /ref\s*(?:no\.?|num\.?|id\.?)?\s*:?\s*([a-z0-9]{8,})/i,
    /txn\s*(?:id|no|ref)?\s*:?\s*([a-z0-9]{8,})/i,
    /imps\s*ref\s*no\.?\s*([0-9]{8,})/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[1];
  }
  return null;
}

function extractAmount(text) {
  const patterns = [
    /rs\.?\s*([\d,]+\.?\d*)/i,
    /inr\.?\s*([\d,]+\.?\d*)/i,
    /₹\s*([\d,]+\.?\d*)/,
    /(?:amount|amt)[:\s]+(?:rs\.?\s*)?([\d,]+\.?\d*)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const amt = parseFloat(m[1].replace(/,/g, ''));
      if (amt > 0) return amt;
    }
  }
  return null;
}

// ── Type detection: check first line first (most reliable), then full text ──
export function extractType(text) {
  const firstLine = text.split('\n')[0].toLowerCase().trim();
  const full = text.toLowerCase();

  // First line is definitive for HDFC format
  if (firstLine.startsWith('credit alert'))  return 'credit';
  if (firstLine.startsWith('sent rs'))       return 'debit';
  if (firstLine.startsWith('sent inr'))      return 'debit';
  if (firstLine.startsWith('debit alert'))   return 'debit';

  // Full text fallback for other banks
  if (/\bdebited\b/.test(full) || /\bdebit\s*alert\b/.test(full) || /\bspent\b/.test(full) ||
      /\bwithdrawn\b/.test(full) || /\bpurchase\b/.test(full) || /\bdeducted\b/.test(full) ||
      /debited\s+(?:from|for|by)\b/.test(full) || /\bhas\s+been\s+debited\b/.test(full) ||
      /\bpaid\s+(?:to|rs|inr|₹)/.test(full) || /\btransferred\s+(?:rs|inr|₹|to\b)/.test(full)) {
    return 'debit';
  }

  if (/\bcredit\s*alert\b/.test(full) || /\bcredited\b/.test(full) ||
      /\bhas\s+been\s+credited\b/.test(full) || /\bmoney\s+received\b/.test(full) ||
      /\bdeposited\s+(?:to|in)\b/.test(full) || /a\/c\s+[a-z0-9*x]+\s+credited/.test(full) ||
      /\breceived\s+(?:rs|inr|₹)/.test(full) || /\breceived\s+in\s+your/.test(full)) {
    return 'credit';
  }

  return null;
}

// ── Payee extraction ──
function extractPayee(text, type) {
  if (type === 'debit') {
    // "To SAYYED  NAGULU" on its own line — grab entire line after "To "
    const toLine = text.match(/^To\s+(.+)$/m);
    if (toLine) {
      const name = toLine[1].trim().replace(/\s+/g, ' ');
      if (name.length > 1) return name;
    }

    const patterns = [
      /\bto\s+vpa\s+([a-z0-9._-]+)@/i,
      /paid\s+to\s+(?:upi\s+id\s+)?([a-z0-9._-]+)@/i,
      /\bto\s+([a-z0-9._-]+)@(?:okicici|oksbi|okhdfcbank|ybl|upi|paytm|axisbank|kotak|apl|waicici)/i,
      /info[:\s]+upi\/([A-Za-z0-9 ._-]{2,30})/i,
      /merchant[:\s]+([A-Za-z0-9 .&'_-]{2,30})/i,
    ];
    for (const p of patterns) {
      const m = text.match(p);
      if (m) {
        let payee = m[1].trim().replace(/[._]\d+$/, '').replace(/[._]/g, ' ');
        payee = payee.replace(/\b\w/g, c => c.toUpperCase()).trim();
        if (payee.length > 1 && !/^(hdfc|sbi|icici|axis|kotak|upi|ybl|bank)$/i.test(payee)) return payee;
      }
    }
  }

  if (type === 'credit') {
    const patterns = [
      /from\s+vpa\s+([a-z0-9._-]+)@/i,
      /from\s+upi\s+id\s+([a-z0-9._-]+)@/i,
      /credited\s+by\s+(?:vpa\s+)?([a-z0-9._-]+)@/i,
      /\bfrom\s+([A-Za-z][A-Za-z ]{2,30}?)\s+via\b/i,
      /\bfrom\s+([A-Z][A-Za-z ]{2,30}?)(?:\s+(?:on|via|ref|upi|\d{2}[-\/])|\s*[.\n]|$)/m,
      /\b([a-z0-9._-]{3,30})@(?:okicici|oksbi|okhdfcbank|ybl|upi|paytm|axisbank|kotak|phonepe)\b/i,
    ];
    for (const p of patterns) {
      const m = text.match(p);
      if (m) {
        let payee = m[1].trim().replace(/[._]\d+$/, '').replace(/[._]/g, ' ');
        payee = payee.replace(/\b\w/g, c => c.toUpperCase()).trim();
        if (payee.length > 1 && !/^(hdfc|sbi|icici|axis|kotak|oksbi|upi|ybl|google|phonepe|paytm)$/i.test(payee)) {
          return payee;
        }
      }
    }
  }

  return null;
}

function parseDate(dateStr) {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  const s = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (s) {
    let [, dd, mm, yy] = s;
    if (yy.length === 2) yy = '20' + yy;
    return `${yy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  const monthNames = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };
  const s2 = dateStr.match(/(\d{1,2})[\s\-\/]([a-z]{3})[\s\-\/](\d{2,4})/i);
  if (s2) {
    const [, dd, mon, yy] = s2;
    const mm = monthNames[mon.toLowerCase()];
    if (mm) {
      const year = yy.length === 2 ? '20' + yy : yy;
      return `${year}-${String(mm).padStart(2,'0')}-${dd.padStart(2,'0')}`;
    }
  }
  return new Date().toISOString().split('T')[0];
}

export function splitMessages(raw) {
  if (!raw || !raw.trim()) return [];
  const parts = raw
    .split(/(?=(?:Credit Alert!|Sent Rs|Sent INR|Dear\s+\w|A\/C\s+[A-Z0-9*]+\s+(?:credited|debited)))/i)
    .filter(s => s.trim().length > 10);
  return parts.length > 0 ? parts : [raw];
}

function extractAccount(text) {
  const m = text.match(/a\/c\s*(?:no\.?\s*)?(?:xx+|\*+)?([0-9]{3,6})/i);
  return m ? m[1] : null;
}

export function parseSms(smsBody) {
  if (!smsBody) return null;
  const text = smsBody.trim();

  if (/\botp\b|\bone.?time.?pass|\bverification code\b/i.test(text)) return null;
  if (text.length < 20) return null;

  const amount = extractAmount(text);
  if (!amount || amount <= 0) return null;

  const type = extractType(text);
  if (!type) return null;

  const payee = extractPayee(text, type);
  const dateMatch = text.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{1,2}[\s\-][a-z]{3}[\s\-]\d{2,4})/i);
  const date = parseDate(dateMatch ? dateMatch[0] : null);
  const txnId = extractTxnId(text) || `${amount}-${date}-${type}-${(payee || '').slice(0, 10)}`;
  const account = extractAccount(text);

  return {
    id: txnId,
    amount,
    payee: payee || (type === 'credit' ? 'Credit Received' : 'Debit Payment'),
    date,
    type,
    category: type === 'credit' ? 'other_inc' : detectCategory(payee),
    isPersonalTransfer: type === 'debit' ? isPersonalTransfer(payee || '') : false,
    isSelfTransfer: false,
    account,
    rawSms: text,
  };
}

export function testParse(smsBody) {
  const result = parseSms(smsBody);
  console.table(result ? [result] : [{ error: 'no match', smsBody }]);
  return result;
}
