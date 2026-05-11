package com.wealthpulse.app;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.util.Log;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "WP_SMS";
    private static final int SMS_PERMISSION_REQUEST = 101;

    private BroadcastReceiver liveReceiver;
    private String pendingSharedText = null;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(BackgroundServicePlugin.class);
        registerPlugin(AlertsPlugin.class);
        super.onCreate(savedInstanceState);

        // Create notification channels early so they are ready before any alert fires
        WpNotificationManager.createChannels(this);

        handleIntent(getIntent());
        requestSmsPermissionsIfNeeded();

        boolean bgEnabled = getSharedPreferences("wp_prefs", 0).getBoolean("bg_service_enabled", true);
        if (bgEnabled) {
            startForegroundService();
        }

        // Live receiver — catches messages while app is in foreground
        liveReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String text = intent.getStringExtra("sms_text");
                if (text == null) text = intent.getStringExtra(NotificationListener.EXTRA_TEXT);

                if (text != null && !text.isEmpty()) {
                    Log.d(TAG, "Live broadcast received");
                    dispatchToWebView(text);
                }
            }
        };

        IntentFilter filter = new IntentFilter();
        filter.addAction(SmsReceiver.PREFS_NAME);
        filter.addAction(NotificationListener.NOTIF_ACTION);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(liveReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(liveReceiver, filter);
        }

        if (!isNotificationAccessGranted() && !hasSmsPermission()) {
            showNotificationAccessIfNeeded();
        }
    }

    @Override
    public void onResume() {
        super.onResume();

        getBridge().getWebView().postDelayed(() -> {
            String[] queued = SmsReceiver.drainQueue(this);
            for (String msg : queued) {
                Log.d(TAG, "Delivering queued SMS: " + msg.substring(0, Math.min(msg.length(), 60)));
                dispatchToWebView(msg);
            }
        }, 1200);

        if (pendingSharedText != null) {
            final String text = pendingSharedText;
            pendingSharedText = null;
            getBridge().getWebView().postDelayed(() -> dispatchToWebView(text), 1200);
        }
    }

    private void startForegroundService() {
        Intent serviceIntent = new Intent(this, ForegroundService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent);
        } else {
            startService(serviceIntent);
        }
    }

    private void requestSmsPermissionsIfNeeded() {
        boolean needsSms = !hasSmsPermission();
        boolean needsNotif = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
                ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED;

        if (!needsSms && !needsNotif) return;

        java.util.List<String> permissions = new java.util.ArrayList<>();
        if (needsSms) {
            permissions.add(Manifest.permission.RECEIVE_SMS);
            permissions.add(Manifest.permission.READ_SMS);
        }
        if (needsNotif) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS);
        }

        ActivityCompat.requestPermissions(this, permissions.toArray(new String[0]), SMS_PERMISSION_REQUEST);
    }

    private boolean hasSmsPermission() {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.RECEIVE_SMS)
                == PackageManager.PERMISSION_GRANTED;
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(requestCode, permissions, results);
        if (requestCode == SMS_PERMISSION_REQUEST) {
            boolean granted = results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED;
            Log.d(TAG, "SMS permission: " + (granted ? "GRANTED" : "DENIED"));
            if (!granted && !isNotificationAccessGranted()) showNotificationAccessIfNeeded();
        }
    }

    private void showNotificationAccessIfNeeded() {
        if (!isNotificationAccessGranted())
            startActivity(new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS));
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        if (intent == null) return;
        if (Intent.ACTION_SEND.equals(intent.getAction())) {
            String sharedText = intent.getStringExtra(Intent.EXTRA_TEXT);
            if (sharedText != null && !sharedText.isEmpty()) {
                pendingSharedText = sharedText;
            }
        }
    }

    public void dispatchToWebView(String text) {
        String escaped = text
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t")
                .replaceAll("[\\x00-\\x1F&&[^\\n\\r\\t]]", "");

        String js = "(function(){"
                + "var b=\"" + escaped + "\";"
                + "if(typeof window.wpReceiveSms==='function'){"
                + "  window.wpReceiveSms(b);"
                + "} else {"
                + "  window.dispatchEvent(new CustomEvent('wp_sms_test',{detail:{body:b}}));"
                + "}"
                + "})();";

        runOnUiThread(() -> {
            try {
                getBridge().eval(js, r -> Log.d(TAG, "eval done"));
            } catch (Exception e) {
                Log.e(TAG, "eval failed: " + e.getMessage());
            }
        });
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (liveReceiver != null) {
            try { unregisterReceiver(liveReceiver); } catch (Exception ignored) {}
        }
    }

    private boolean isNotificationAccessGranted() {
        String flat = Settings.Secure.getString(getContentResolver(), "enabled_notification_listeners");
        return flat != null && flat.contains(getPackageName());
    }
}
