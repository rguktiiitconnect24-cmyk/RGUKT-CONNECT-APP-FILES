package com.rgukt.connect;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import com.rgukt.connect.R;
import android.widget.RemoteViews;

public class ScheduleWidgetProvider extends AppWidgetProvider {

    private static final String PREFS_NAME = "SeatingWidgetPrefs";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String topic = prefs.getString("schedule_topic", "Open App to sync");
        String time = prefs.getString("schedule_time", "---");
        String next = prefs.getString("schedule_next", "Check timetable");

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.schedule_widget);
        views.setTextViewText(R.id.widget_current_topic, topic);
        views.setTextViewText(R.id.widget_time, time);
        views.setTextViewText(R.id.widget_next_class, next);

        Intent intent = new Intent(context, MainActivity.class);
        intent.putExtra("target_page", "/timetable");
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        
        PendingIntent pendingIntent = PendingIntent.getActivity(
                context, 
                1, 
                intent, 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_container, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
