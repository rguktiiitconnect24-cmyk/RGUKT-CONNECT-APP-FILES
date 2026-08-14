package com.rgukt.connect;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;
import com.rgukt.connect.R;

public class ActionsWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.actions_widget);

        // Home Action
        views.setOnClickPendingIntent(R.id.action_home, createPendingIntent(context, "/dashboard", 10));
        
        // Courses Action
        views.setOnClickPendingIntent(R.id.action_courses, createPendingIntent(context, "/courses", 11));
        
        // Timetable Action
        views.setOnClickPendingIntent(R.id.action_timetable, createPendingIntent(context, "/timetable", 12));
        
        // Profile Action
        views.setOnClickPendingIntent(R.id.action_profile, createPendingIntent(context, "/profile", 13));

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    private static PendingIntent createPendingIntent(Context context, String targetPage, int requestCode) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.putExtra("target_page", targetPage);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
