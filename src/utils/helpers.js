// ── ID & Misc Helpers ──

/** Generate a unique ID (same algorithm as vanilla app) */
export function generateId(prefix = '') {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Get initials from a name, max 2 chars */
export function getInitials(name) {
  return name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase();
}

/** Get time-of-day greeting */
export function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Escape HTML to prevent XSS (for any dangerouslySetInnerHTML edge cases) */
export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
