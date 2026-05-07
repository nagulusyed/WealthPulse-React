package com.wealthpulse.app;

import android.app.Notification;
import android.content.Intent;
import android.os.Bundle;
import android.os.Parcelable;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;

public class NotificationListener extends NotificationListenerService {

    private static final String TAG = "WP_SMS";
    public static final String NOTIF_ACTION = "com.wealthpulse.app.NOTIFICATION_RECEIVED";
    public static final String EXTRA_TEXT = "notif_text";

    // ── Known bank/UPI app package names ──
    private static final String[] BANK_PACKAGES = {
        "com.hdfc.netbanking",
        "com.hdfcbank.mobilebanking",
        "com.sbi.SBIFreedom",
        "com.msf.kony.sbi",
        "com.icicibank.mobilebanking",
        "com.icicibank.imobile",
        "com.icicibank",
        "com.axisbank.mobilebanking",
        "com.axisbank.axismobile",
        "com.kotak.mahindra.kotak",
        "com.kotak.mahindra.kobankMitra",
        "com.idbi.mobilebank",
        "com.indusind.mobilebanking",
        "com.yesbank",
        // UPI apps
        "net.one97.paytm",
        "com.phonepe.app",
        "com.google.android.apps.nbu.paisa.user",  // GPay
        "in.amazon.mshop.android.shopping",
        "com.amazon.avod.thirdpartyclient",
        "com.boi.digitalbank",
        "com.freecharge.android",
        "com.mobikwik_new",
        "com.cred.club",
        "com.dreamplug.androidapp",                // CRED
        // Messaging apps that carry bank OTPs / alerts
        "com.google.android.apps.messaging",
        "com.android.mms",
        "com.samsung.android.messaging",
        "org.telegram.messenger",
        "com.whatsapp",
    };

    // ── Financial keywords to filter non-financial notifications ──
    private static final String[] FINANCIAL_KEYWORDS = {
        "rs.", "rs ", "inr", "₹",
        "credited", "debited", "credit", "debit",
        "sent", "received", "paid", "payment",
        "a/c", "acct", "account",
        "upi", "imps", "neft", "rtgs",
        "balance", "avl bal",
        "txn", "transaction",
        "hdfc", "sbi", "icici", "axis", "kotak",
        "phonepe", "gpay", "paytm",
        "bank",
    };

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null) return;

        String packageName = sbn.getPackageName();

        // ── Step 1: Log every notification for debugging ──
        Log.d(TAG, "PKG: " + packageName);

        Notification notification = sbn.getNotification();
        if (notification == null) return;

        Bundle extras = notification.extras;
        if (extras == null) return;

        // ── Step 2: Extract all text candidates ──
        CharSequence title   = extras.getCharSequence(Notification.EXTRA_TITLE);
        CharSequence text    = extras.getCharSequence(Notification.EXTRA_TEXT);
        CharSequence bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT);
        String lastMessage   = extractLastMessage(extras);

        Log.d(TAG, "TITLE=" + title + " | TEXT=" + text + " | BIG=" + bigText + " | MSG=" + lastMessage);

        // Pick best candidate: message > bigText > text
        String candidate = "";
        if (lastMessage != null && !lastMessage.isEmpty()) {
            candidate = lastMessage;
        } else if (bigText != null && bigText.length() > 0) {
            candidate = bigText.toString();
        } else if (text != null && text.length() > 0) {
            candidate = text.toString();
        }

        if (candidate.isEmpty()) return;

        // Combine title + candidate for keyword check
        String fullText = (title != null ? title.toString() + " " : "") + candidate;

        // ── Step 3: Filter — must be from a known bank package OR contain financial keywords ──
        boolean isBankApp = isKnownBankPackage(packageName);
        boolean hasKeyword = hasFinancialKeyword(fullText);

        Log.d(TAG, "isBankApp=" + isBankApp + " hasKeyword=" + hasKeyword);

        if (!isBankApp && !hasKeyword) {
            Log.d(TAG, "SKIP (no match): " + fullText.substring(0, Math.min(fullText.length(), 80)));
            return;
        }

        // ── Step 4: Build payload — include title so JS parser has more context ──
        String toSend = (title != null && title.length() > 0 ? title.toString() + "\n" : "") + candidate;
        toSend = toSend.trim();

        Log.d(TAG, "MATCH → sending: " + toSend.substring(0, Math.min(toSend.length(), 100)));

        // ── Step 5: Broadcast to MainActivity ──
        Intent intent = new Intent(NOTIF_ACTION);
        intent.putExtra(EXTRA_TEXT, toSend);
        intent.setPackage(getPackageName());
        sendBroadcast(intent);
    }

    private String extractLastMessage(Bundle extras) {
        try {
            Parcelable[] messages = extras.getParcelableArray(Notification.EXTRA_MESSAGES);
            if (messages == null || messages.length == 0) return null;
            Parcelable last = messages[messages.length - 1];
            if (last instanceof Bundle) {
                CharSequence msgText = ((Bundle) last).getCharSequence("text");
                if (msgText != null) return msgText.toString();
            }
        } catch (Exception e) {
            Log.e(TAG, "extractLastMessage: " + e.getMessage());
        }
        return null;
    }

    private boolean isKnownBankPackage(String pkg) {
        if (pkg == null) return false;
        for (String p : BANK_PACKAGES) {
            if (pkg.equalsIgnoreCase(p)) return true;
        }
        return false;
    }

    private boolean hasFinancialKeyword(String text) {
        if (text == null) return false;
        String lower = text.toLowerCase();
        for (String kw : FINANCIAL_KEYWORDS) {
            if (lower.contains(kw)) return true;
        }
        return false;
    }
}
