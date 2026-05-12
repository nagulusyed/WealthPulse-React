import { registerPlugin } from '@capacitor/core';
const UpiPlugin = registerPlugin('UpiPlugin');

export async function openUpiApp({ upiId, name, amount, note }) {
  if (!upiId) throw new Error('Invalid UPI ID');
  try {
    const result = await UpiPlugin.openUpi({
      upiId: upiId.trim(),
      name: (name || '').trim(),
      amount: parseFloat(amount),
      note: (note || 'Payment').substring(0, 50),
    });
    return result.success === true;
  } catch (e) {
    const msg = typeof e === 'string' ? e : (e?.message || '');
    if (msg.includes('no_upi_app')) throw new Error('NO_UPI_APP');
    console.error('openUpiApp error:', e);
    // Fallback: try window.open — works on web/dev
    try {
      const link = buildUpiLink({ upiId, name, amount, note });
      window.open(link, '_system');
      return true;
    } catch (_) {
      return false;
    }
  }
}

export async function getInstalledUpiApps() {
  try {
    const result = await UpiPlugin.getInstalledUpiApps();
    return result.apps || [];
  } catch (e) {
    return [];
  }
}

export function buildUpiLink({ upiId, name, amount, note }) {
  if (!upiId) return null;
  const params = [
    `pa=${encodeURIComponent(upiId.trim())}`,
    `pn=${encodeURIComponent((name || '').trim())}`,
    `am=${parseFloat(amount).toFixed(2)}`,
    `cu=INR`,
    `tn=${encodeURIComponent((note || 'Payment').substring(0, 50))}`,
  ];
  return `upi://pay?${params.join('&')}`;
}

export function buildRequestLink({ myUpiId, myName, amount, note }) {
  return buildUpiLink({ upiId: myUpiId, name: myName, amount, note });
}

export function formatUpiId(upiId) {
  return (upiId || '').toLowerCase().trim();
}

export function getUpiAppFromId(upiId) {
  if (!upiId) return null;
  const id = upiId.toLowerCase();
  if (id.endsWith('@ybl') || id.endsWith('@ibl') || id.endsWith('@axl')) return 'PhonePe';
  if (id.endsWith('@okicici') || id.endsWith('@okhdfcbank') || id.endsWith('@oksbi') || id.endsWith('@okaxis')) return 'GPay';
  if (id.endsWith('@paytm')) return 'Paytm';
  if (id.endsWith('@apl')) return 'Amazon Pay';
  if (id.endsWith('@upi') || id.endsWith('@npci')) return 'BHIM';
  return 'UPI';
}
