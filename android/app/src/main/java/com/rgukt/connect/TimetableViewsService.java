package com.rgukt.connect;

import android.content.Intent;
import android.widget.RemoteViewsService;

public class TimetableViewsService extends RemoteViewsService {
    @Override
    public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new TimetableViewsFactory(this.getApplicationContext(), intent);
    }
}
