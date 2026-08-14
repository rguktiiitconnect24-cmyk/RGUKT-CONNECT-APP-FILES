package com.rgukt.connect;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;
import com.rgukt.connect.R;

public class ProfileWidgetProvider extends AppWidgetProvider {

    private static final String PREFS_NAME = "SeatingWidgetPrefs";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String name = prefs.getString("user_name", "Open App to Login");
        String id = prefs.getString("user_id", "ID: ---");

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.profile_widget);
        views.setTextViewText(R.id.widget_profile_name, name);
        views.setTextViewText(R.id.widget_profile_id, id.startsWith("ID:") ? id : "ID: " + id);

        Intent intent = new Intent(context, MainActivity.class);
        intent.putExtra("target_page", "/profile");
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        
        PendingIntent pendingIntent = PendingIntent.getActivity(
                context, 
                20, 
                intent, 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_container, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
