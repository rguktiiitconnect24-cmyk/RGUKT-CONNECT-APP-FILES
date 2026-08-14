package com.rgukt.connect;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import com.rgukt.connect.R;
import android.widget.RemoteViews;

public class ComplaintsWidgetProvider extends AppWidgetProvider {

    private static final String PREFS_NAME = "SeatingWidgetPrefs";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        int total = prefs.getInt("complaints_total", 0);
        int resolved = prefs.getInt("complaints_resolved", 0);
        String lastStatus = prefs.getString("complaints_last_status", "Open App to sync");

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.complaints_widget);
        views.setTextViewText(R.id.widget_total_complaints, String.valueOf(total));
        views.setTextViewText(R.id.widget_resolved_complaints, String.valueOf(resolved));
        views.setTextViewText(R.id.widget_last_status, "Last Status: " + lastStatus);

        Intent intent = new Intent(context, MainActivity.class);
        intent.putExtra("target_page", "/complaints");
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        
        PendingIntent pendingIntent = PendingIntent.getActivity(
                context, 
                2, 
                intent, 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_container, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
