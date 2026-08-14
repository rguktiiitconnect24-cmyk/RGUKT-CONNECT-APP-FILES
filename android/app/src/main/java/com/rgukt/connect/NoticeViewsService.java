package com.rgukt.connect;

import android.content.Intent;
import android.widget.RemoteViewsService;

public class NoticeViewsService extends RemoteViewsService {
    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new NoticeViewsFactory(this.getApplicationContext(), intent);
    }
}
