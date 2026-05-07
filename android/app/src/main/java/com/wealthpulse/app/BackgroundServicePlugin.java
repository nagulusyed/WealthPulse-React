package com.wealthpulse.app;

import android.content.Intent;
import android.os.Build;
import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "BackgroundService")
public class BackgroundServicePlugin extends Plugin {

    @PluginMethod
    public void startService(PluginCall call) {
        Log.d("WP_PLUGIN", "Starting background service...");
        Intent serviceIntent = new Intent(getContext(), ForegroundService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(serviceIntent);
        } else {
            getContext().startService(serviceIntent);
        }
        
        // Save preference
        getContext().getSharedPreferences("wp_prefs", 0)
                .edit()
                .putBoolean("bg_service_enabled", true)
                .apply();
                
        JSObject ret = new JSObject();
        ret.put("status", "started");
        call.resolve(ret);
    }

    @PluginMethod
    public void stopService(PluginCall call) {
        Log.d("WP_PLUGIN", "Stopping background service via intent...");
        Intent serviceIntent = new Intent(getContext(), ForegroundService.class);
        serviceIntent.setAction(ForegroundService.ACTION_STOP);
        getContext().startService(serviceIntent);
        
        // Save preference
        getContext().getSharedPreferences("wp_prefs", 0)
                .edit()
                .putBoolean("bg_service_enabled", false)
                .apply();

        JSObject ret = new JSObject();
        ret.put("status", "stopped");
        call.resolve(ret);
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        boolean enabled = getContext().getSharedPreferences("wp_prefs", 0)
                .getBoolean("bg_service_enabled", true);
        JSObject ret = new JSObject();
        ret.put("enabled", enabled);
        call.resolve(ret);
    }
}
