package com.rgukt.connect;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "Widget")
public class WidgetPlugin extends Plugin {

    private static final String PREFS_NAME = "SeatingWidgetPrefs";

    @PluginMethod
    public void updateSeatingData(PluginCall call) {
        String id = call.getString("id", "---");
        String name = call.getString("name", "Search seating");
        String sp = call.getString("sp", "--");
        String hall = call.getString("hall", "---");
        String subject = call.getString("subject", "No subject");

        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        editor.putString("student_id", id);
        editor.putString("student_name", name);
        editor.putString("seating_position", sp);
        editor.putString("exam_hall", hall);
        editor.putString("exam_subject", subject);
        editor.apply();

        updateWidget(SeatingWidgetProvider.class);
        call.resolve();
    }

    @PluginMethod
    public void updateScheduleData(PluginCall call) {
        String currentTopic = call.getString("topic", "No Class");
        String time = call.getString("time", "---");
        String nextClass = call.getString("next", "Finished for today");

        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        editor.putString("schedule_topic", currentTopic);
        editor.putString("schedule_time", time);
        editor.putString("schedule_next", nextClass);
        editor.apply();

        updateWidget(ScheduleWidgetProvider.class);
        call.resolve();
    }

    @PluginMethod
    public void updateComplaintsData(PluginCall call) {
        Integer total = call.getInt("total", 0);
        Integer resolved = call.getInt("resolved", 0);
        String lastStatus = call.getString("lastStatus", "None");

        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        editor.putInt("complaints_total", total);
        editor.putInt("complaints_resolved", resolved);
        editor.putString("complaints_last_status", lastStatus);
        editor.apply();

        updateWidget(ComplaintsWidgetProvider.class);
        call.resolve();
    }

    @PluginMethod
    public void updateProfileData(PluginCall call) {
        String name = call.getString("name", "Guest Student");
        String id = call.getString("id", "R000000");

        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        editor.putString("user_name", name);
        editor.putString("user_id", id);
        editor.apply();

        updateWidget(ProfileWidgetProvider.class);
        call.resolve();
    }

    @PluginMethod
    public void updateEventsData(PluginCall call) {
        String count = call.getString("count", "0");
        String event1 = call.getString("event1", "");
        String time1 = call.getString("time1", "");
        String event2 = call.getString("event2", "");
        String time2 = call.getString("time2", "");

        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        editor.putString("event_count", count);
        editor.putString("event_1_title", event1);
        editor.putString("event_1_time", time1);
        editor.putString("event_2_title", event2);
        editor.putString("event_2_time", time2);
        editor.apply();

        updateWidget(EventWidgetProvider.class);
        call.resolve();
    }

    private void updateWidget(Class<?> providerClass) {
        Intent intent = new Intent(getContext(), providerClass);
        intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        int[] ids = AppWidgetManager.getInstance(getContext())
                .getAppWidgetIds(new ComponentName(getContext(), providerClass));
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
        getContext().sendBroadcast(intent);
    }
}
