package com.wealthpulse.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

/**
 * AlertsPlugin — Capacitor bridge to WpNotificationManager.
 *
 * Rate limiting rules (non-irritating):
 *
 *   Budget:
 *     • Fires ONCE per category per month, only when pct >= 100
 *     • Never fires again for the same category in the same month
 *     • 80% warning removed — too noisy
 *
 *   Settlements:
 *     • Only fires if daysOld >= 3
 *     • Max 2 settlement notifications per day total (across all people)
 *     • Each person gets at most 1 reminder per day
 *     • Counter resets at midnight
 */
@CapacitorPlugin(name = "AlertsPlugin")
public class AlertsPlugin extends Plugin {

    private static final String TAG   = "WP_ALERTS";
    private static final String PREFS = "wp_alert_prefs";

    // Max settlement notifications allowed per day
    private static final int MAX_SETTLE_PER_DAY = 2;

    @Override
    public void load() {
        WpNotificationManager.createChannels(getContext());
        Log.d(TAG, "AlertsPlugin loaded");
    }

    // ── 1. Pending SMS badge ──────────────────────────────────────
    @PluginMethod
    public void syncPendingCount(PluginCall call) {
        int count = call.getInt("count", 0);
        WpNotificationManager.firePendingSmsAlert(getContext(), count);
        call.resolve(ok("count", count));
    }

    // ── 2. Budget — fires ONCE per category per month at 100% ────
    // Payload: { budgets: [ { name, pct, spent, limit, index } ] }
    @PluginMethod
    public void checkBudgets(PluginCall call) {
        try {
            JSArray budgets = call.getArray("budgets");
            if (budgets == null) { call.resolve(ok("fired", 0)); return; }

            SharedPreferences prefs = getContext()
                    .getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();
            String monthKey = getMonthKey();
            int fired = 0;

            for (int i = 0; i < budgets.length(); i++) {
                JSONObject b  = budgets.getJSONObject(i);
                String name   = b.optString("name", "Category");
                int pct       = b.optInt("pct", 0);
                long spent    = b.optLong("spent", 0);
                long limit    = b.optLong("limit", 0);
                int index     = b.optInt("index", i);
                int notifId   = WpNotificationManager.ID_BUDGET_BASE + index;

                // Only fire once per category per month, only at 100%+
                String firedKey = "budget_fired_" + name + "_" + monthKey;

                if (pct >= 100 && !prefs.getBoolean(firedKey, false)) {
                    WpNotificationManager.fireBudgetLimitReached(
                            getContext(), notifId, name, spent, limit);
                    editor.putBoolean(firedKey, true);
                    fired++;
                } else if (pct < 100) {
                    // Reset flag if they add income/delete transactions and go back under
                    editor.remove(firedKey);
                    WpNotificationManager.cancel(getContext(), notifId);
                }
            }

            editor.apply();
            Log.d(TAG, "checkBudgets: fired=" + fired);
            call.resolve(ok("fired", fired));

        } catch (Exception e) {
            Log.e(TAG, "checkBudgets: " + e.getMessage());
            call.reject("Error: " + e.getMessage());
        }
    }

    // ── 3. Settlements — max 2/day, once per person per day ──────
    // Payload: { settlements: [ { name, amount, daysOld, youAreOwed, index } ] }
    @PluginMethod
    public void checkSettlements(PluginCall call) {
        try {
            JSArray settlements = call.getArray("settlements");
            if (settlements == null) { call.resolve(ok("fired", 0)); return; }

            SharedPreferences prefs = getContext()
                    .getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();
            String todayKey = getTodayKey();

            // How many settlement notifications have already fired today?
            int firedTodayCount = prefs.getInt("settle_count_" + todayKey, 0);
            int fired = 0;

            for (int i = 0; i < settlements.length(); i++) {
                // Stop if we've hit the daily cap
                if (firedTodayCount >= MAX_SETTLE_PER_DAY) break;

                JSONObject s    = settlements.getJSONObject(i);
                String name     = s.optString("name", "Someone");
                long amount     = s.optLong("amount", 0);
                int daysOld     = s.optInt("daysOld", 0);
                boolean youOwed = s.optBoolean("youAreOwed", true);
                int index       = s.optInt("index", i);
                int notifId     = WpNotificationManager.ID_SETTLE_BASE + index;

                // Skip if not old enough to be a reminder
                if (daysOld < 3) {
                    WpNotificationManager.cancel(getContext(), notifId);
                    continue;
                }

                // One reminder per person per day
                String personKey = "settle_person_" + name + "_" + todayKey;
                if (prefs.getBoolean(personKey, false)) continue;

                WpNotificationManager.fireSettlementReminder(
                        getContext(), notifId, name, amount, youOwed);
                editor.putBoolean(personKey, true);
                firedTodayCount++;
                fired++;
            }

            // Persist updated daily count
            editor.putInt("settle_count_" + todayKey, firedTodayCount);
            editor.apply();

            Log.d(TAG, "checkSettlements: fired=" + fired + " total_today=" + firedTodayCount);
            call.resolve(ok("fired", fired));

        } catch (Exception e) {
            Log.e(TAG, "checkSettlements: " + e.getMessage());
            call.reject("Error: " + e.getMessage());
        }
    }

    // ── Helpers ───────────────────────────────────────────────────
    private JSObject ok(String key, Object val) {
        JSObject r = new JSObject();
        r.put("status", "ok");
        r.put(key, val);
        return r;
    }

    /** Returns "YYYY-MM" — used as budget monthly key */
    private String getMonthKey() {
        java.util.Calendar c = java.util.Calendar.getInstance();
        return c.get(java.util.Calendar.YEAR) + "-"
                + (c.get(java.util.Calendar.MONTH) + 1);
    }

    /** Returns "YYYY-MM-DD" — used as daily settlement key */
    private String getTodayKey() {
        java.util.Calendar c = java.util.Calendar.getInstance();
        return c.get(java.util.Calendar.YEAR) + "-"
                + (c.get(java.util.Calendar.MONTH) + 1) + "-"
                + c.get(java.util.Calendar.DAY_OF_MONTH);
    }
}
