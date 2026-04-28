// ── Crypto Utilities (migrated from app.js hashPin / hashSecurityAnswer) ──

/**
 * SHA-256 hash with salt prefix for PIN storage.
 * Falls back to a simple hash for non-secure contexts (HTTP, WebView).
 */
export async function hashPin(pin) {
  const str = 'wp_salt_' + pin;
  if (window.crypto && window.crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(str);
      const hash = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(hash))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } catch (e) {
      /* fallback below */
    }
  }
  // Simple fallback for non-secure contexts
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'fb_' + Math.abs(hash).toString(16);
}

/**
 * SHA-256 hash for security question answers.
 * Normalizes: trims + lowercases before hashing.
 */
export async function hashSecurityAnswer(answer) {
  const str = 'wp_sec_q_salt_' + answer.trim().toLowerCase();
  if (window.crypto && window.crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(str);
      const hash = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(hash))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } catch (e) {
      /* fallback below */
    }
  }
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'fb_' + Math.abs(hash).toString(16);
}
