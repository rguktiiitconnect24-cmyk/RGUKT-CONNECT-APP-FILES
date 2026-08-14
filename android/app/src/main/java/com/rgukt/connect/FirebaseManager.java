package com.rgukt.connect;

import androidx.annotation.NonNull;
import com.google.firebase.database.DataSnapshot;
import com.google.firebase.database.DatabaseError;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;

import com.google.firebase.database.ValueEventListener;

public class FirebaseManager {
    public interface FirebaseCallback {
        void onDataFetched(UpdateData data);
        void onError(String message);
    }

    public static void fetchUpdateData(FirebaseCallback callback) {
        // Explicitly specifying the database URL to ensure connection
        String dbUrl = "https://iiit-connect-d4b88-default-rtdb.firebaseio.com";
        DatabaseReference ref = FirebaseDatabase.getInstance(dbUrl).getReference("app_update");
        
        ref.addListenerForSingleValueEvent(new ValueEventListener() {
            @Override
            public void onDataChange(@NonNull DataSnapshot snapshot) {
                if (snapshot.exists()) {
                    UpdateData data = new UpdateData();
                    try {
                        Object lv = snapshot.child("latest_version").getValue();
                        data.latestVersion = lv != null ? Integer.parseInt(lv.toString()) : 0;
                        
                        data.appVersion = snapshot.child("app_version").getValue(String.class);
                        if (data.appVersion == null || data.appVersion.isEmpty()) {
                            data.appVersion = String.valueOf(data.latestVersion);
                        }
                        
                        data.apkUrl = snapshot.child("apk_url").getValue(String.class);
                        
                        Object fu = snapshot.child("force_update").getValue();
                        data.forceUpdate = fu != null && Boolean.parseBoolean(fu.toString());
                        
                        data.updateMessage = snapshot.child("update_message").getValue(String.class);
                        callback.onDataFetched(data);
                    } catch (Exception e) {
                        callback.onError("Data parsing error: " + e.getMessage());
                    }
                } else {
                    callback.onError("No update data found");
                }
            }

            @Override
            public void onCancelled(@NonNull DatabaseError error) {
                callback.onError(error.getMessage());
            }
        });
    }

    public static class UpdateData {
        public int latestVersion;
        public String appVersion;
        public String apkUrl;
        public boolean forceUpdate;
        public String updateMessage;
    }
}
