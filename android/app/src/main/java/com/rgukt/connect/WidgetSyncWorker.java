package com.rgukt.connect;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.firestore.QueryDocumentSnapshot;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class WidgetSyncWorker extends Worker {

    public WidgetSyncWorker(@NonNull Context context, @NonNull WorkerParameters workerParams) {
        super(context, workerParams);
    }

    @NonNull
    @Override
    public Result doWork() {
        FirebaseFirestore db = FirebaseFirestore.getInstance();
        
        try {
            // Fetch Notices
            db.collection("notices")
                .orderBy("timestamp", com.google.firebase.firestore.Query.Direction.DESCENDING)
                .limit(5)
                .get()
                .addOnSuccessListener(queryDocumentSnapshots -> {
                    try {
                        JSONArray noticesArray = new JSONArray();
                        int unreadCount = 0;
                        for (QueryDocumentSnapshot doc : queryDocumentSnapshots) {
                            JSONObject notice = new JSONObject();
                            notice.put("title", doc.getString("title"));
                            notice.put("time", "Recently");
                            notice.put("priority", doc.getString("priority") != null ? doc.getString("priority") : "normal");
                            noticesArray.put(notice);
                            unreadCount++;
                        }
                        
                        SharedPreferences prefs = getApplicationContext().getSharedPreferences("NoticeWidgetPrefs", Context.MODE_PRIVATE);
                        prefs.edit()
                            .putString("notices_json", noticesArray.toString())
                            .putInt("unread_count", unreadCount)
                            .putString("latest_notice_title", noticesArray.length() > 0 ? noticesArray.getJSONObject(0).getString("title") : "No new notices")
                            .putString("latest_notice_time", "Just now")
                            .apply();
                            
                        // Trigger Widget Update
                        triggerWidgetUpdate(NoticeWidgetProvider.class);
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                });
                
            return Result.success();
        } catch (Exception e) {
            e.printStackTrace();
            return Result.failure();
        }
    }
    
    private void triggerWidgetUpdate(Class<?> providerClass) {
        Intent intent = new Intent(getApplicationContext(), providerClass);
        intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        int[] ids = AppWidgetManager.getInstance(getApplicationContext())
                .getAppWidgetIds(new ComponentName(getApplicationContext(), providerClass));
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
        getApplicationContext().sendBroadcast(intent);
    }
}
