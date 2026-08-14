package com.rgukt.connect;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import com.rgukt.connect.R;
import android.widget.RemoteViews;

public class SeatingWidgetProvider extends AppWidgetProvider {

    private static final String PREFS_NAME = "SeatingWidgetPrefs";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String id = prefs.getString("student_id", "---");
        String name = prefs.getString("student_name", "Search seating in app");
        String sp = prefs.getString("seating_position", "--");
        String hall = prefs.getString("exam_hall", "---");
        String subject = prefs.getString("exam_subject", "No subject set");

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.seating_widget);
        views.setTextViewText(R.id.widget_student_id, id);
        views.setTextViewText(R.id.widget_student_name, name);
        views.setTextViewText(R.id.widget_sp, sp);
        views.setTextViewText(R.id.widget_hall, hall);
        views.setTextViewText(R.id.widget_subject, subject);

        // Intent to launch app when clicking the widget
        Intent intent = new Intent(context, MainActivity.class);
        intent.putExtra("target_page", "/exams"); // Target page for Seating widget
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        
        PendingIntent pendingIntent = PendingIntent.getActivity(
                context, 
                0, 
                intent, 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_container, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
