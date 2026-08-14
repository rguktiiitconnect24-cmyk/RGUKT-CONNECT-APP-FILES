package com.rgukt.connect;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.util.Log;

public class UpdateChecker {
    private static final String TAG = "UpdateChecker";
    private static boolean isCheckedThisSession = false;
    private final Activity activity;

    public UpdateChecker(Activity activity) {
        this.activity = activity;
    }

    public void checkForUpdates() {
        SharedPreferences prefs = activity.getSharedPreferences("app_update_prefs", Context.MODE_PRIVATE);
        int lastSeenVersion = prefs.getInt("last_seen_version", 0);

        FirebaseManager.fetchUpdateData(new FirebaseManager.FirebaseCallback() {
            @Override
            public void onDataFetched(FirebaseManager.UpdateData data) {
                int currentVersion = getCurrentVersionCode();
                
                activity.runOnUiThread(() -> {
                    if (currentVersion < data.latestVersion) {
                        if (data.forceUpdate) {
                            // Force update: ALWAYS show, ignore if they've seen it before
                            new UpdateDialog(activity, data).show();
                        } else if (data.latestVersion > lastSeenVersion) {
                            // Optional update: Only show if they haven't seen this specific version yet
                            new UpdateDialog(activity, data).show();
                            prefs.edit().putInt("last_seen_version", data.latestVersion).apply();
                        }
                    }
                });
            }

            @Override
            public void onError(String message) {
                Log.e(TAG, "Update check failed: " + message);
                // Removed toast to prevent showing the error to the user
            }
        });
    }

    private int getCurrentVersionCode() {
        try {
            PackageInfo pInfo = activity.getPackageManager().getPackageInfo(activity.getPackageName(), 0);
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
                return (int) pInfo.getLongVersionCode();
            } else {
                return pInfo.versionCode;
            }
        } catch (PackageManager.NameNotFoundException e) {
            e.printStackTrace();
            return -1;
        }
    }
}
