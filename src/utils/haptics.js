/**
 * Haptics utility — uses Capacitor's global Haptics plugin
 * No npm package needed — Capacitor core exposes it via window.Capacitor.Plugins
 * Falls back silently on web/desktop.
 */

function getHaptics() {
  try {
    return window?.Capacitor?.Plugins?.Haptics || null;
  } catch {
    return null;
  }
}

/** Light tap — for selections, chip taps, navigation */
export async function hapticLight() {
  try {
    const H = getHaptics();
    if (H) await H.impact({ style: 'LIGHT' });
  } catch {}
}

/** Medium tap — for primary actions: Add, Save */
export async function hapticMedium() {
  try {
    const H = getHaptics();
    if (H) await H.impact({ style: 'MEDIUM' });
  } catch {}
}

/** Heavy tap — for destructive actions: Delete */
export async function hapticHeavy() {
  try {
    const H = getHaptics();
    if (H) await H.impact({ style: 'HEAVY' });
  } catch {}
}

/** Success notification — for settle, payment confirmed */
export async function hapticSuccess() {
  try {
    const H = getHaptics();
    if (H) await H.notification({ type: 'SUCCESS' });
  } catch {}
}

/** Warning notification — for validation errors, unsaved changes */
export async function hapticWarning() {
  try {
    const H = getHaptics();
    if (H) await H.notification({ type: 'WARNING' });
  } catch {}
}
