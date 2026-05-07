package com.wealthpulse.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.telephony.SmsMessage;
import android.util.Log;

import org.json.JSONArray;

public class SmsReceiver extends BroadcastReceiver {

    private static final String TAG = "WP_SMS";
    static final String PREFS_NAME = "wp_sms_queue";
    static final String PREFS_KEY  = "pending_messages";

    private static final String[] BANK_SENDERS = {
        "hdfcbk", "hdfcbank", "hdfc",
        "sbiinb", "sbipsg", "sbi",
        "icicib", "icici",
        "axisbk", "axisbank",
        "kotakb", "kotak",
        "indbnk", "indusind",
        "yesbk", "yesbank",
        "idbibk",
        "phonepe", "gpay", "paytm", "amazonpay",
        "vm-", "bp-", "ad-",
    };

    private static final String[] TRANSACTION_MARKERS = {
        "credit alert", "sent rs", "sent inr",
        "debited", "credited", "dear customer",
        "your a/c", "rs.", "inr ", "₹",
    };

    @Override
    public void onReceive(Context context, Intent intent) {
        if (!"android.provider.Telephony.SMS_RECEIVED".equals(intent.getAction())) return;

        Bundle bundle = intent.getExtras();
        if (bundle == null) return;

        Object[] pdus = (Object[]) bundle.get("pdus");
        if (pdus == null || pdus.length == 0) return;

        String format = bundle.getString("format");
        StringBuilder fullBody = new StringBuilder();
        String sender = null;

        for (Object pdu : pdus) {
            SmsMessage msg = SmsMessage.createFromPdu((byte[]) pdu, format);
            if (msg == null) continue;
            if (sender == null) sender = msg.getOriginatingAddress();
            fullBody.append(msg.getMessageBody());
        }

        String body = fullBody.toString().trim();
        if (body.isEmpty()) return;

        Log.d(TAG, "SMS from [" + sender + "]: " + body.substring(0, Math.min(body.length(), 60)));

        if (!isKnownBankSender(sender) && !hasTransactionMarker(body)) {
            Log.d(TAG, "SKIP: " + sender);
            return;
        }

        // ── Save to queue — works whether app is open or not ──
        enqueue(context, body);

        // ── If app is running, also broadcast so it delivers immediately ──
        Intent fwd = new Intent(SmsReceiver.PREFS_NAME);
        fwd.putExtra("sms_text", body);
        fwd.setPackage(context.getPackageName());
        context.sendBroadcast(fwd);

        Log.d(TAG, "Queued + broadcast sent");
    }

    // ── Add message to the SharedPreferences JSON queue ──
    static void enqueue(Context context, String body) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String existing = prefs.getString(PREFS_KEY, "[]");
            JSONArray arr = new JSONArray(existing);
            arr.put(body);
            prefs.edit().putString(PREFS_KEY, arr.toString()).apply();
            Log.d("WP_SMS", "Queued. Total pending: " + arr.length());
        } catch (Exception e) {
            Log.e("WP_SMS", "enqueue error: " + e.getMessage());
        }
    }

    // ── Drain all queued messages, returns them as array ──
    static String[] drainQueue(Context context) {
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String existing = prefs.getString(PREFS_KEY, "[]");
            JSONArray arr = new JSONArray(existing);
            if (arr.length() == 0) return new String[0];

            String[] result = new String[arr.length()];
            for (int i = 0; i < arr.length(); i++) result[i] = arr.getString(i);

            // Clear queue after draining
            prefs.edit().putString(PREFS_KEY, "[]").apply();
            Log.d("WP_SMS", "Drained " + result.length + " message(s)");
            return result;
        } catch (Exception e) {
            Log.e("WP_SMS", "drainQueue error: " + e.getMessage());
            return new String[0];
        }
    }

    private boolean isKnownBankSender(String sender) {
        if (sender == null) return false;
        String lower = sender.toLowerCase();
        for (String s : BANK_SENDERS) {
            if (lower.contains(s)) return true;
        }
        return false;
    }

    private boolean hasTransactionMarker(String body) {
        String lower = body.toLowerCase().trim();
        for (String marker : TRANSACTION_MARKERS) {
            if (lower.startsWith(marker)) return true;
        }
        return false;
    }
}
