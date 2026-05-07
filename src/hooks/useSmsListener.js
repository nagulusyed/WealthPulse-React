import { useEffect } from 'react';
import { parseSms, splitMessages, testParse } from '../services/smsParser';
import useStore from '../store/useStore';

// Expose test helper globally for DevTools debugging
// Usage in chrome://inspect console:  window.testSms('Your SMS here')
if (typeof window !== 'undefined') {
  window.testSms = testParse;
}

export function useSmsListener() {
  const smsEnabled = useStore((s) => s.smsEnabled);
  const addPendingSms = useStore((s) => s.addPendingSms);

  useEffect(() => {
    if (!smsEnabled) return;

    function handleIncomingSms(smsBody) {
      if (!smsBody || !smsBody.trim()) return;

      console.log('[WP-SMS] Raw received:', smsBody.slice(0, 120));

      const messages = splitMessages(smsBody);
      console.log('[WP-SMS] Split into', messages.length, 'message(s)');

      messages.forEach((msg) => {
        const parsed = parseSms(msg);
        if (!parsed) {
          console.log('[WP-SMS] Could not parse:', msg.slice(0, 80));
          return;
        }

        console.log('[WP-SMS] Parsed:', parsed.type, parsed.amount, parsed.payee);

        // Deduplicate using stable id
        const existing = useStore.getState().pendingSmsTransactions;
        if (existing.some((tx) => tx.id === parsed.id)) {
          console.log('[WP-SMS] Duplicate, skipping:', parsed.id);
          return;
        }

        // Apply remembered category for this payee
        const remembered = useStore.getState().getCategoryForPayee?.(parsed.payee);
        if (remembered) parsed.category = remembered;

        addPendingSms(parsed);
      });
    }

    // ── Android: Capacitor custom plugin (future) ──
    const cap = window.Capacitor;

    if (cap?.Plugins?.SmsRetriever?.addListener) {
      console.log('[WP-SMS] Using SmsRetriever plugin');
      const handle = cap.Plugins.SmsRetriever.addListener('onSmsReceived', (data) => {
        handleIncomingSms(data?.message || data?.body || '');
      });
      return () => { handle?.remove?.(); };
    }

    if (cap?.Plugins?.WealthPulseSms?.addListener) {
      console.log('[WP-SMS] Using WealthPulseSms plugin');
      const handle = cap.Plugins.WealthPulseSms.addListener('smsReceived', (data) => {
        handleIncomingSms(data?.body || '');
      });
      return () => { handle?.remove?.(); };
    }

    // ── Primary path: Java → getBridge().eval() → wp_sms_test event or wpReceiveSms global ──
    console.log('[WP-SMS] Listening on wp_sms_test + wpReceiveSms (Android WebView path)');

    const eventHandler = (e) => {
      const body = e.detail?.body || e.detail?.text || '';
      handleIncomingSms(body);
    };

    window.addEventListener('wp_sms_test', eventHandler);
    window.wpReceiveSms = (body) => handleIncomingSms(body || '');

    return () => {
      window.removeEventListener('wp_sms_test', eventHandler);
      delete window.wpReceiveSms;
    };

  }, [smsEnabled, addPendingSms]);
}
