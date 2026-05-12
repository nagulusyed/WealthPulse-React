import { registerPlugin } from '@capacitor/core';

const Contacts = registerPlugin('Contacts');

// ── Permission helpers ─────────────────────────────────────────

export async function checkContactsPermission() {
  try {
    const status = await Contacts.checkPermissions();
    return status.contacts === 'granted';
  } catch (e) {
    return false;
  }
}

export async function requestContactsPermission() {
  try {
    // Check first — avoids re-triggering the system dialog if already granted
    const already = await checkContactsPermission();
    if (already) return true;
    const status = await Contacts.requestPermissions();
    return status.contacts === 'granted';
  } catch (e) {
    console.error('requestContactsPermission error:', e);
    return false;
  }
}

// ── Search ────────────────────────────────────────────────────

export async function searchContacts(query) {
  try {
    if (!query || query.trim().length < 2) return [];
    const result = await Contacts.searchContacts({ query: query.trim() });
    return (result.contacts || []).map(normalizeContact);
  } catch (e) {
    console.error('searchContacts error:', e);
    return [];
  }
}

// ── Get single contact by ID (for re-sync) ────────────────────

export async function getContact(contactId) {
  try {
    if (!contactId) return null;
    const result = await Contacts.getContact({ contactId: String(contactId) });
    return result.contact ? normalizeContact(result.contact) : null;
  } catch (e) {
    console.error('getContact error:', e);
    return null;
  }
}

// ── Normalise contact from Java → JS ─────────────────────────

function normalizeContact(c) {
  return {
    id: c.id,
    name: c.name || '',
    phone: c.phone || '',
    upiId: c.upiId || '',
    upiApp: c.upiApp || '',
    avatar: c.avatar || null,
    initials: getInitials(c.name),
  };
}

// ── UPI app label ─────────────────────────────────────────────

export function getUpiAppLabel(upiApp) {
  if (!upiApp) return 'UPI';
  return upiApp; // 'GPay', 'PhonePe', 'Paytm', 'BHIM'
}

// ── Helpers ───────────────────────────────────────────────────

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
