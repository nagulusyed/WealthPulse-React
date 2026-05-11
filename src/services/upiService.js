// ── UPI Deep Link Service ──

/**
 * Builds a standard UPI deep link
 * upi://pay?pa=UPI_ID&pn=NAME&am=AMOUNT&cu=INR&tn=NOTE
 */
export function buildUpiLink({ upiId, name, amount, note }) {
  if (!upiId) return null;
  
  // Minimalist parameters to bypass strict security filters in PhonePe/GPay
  const url = new URL('upi://pay');
  url.searchParams.append('pa', upiId);
  url.searchParams.append('am', amount.toFixed(2));
  url.searchParams.append('cu', 'INR');
  url.searchParams.append('tn', 'Payment'); // Simple note
  url.searchParams.append('tr', `${Math.floor(Math.random() * 1000000)}`); // Random numeric ID
  
  return url.toString().replace('upi://pay/?', 'upi://pay?');
}

/**
 * Opens the UPI payment chooser on Android
 */
export async function openUpiApp({ upiId, name, amount, note }) {
  const link = buildUpiLink({ upiId, name, amount, note });
  if (!link) throw new Error('Invalid UPI ID');
  
  try {
    // window.open with _system is the most reliable way to trigger 
    // custom URL schemes (like upi://) on Android in Capacitor.
    window.open(link, '_system');
    return true;
  } catch (e) {
    console.error('Failed to open UPI app:', e);
    return false;
  }
}

/**
 * Generates a shareable payment request link (using YOUR UPI ID)
 */
export function buildRequestLink({ myUpiId, myName, amount, note }) {
  return buildUpiLink({ upiId: myUpiId, name: myName, amount, note });
}

/**
 * Formats a UPI ID for display
 */
export function formatUpiId(upiId) {
  if (!upiId) return '';
  return upiId.toLowerCase();
}
