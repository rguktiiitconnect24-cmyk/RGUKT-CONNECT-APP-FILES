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

public class NoticeViewsFactory implements RemoteViewsService.RemoteViewsFactory {
    private Context context;
    private List<Notice> noticeList = new ArrayList<>();
    private static final String PREFS_NAME = "NoticeWidgetPrefs";

    public NoticeViewsFactory(Context context, Intent intent) {
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
        noticeList.clear();
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String noticesJson = prefs.getString("notices_json", "[]");
        try {
            JSONArray array = new JSONArray(noticesJson);
            for (int i = 0; i < array.length(); i++) {
                JSONObject obj = array.getJSONObject(i);
                noticeList.add(new Notice(
                        obj.getString("title"),
                        obj.getString("time"),
                        obj.getString("priority")
                ));
            }
        } catch (JSONException e) {
            e.printStackTrace();
        }
        
        // Add fake data if empty for demonstration of Premium UI
        if (noticeList.isEmpty()) {
            noticeList.add(new Notice("Mid Examination Schedule for all years announced", "5 min ago", "urgent"));
            noticeList.add(new Notice("Hostel Fee Payment Deadline Extended", "2 hours ago", "important"));
            noticeList.add(new Notice("Campus Placement Drive: TCS Registration", "1 day ago", "normal"));
        }
    }

    @Override
    public void onDestroy() {
        noticeList.clear();
    }

    @Override
    public int getCount() {
        return noticeList.size();
    }

    @Override
    public RemoteViews getViewAt(int position) {
        if (position >= noticeList.size()) return null;
        Notice notice = noticeList.get(position);

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_notice_list_item);
        views.setTextViewText(R.id.tv_notice_title, notice.title);
        views.setTextViewText(R.id.tv_notice_time, notice.time);

        int priorityResource = R.drawable.widget_priority_blue;
        if ("urgent".equals(notice.priority)) priorityResource = R.drawable.widget_priority_red;
        else if ("important".equals(notice.priority)) priorityResource = R.drawable.widget_priority_orange;
        else if ("info".equals(notice.priority)) priorityResource = R.drawable.widget_priority_green;

        views.setInt(R.id.v_priority_strip, "setBackgroundResource", priorityResource);

        Intent fillInIntent = new Intent();
        fillInIntent.putExtra("target_page", "/notices");
        views.setOnClickFillInIntent(R.id.tv_notice_title, fillInIntent);

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

    private static class Notice {
        String title, time, priority;
        Notice(String t, String tm, String p) { title = t; time = tm; priority = p; }
    }
}
