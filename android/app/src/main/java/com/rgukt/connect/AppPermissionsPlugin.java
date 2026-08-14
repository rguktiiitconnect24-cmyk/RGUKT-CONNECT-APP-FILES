package com.rgukt.connect;

import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

@CapacitorPlugin(
    name = "AppPermissions",
    permissions = {
        @Permission(
            alias = "notifications",
            strings = { "android.permission.POST_NOTIFICATIONS" }
        ),
        @Permission(
            alias = "storage33",
            strings = { 
                "android.permission.READ_MEDIA_IMAGES", 
                "android.permission.READ_MEDIA_VIDEO", 
                "android.permission.READ_MEDIA_AUDIO" 
            }
        ),
        @Permission(
            alias = "storage",
            strings = { 
                "android.permission.READ_EXTERNAL_STORAGE", 
                "android.permission.WRITE_EXTERNAL_STORAGE" 
            }
        )
    }
)
public class AppPermissionsPlugin extends Plugin {

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        Uri uri = Uri.fromParts("package", getContext().getPackageName(), null);
        intent.setData(uri);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }
}
