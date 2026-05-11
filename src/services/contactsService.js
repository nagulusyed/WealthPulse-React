import { registerPlugin } from '@capacitor/core';

const Contacts = registerPlugin('Contacts');

export async function searchContacts(query) {
  try {
    if (!query || query.length < 2) return [];
    
    const result = await Contacts.searchContacts({ query });
    return (result.contacts || []).map(c => ({
      ...c,
      initials: getInitials(c.name)
    }));
  } catch (e) {
    console.error('searchContacts error:', e);
    return [];
  }
}

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
    const status = await Contacts.requestPermissions();
    return status.contacts === 'granted';
  } catch (e) {
    return false;
  }
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getUpiAppLabel(upiApp) {
  if (!upiApp) return 'UPI';
  return upiApp; // GPay, PhonePe, etc.
}
