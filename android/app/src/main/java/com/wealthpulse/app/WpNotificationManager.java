package com.wealthpulse.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

/**
 * WpNotificationManager — fires all user-facing push alerts.
 *
 * Philosophy: non-irritating. Each alert fires at most once ever (budget)
 * or twice a day max (settlements). No repeat nagging.
 *
 * Channels:
 *   wp_txn_alerts   — pending SMS review     (HIGH — user initiated action needed)
 *   wp_budget       — budget limit hit once   (DEFAULT — informational)
 *   wp_settlements  — settlement reminders    (DEFAULT — gentle nudge)
 */
public class WpNotificationManager {

    public static final String CHAN_TXN    = "wp_txn_alerts";
    public static final String CHAN_BUDGET = "wp_budget";
    public static final String CHAN_SETTLE = "wp_settlements";

    public static final int ID_PENDING_SMS = 2001;
    public static final int ID_BUDGET_BASE = 2100; // +index per category
    public static final int ID_SETTLE_BASE = 2200; // +index per person

    public static void createChannels(Context ctx) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = ctx.getSystemService(NotificationManager.class);
        if (nm == null) return;

        // Transaction alerts — high priority, user needs to act
        NotificationChannel txn = new NotificationChannel(
                CHAN_TXN, "Transaction Alerts", NotificationManager.IMPORTANCE_HIGH);
        txn.setDescription("New bank transactions detected via SMS");
        nm.createNotificationChannel(txn);

        // Budget — default priority, fires once only
        NotificationChannel budget = new NotificationChannel(
                CHAN_BUDGET, "Budget Alerts", NotificationManager.IMPORTANCE_DEFAULT);
        budget.setDescription("Notifies once when a budget limit is reached");
        nm.createNotificationChannel(budget);

        // Settlements — default priority, max 2x/day
        NotificationChannel settle = new NotificationChannel(
                CHAN_SETTLE, "Settlement Reminders", NotificationManager.IMPORTANCE_DEFAULT);
        settle.setDescription("Gentle reminders about pending group settlements");
        nm.createNotificationChannel(settle);
    }

    private static PendingIntent mainIntent(Context ctx) {
        Intent i = new Intent(ctx, MainActivity.class);
        i.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(ctx, 0, i,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    // ── 1. Pending SMS ────────────────────────────────────────────
    // Updates badge count, cancels if nothing pending. High priority
    // because the user needs to review before data is lost.
    public static void firePendingSmsAlert(Context ctx, int count) {
        if (count <= 0) {
            cancel(ctx, ID_PENDING_SMS);
            return;
        }
        String title = count == 1
                ? "💸 1 transaction needs review"
                : "💸 " + count + " transactions need review";

        notify(ctx, ID_PENDING_SMS,
                new NotificationCompat.Builder(ctx, CHAN_TXN)
                        .setSmallIcon(R.mipmap.ic_launcher)
                        .setContentTitle(title)
                        .setContentText("Tap to categorize and add to your tracker")
                        .setNumber(count)
                        .setPriority(NotificationCompat.PRIORITY_HIGH)
                        .setAutoCancel(true)
                        .setOnlyAlertOnce(true) // no repeated sound/vibration on count update
                        .setContentIntent(mainIntent(ctx)));
    }

    // ── 2. Budget limit reached ───────────────────────────────────
    // Fires ONCE ever per category per month. No 80% warning — only
    // the moment the limit is crossed. Calm, factual, no alarm emoji.
    public static void fireBudgetLimitReached(Context ctx, int notifId,
                                              String catName, long spent, long limit) {
        notify(ctx, notifId,
                new NotificationCompat.Builder(ctx, CHAN_BUDGET)
                        .setSmallIcon(R.mipmap.ic_launcher)
                        .setContentTitle(catName + " budget reached")
                        .setContentText("₹" + spent + " spent — ₹" + limit + " was your limit")
                        .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                        .setAutoCancel(true)
                        .setContentIntent(mainIntent(ctx)));
    }

    // ── 3. Settlement reminder ────────────────────────────────────
    // Max 2 per day total (enforced in AlertsPlugin). No urgency
    // language — just a calm factual reminder.
    public static void fireSettlementReminder(Context ctx, int notifId,
                                              String personName, long amount,
                                              boolean youAreOwed) {
        String title = youAreOwed
                ? personName + " owes you ₹" + amount
                : "You owe " + personName + " ₹" + amount;

        notify(ctx, notifId,
                new NotificationCompat.Builder(ctx, CHAN_SETTLE)
                        .setSmallIcon(R.mipmap.ic_launcher)
                        .setContentTitle(title)
                        .setContentText("Tap to open Settle Up")
                        .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                        .setAutoCancel(true)
                        .setContentIntent(mainIntent(ctx)));
    }

    // ── Helpers ───────────────────────────────────────────────────
    private static void notify(Context ctx, int id, NotificationCompat.Builder b) {
        try {
            NotificationManagerCompat.from(ctx).notify(id, b.build());
        } catch (SecurityException e) {
            android.util.Log.w("WP_NOTIF", "Permission denied: " + e.getMessage());
        }
    }

    public static void cancel(Context ctx, int id) {
        NotificationManagerCompat.from(ctx).cancel(id);
    }
}
