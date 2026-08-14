package com.rgukt.connect;

import android.app.Activity;
import android.app.DownloadManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.widget.Toast;

import androidx.core.content.FileProvider;

import java.io.File;

public class ApkDownloader {
    private static final String TAG = "ApkDownloader";
    private final Activity activity;
    private final String url;
    private final String version;
    private long downloadId = -1;
    private DownloadManager downloadManager;
    private BroadcastReceiver onCompleteReceiver;
    private Handler progressHandler;
    private Runnable progressRunnable;
    private DownloadListener listener;

    public interface DownloadListener {
        void onProgress(int progress);
        void onSuccess(File apkFile);
        void onError(String message);
    }

    public ApkDownloader(Activity activity, String url, String version) {
        this.activity = activity;
        this.url = url;
        this.version = version;
        this.downloadManager = (DownloadManager) activity.getSystemService(Context.DOWNLOAD_SERVICE);
    }

    public void startDownload(DownloadListener listener) {
        this.listener = listener;

        try {
            Uri downloadUri = Uri.parse(url);
            String fileName = "RGUKT_Connect_v" + version + ".apk";

            DownloadManager.Request request = new DownloadManager.Request(downloadUri);
            request.setTitle("Updating RGUKT Connect");
            request.setDescription("Downloading version " + version);
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setMimeType("application/vnd.android.package-archive");
            
            // Delete existing file to prevent DownloadManager from appending -1, -2, etc.
            File destFile = new File(activity.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), fileName);
            if (destFile.exists()) {
                destFile.delete();
            }

            // Save to external files dir (Download)
            request.setDestinationInExternalFilesDir(activity, Environment.DIRECTORY_DOWNLOADS, fileName);

            downloadId = downloadManager.enqueue(request);

            registerReceiver();
            startProgressTracking();
        } catch (Exception e) {
            Log.e(TAG, "Download failed to start", e);
            if (listener != null) listener.onError("Failed to start download");
        }
    }

    private void registerReceiver() {
        onCompleteReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1);
                if (id == downloadId) {
                    stopProgressTracking();
                    handleDownloadComplete();
                }
            }
        };
        
        IntentFilter filter = new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            activity.registerReceiver(onCompleteReceiver, filter, Context.RECEIVER_EXPORTED);
        } else {
            activity.registerReceiver(onCompleteReceiver, filter);
        }
    }

    private void handleDownloadComplete() {
        DownloadManager.Query query = new DownloadManager.Query();
        query.setFilterById(downloadId);
        Cursor cursor = downloadManager.query(query);

        if (cursor != null && cursor.moveToFirst()) {
            int statusIndex = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS);
            int status = cursor.getInt(statusIndex);

            if (status == DownloadManager.STATUS_SUCCESSFUL) {
                int uriIndex = cursor.getColumnIndex(DownloadManager.COLUMN_LOCAL_URI);
                String downloadedUriString = cursor.getString(uriIndex);
                if (downloadedUriString != null) {
                    Uri downloadedUri = Uri.parse(downloadedUriString);
                    File file = new File(downloadedUri.getPath());
                    if (listener != null) listener.onSuccess(file);
                    // installApk(file) is intentionally omitted to let UpdateDialog handle the 3s countdown
                } else {
                    if (listener != null) listener.onError("File path not found");
                }
            } else {
                if (listener != null) listener.onError("Download failed");
            }
            cursor.close();
        }
        
        // Unregister receiver safely
        try {
            if (onCompleteReceiver != null) {
                activity.unregisterReceiver(onCompleteReceiver);
                onCompleteReceiver = null;
            }
        } catch (Exception ignored) {}
    }

    private void startProgressTracking() {
        progressHandler = new Handler(Looper.getMainLooper());
        progressRunnable = new Runnable() {
            @Override
            public void run() {
                DownloadManager.Query query = new DownloadManager.Query();
                query.setFilterById(downloadId);
                Cursor cursor = downloadManager.query(query);
                
                if (cursor != null && cursor.moveToFirst()) {
                    int bytesDownloadedIndex = cursor.getColumnIndex(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR);
                    int bytesTotalIndex = cursor.getColumnIndex(DownloadManager.COLUMN_TOTAL_SIZE_BYTES);
                    
                    if (bytesDownloadedIndex >= 0 && bytesTotalIndex >= 0) {
                        long bytesDownloaded = cursor.getLong(bytesDownloadedIndex);
                        long bytesTotal = cursor.getLong(bytesTotalIndex);
                        
                        if (bytesTotal > 0) {
                            int progress = (int) ((bytesDownloaded * 100L) / bytesTotal);
                            if (listener != null) listener.onProgress(progress);
                        }
                    }
                    cursor.close();
                }
                
                // Poll every 500ms
                if (progressHandler != null) {
                    progressHandler.postDelayed(this, 500);
                }
            }
        };
        progressHandler.post(progressRunnable);
    }

    private void stopProgressTracking() {
        if (progressHandler != null && progressRunnable != null) {
            progressHandler.removeCallbacks(progressRunnable);
            progressHandler = null;
        }
    }

    public void installApk(File apkFile) {
        try {
            Uri apkUri = FileProvider.getUriForFile(activity, activity.getPackageName() + ".fileprovider", apkFile);
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION);
            activity.startActivity(intent);
        } catch (Exception e) {
            Log.e(TAG, "Failed to start install intent", e);
            activity.runOnUiThread(() -> Toast.makeText(activity, "Could not start installer. Please install manually from Downloads.", Toast.LENGTH_LONG).show());
        }
    }
}
