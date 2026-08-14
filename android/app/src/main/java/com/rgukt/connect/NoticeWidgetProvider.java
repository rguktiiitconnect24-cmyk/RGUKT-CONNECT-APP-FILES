package com.rgukt.connect;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.widget.RemoteViews;

public class NoticeWidgetProvider extends AppWidgetProvider {
    private static final String PREFS_NAME = "NoticeWidgetPrefs";

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        
        String title = prefs.getString("latest_notice_title", "Loading...");
        String time = prefs.getString("latest_notice_time", "---");
        int count = prefs.getInt("unread_count", 0);

        int minWidth = appWidgetManager.getAppWidgetOptions(appWidgetId).getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH);
        int minHeight = appWidgetManager.getAppWidgetOptions(appWidgetId).getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT);
        
        int layoutId;
        if (minHeight < 150) {
            layoutId = R.layout.widget_notice_small;
        } else if (minHeight < 250) {
            layoutId = R.layout.widget_notice_medium;
        } else {
            layoutId = R.layout.widget_notice_large;
        }

        RemoteViews views = new RemoteViews(context.getPackageName(), layoutId);

        if (layoutId == R.layout.widget_notice_small) {
            views.setTextViewText(R.id.tv_unread_badge, count + " NEW");
            views.setTextViewText(R.id.tv_notice_title, title);
            views.setTextViewText(R.id.tv_notice_time, time);
            
            Intent intent = new Intent(context, MainActivity.class);
            intent.putExtra("target_page", "/notices");
            PendingIntent pendingIntent = PendingIntent.getActivity(
                    context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            views.setOnClickPendingIntent(R.id.tv_notice_title, pendingIntent);
            views.setOnClickPendingIntent(R.id.ll_header, pendingIntent);
        } else {
            Intent serviceIntent = new Intent(context, NoticeViewsService.class);
            serviceIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
            serviceIntent.setData(Uri.parse(serviceIntent.toUri(Intent.URI_INTENT_SCHEME)));
            views.setRemoteAdapter(R.id.lv_notices, serviceIntent);
            views.setEmptyView(R.id.lv_notices, R.id.tv_view_all); // Simple fallback

            Intent clickIntent = new Intent(context, MainActivity.class);
            PendingIntent clickPendingIntent = PendingIntent.getActivity(
                    context, 0, clickIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);
            views.setPendingIntentTemplate(R.id.lv_notices, clickPendingIntent);
            
            Intent viewAllIntent = new Intent(context, MainActivity.class);
            viewAllIntent.putExtra("target_page", "/notices");
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
