package com.rgukt.connect;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.view.View;
import android.widget.RemoteViews;
import com.rgukt.connect.R;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class EventWidgetProvider extends AppWidgetProvider {

    private static final String PREFS_NAME = "SeatingWidgetPrefs";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        
        String count = prefs.getString("event_count", "0");
        String event1 = prefs.getString("event_1_title", "No events today");
        String time1 = prefs.getString("event_1_time", "");
        String event2 = prefs.getString("event_2_title", "");
        String time2 = prefs.getString("event_2_time", "");

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.event_widget);
        
        // Header
        String today = new SimpleDateFormat("EEE, MMM d", Locale.getDefault()).format(new Date());
        views.setTextViewText(R.id.widget_today_date, today);
        views.setTextViewText(R.id.widget_event_count, count + " Events");

        // Event 1
        views.setTextViewText(R.id.event_1_title, event1);
        views.setTextViewText(R.id.event_1_time, time1);
        
        // Event 2
        if (!event2.isEmpty()) {
            views.setViewVisibility(R.id.event_2_container, View.VISIBLE);
            views.setTextViewText(R.id.event_2_title, event2);
            views.setTextViewText(R.id.event_2_time, time2);
        } else {
            views.setViewVisibility(R.id.event_2_container, View.GONE);
        }

        // Click Intent
        Intent intent = new Intent(context, MainActivity.class);
        intent.putExtra("target_page", "/timetable");
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
