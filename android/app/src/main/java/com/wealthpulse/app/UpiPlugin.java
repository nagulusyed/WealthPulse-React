package com.wealthpulse.app;

import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.List;

@CapacitorPlugin(name = "UpiPlugin")
public class UpiPlugin extends Plugin {

    private static final String TAG = "WP_UPI";

    @PluginMethod
    public void openUpi(PluginCall call) {
        String upiId = call.getString("upiId", "");
        String name  = call.getString("name", "");
        String note  = call.getString("note", "Payment");
        Double amount = call.getDouble("amount", 0.0);

        if (upiId == null || upiId.trim().isEmpty()) {
            call.reject("upiId is required");
            return;
        }

        // Trim note to 50 chars
        if (note != null && note.length() > 50) note = note.substring(0, 50);

        String uri = String.format(
            "upi://pay?pa=%s&pn=%s&am=%.2f&cu=INR&tn=%s",
            Uri.encode(upiId.trim()),
            Uri.encode(name != null ? name.trim() : ""),
            amount,
            Uri.encode(note != null ? note : "Payment")
        );

        Log.d(TAG, "UPI link: " + uri);

        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(uri));
            // Use FLAG_ACTIVITY_NEW_TASK so we can start from a non-Activity context
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            // Wrap in chooser — this strips WealthPulse's package from the intent
            // back stack, which bypasses PhonePe's calling-app security check
            Intent chooser = Intent.createChooser(intent, "Pay via UPI");
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            // Use getActivity() (the Bridge Activity) rather than getContext()
            // so the intent starts from a real Activity, not an Application context
            getActivity().startActivity(chooser);

            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);

        } catch (android.content.ActivityNotFoundException e) {
            Log.w(TAG, "No UPI app found: " + e.getMessage());
            call.reject("no_upi_app");
        } catch (Exception e) {
            Log.e(TAG, "UPI launch failed: " + e.getMessage());
            call.reject("launch_failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getInstalledUpiApps(PluginCall call) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("upi://pay?pa=test@upi&am=1&cu=INR"));
            PackageManager pm = getContext().getPackageManager();
            List<ResolveInfo> apps = pm.queryIntentActivities(intent, PackageManager.MATCH_ALL);

            JSArray result = new JSArray();
            if (apps != null) {
                for (ResolveInfo info : apps) {
                    JSObject app = new JSObject();
                    app.put("packageName", info.activityInfo.packageName);
                    app.put("label", info.loadLabel(pm).toString());
                    result.put(app);
                    Log.d(TAG, "Found UPI app: " + info.activityInfo.packageName);
                }
            }

            JSObject response = new JSObject();
            response.put("apps", result);
            call.resolve(response);
        } catch (Exception e) {
            Log.e(TAG, "getInstalledUpiApps failed: " + e.getMessage());
            call.reject("error: " + e.getMessage());
        }
    }
}
