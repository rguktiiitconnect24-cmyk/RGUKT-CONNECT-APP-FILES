package com.rgukt.connect;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.os.SystemClock;
import android.widget.RemoteViews;

public class TimetableWidgetProvider extends AppWidgetProvider {
    private static final String PREFS_NAME = "TimetableWidgetPrefs";

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        
        String currentTopic = prefs.getString("schedule_topic", "Loading...");
        String time = prefs.getString("schedule_time", "---");

        int minWidth = appWidgetManager.getAppWidgetOptions(appWidgetId).getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH);
        int minHeight = appWidgetManager.getAppWidgetOptions(appWidgetId).getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT);
        
        int layoutId;
        if (minHeight < 150) {
            layoutId = R.layout.widget_timetable_small;
        } else if (minHeight < 250) {
            layoutId = R.layout.widget_timetable_medium;
        } else {
            layoutId = R.layout.widget_timetable_large;
        }

        RemoteViews views = new RemoteViews(context.getPackageName(), layoutId);

        if (layoutId == R.layout.widget_timetable_small) {
            views.setTextViewText(R.id.tv_subject, currentTopic);
            views.setTextViewText(R.id.tv_room_time, "Room 205 • " + time);
            
            // Set chronometer to count down to 50 minutes from now for demonstration
            long baseTime = SystemClock.elapsedRealtime() + (50 * 60 * 1000); 
            views.setChronometer(R.id.chrono_countdown, baseTime, "%s", true);
            views.setChronometerCountDown(R.id.chrono_countdown, true);
            
            Intent intent = new Intent(context, MainActivity.class);
            intent.putExtra("target_page", "/timetable");
            PendingIntent pendingIntent = PendingIntent.getActivity(
                    context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            views.setOnClickPendingIntent(R.id.tv_subject, pendingIntent);
            views.setOnClickPendingIntent(R.id.ll_header, pendingIntent);
        } else {
            Intent serviceIntent = new Intent(context, TimetableViewsService.class);
            serviceIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
            serviceIntent.setData(Uri.parse(serviceIntent.toUri(Intent.URI_INTENT_SCHEME)));
            views.setRemoteAdapter(R.id.lv_timetable, serviceIntent);
            views.setEmptyView(R.id.lv_timetable, R.id.tv_view_all); // Simple fallback

            Intent clickIntent = new Intent(context, MainActivity.class);
            PendingIntent clickPendingIntent = PendingIntent.getActivity(
                    context, 0, clickIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);
            views.setPendingIntentTemplate(R.id.lv_timetable, clickPendingIntent);
            
            Intent viewAllIntent = new Intent(context, MainActivity.class);
            viewAllIntent.putExtra("target_page", "/timetable");
            PendingIntent pendingViewAll = PendingIntent.getActivity(
                    context, 1, viewAllIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            views.setOnClickPendingIntent(R.id.tv_view_all, pendingViewAll);
        }

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager appWidgetManager, int appWidgetId, Bundle newOptions) {
        updateAppWidget(context, appWidgetManager, appWidgetId);
        super.onAppWidgetOptionsChanged(context, appWidgetManager, appWidgetId, newOptions);
    }
}
