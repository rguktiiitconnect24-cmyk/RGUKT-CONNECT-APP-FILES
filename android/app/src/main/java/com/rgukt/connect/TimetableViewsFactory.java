package com.rgukt.connect;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class TimetableViewsFactory implements RemoteViewsService.RemoteViewsFactory {
    private Context context;
    private List<TimetableClass> classList = new ArrayList<>();
    private static final String PREFS_NAME = "TimetableWidgetPrefs";

    public TimetableViewsFactory(Context context, Intent intent) {
        this.context = context;
    }

    @Override
    public void onCreate() {
        fetchData();
    }

    @Override
    public void onDataSetChanged() {
        fetchData();
    }

    private void fetchData() {
        classList.clear();
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String timetableJson = prefs.getString("timetable_json", "[]");
        try {
            JSONArray array = new JSONArray(timetableJson);
            for (int i = 0; i < array.length(); i++) {
                JSONObject obj = array.getJSONObject(i);
                classList.add(new TimetableClass(
                        obj.getString("subject"),
                        obj.getString("time"),
                        obj.getString("status") // current, upcoming, completed, cancelled
                ));
            }
        } catch (JSONException e) {
            e.printStackTrace();
        }
        
        // Add fake data if empty for demonstration of Premium UI
        if (classList.isEmpty()) {
            classList.add(new TimetableClass("Physics", "8:30 AM", "completed"));
            classList.add(new TimetableClass("Mathematics", "9:30 AM", "current"));
            classList.add(new TimetableClass("Data Structures", "10:30 AM", "upcoming"));
            classList.add(new TimetableClass("Chemistry Lab", "1:30 PM", "upcoming"));
        }
    }

    @Override
    public void onDestroy() {
        classList.clear();
    }

    @Override
    public int getCount() {
        return classList.size();
    }

    @Override
    public RemoteViews getViewAt(int position) {
        if (position >= classList.size()) return null;
        TimetableClass cls = classList.get(position);

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_timetable_list_item);
        views.setTextViewText(R.id.tv_class_title, cls.subject);
        views.setTextViewText(R.id.tv_class_time, cls.time);

        int statusResource = R.drawable.widget_priority_blue; // Upcoming
        if ("current".equals(cls.status)) statusResource = R.drawable.widget_priority_green;
        else if ("completed".equals(cls.status)) statusResource = R.drawable.widget_priority_orange; // or gray
        else if ("cancelled".equals(cls.status)) statusResource = R.drawable.widget_priority_red;
        else if ("exam".equals(cls.status)) statusResource = R.drawable.widget_priority_purple;
        else if ("assignment".equals(cls.status)) statusResource = R.drawable.widget_priority_amber;

        views.setInt(R.id.v_timeline_dot, "setBackgroundResource", statusResource);

        Intent fillInIntent = new Intent();
        fillInIntent.putExtra("target_page", "/timetable");
        views.setOnClickFillInIntent(R.id.tv_class_title, fillInIntent);

        return views;
    }

    @Override
    public RemoteViews getLoadingView() {
        return null;
    }

    @Override
    public int getViewTypeCount() {
        return 1;
    }

    @Override
    public long getItemId(int position) {
        return position;
    }

    @Override
    public boolean hasStableIds() {
        return true;
    }

    private static class TimetableClass {
        String subject, time, status;
        TimetableClass(String s, String t, String st) { subject = s; time = t; status = st; }
    }
}
