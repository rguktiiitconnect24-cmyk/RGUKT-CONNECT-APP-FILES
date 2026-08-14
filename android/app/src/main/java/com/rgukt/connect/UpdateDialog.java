package com.rgukt.connect;

import android.app.Activity;
import android.app.Dialog;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.view.animation.OvershootInterpolator;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import java.io.File;

public class UpdateDialog {
    private final Activity activity;
    private final FirebaseManager.UpdateData data;
    private Dialog dialog;
    private boolean isDownloading = false;
    
    // UI Elements
    private Button btnUpdate;
    private Button btnLater;
    private Button btnRedownload;
    private LinearLayout progressLayout;
    private ProgressBar progressBar;
    private TextView tvProgress;
    private TextView tvProgressStatus;
    private TextView tvCountdown;
    private ApkDownloader downloader;
    private File existingApk;

    public UpdateDialog(Activity activity, FirebaseManager.UpdateData data) {
        this.activity = activity;
        this.data = data;
    }

    public void show() {
        dialog = new Dialog(activity, android.R.style.Theme_DeviceDefault_Light_NoActionBar_Fullscreen);
        dialog.requestWindowFeature(Window.FEATURE_NO_TITLE);
        
        View view = LayoutInflater.from(activity).inflate(R.layout.update_fullscreen, null);
        dialog.setContentView(view);
        
        Window window = dialog.getWindow();
        if (window != null) {
            window.setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT);
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            window.setStatusBarColor(0xFFFFFFFF);
        }

        TextView tvTitle = view.findViewById(R.id.tvTitle);
        TextView tvVersion = view.findViewById(R.id.tvVersion);
        TextView tvMessage = view.findViewById(R.id.tvMessage);
        
        btnUpdate = view.findViewById(R.id.btnUpdate);
        btnLater = view.findViewById(R.id.btnLater);
        btnRedownload = view.findViewById(R.id.btnRedownload);
        
        progressLayout = view.findViewById(R.id.progressLayout);
        progressBar = view.findViewById(R.id.progressBar);
        tvProgress = view.findViewById(R.id.tvProgress);
        tvProgressStatus = view.findViewById(R.id.tvProgressStatus);
        tvCountdown = view.findViewById(R.id.tvCountdown);

        tvVersion.setText("Version " + data.appVersion);
        tvMessage.setText(data.updateMessage);

        if (data.forceUpdate) {
            btnLater.setVisibility(View.GONE);
            dialog.setCancelable(false);
        }

        existingApk = new File(activity.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "RGUKT_Connect_v" + data.latestVersion + ".apk");
        boolean isValidApk = false;
        
        if (existingApk.exists()) {
            android.content.pm.PackageInfo info = activity.getPackageManager().getPackageArchiveInfo(existingApk.getAbsolutePath(), 0);
            if (info != null) {
                isValidApk = true;
            } else {
                existingApk.delete();
            }
        }
        
        downloader = new ApkDownloader(activity, data.apkUrl, String.valueOf(data.latestVersion));
        
        if (isValidApk) {
            setupInstallState();
        } else {
            setupDownloadState();
        }

        btnLater.setOnClickListener(v -> dialog.dismiss());
        dialog.show();
    }
    
    private void setupInstallState() {
        btnUpdate.setText("Install Update");
        btnRedownload.setVisibility(View.VISIBLE);
        
        btnUpdate.setOnClickListener(v -> downloader.installApk(existingApk));
        
        btnRedownload.setOnClickListener(v -> {
            if (existingApk.exists()) {
                existingApk.delete();
            }
            btnRedownload.setVisibility(View.GONE);
            setupDownloadState();
        });
    }
    
    private void setupDownloadState() {
        btnUpdate.setText("Download Update");
        btnUpdate.setOnClickListener(v -> startDownloadFlow());
    }
    
    private void startDownloadFlow() {
        if (isDownloading) return;
        isDownloading = true;
        dialog.setCancelable(false);
        btnLater.setVisibility(View.GONE);
        btnRedownload.setVisibility(View.GONE);
        
        btnUpdate.setVisibility(View.GONE);
        progressLayout.setVisibility(View.VISIBLE);
        tvCountdown.setVisibility(View.GONE);
        
        downloader.startDownload(new ApkDownloader.DownloadListener() {
            @Override
            public void onProgress(int progress) {
                activity.runOnUiThread(() -> {
                    progressBar.setProgress(progress);
                    tvProgress.setText(progress + "%");
                    if (progress == 100) {
                        tvProgressStatus.setText("Finalizing...");
                    }
                });
            }

            @Override
            public void onSuccess(File apkFile) {
                activity.runOnUiThread(() -> {
                    // Update state to downloaded
                    existingApk = apkFile;
                    isDownloading = false;
                    
                    // Keep progress bar at 100% during the countdown
                    progressBar.setProgress(100);
                    tvProgress.setText("100%");
                    tvProgressStatus.setText("Update Downloaded");
                    
                    tvCountdown.setVisibility(View.VISIBLE);
                    
                    Handler handler = new Handler(Looper.getMainLooper());
                    
                    // Animate countdown 3
                    animateCountdownText("3");
                    
                    handler.postDelayed(() -> animateCountdownText("2"), 1000);
                    handler.postDelayed(() -> animateCountdownText("1"), 2000);
                    handler.postDelayed(() -> {
                        tvCountdown.setVisibility(View.GONE);
                        progressLayout.setVisibility(View.GONE); // Hide it now to make room for buttons
                        btnUpdate.setVisibility(View.VISIBLE);
                        
                        setupInstallState();
                        
                        // Reveal animation
                        btnUpdate.setAlpha(0f);
                        btnUpdate.setScaleX(0.8f);
                        btnUpdate.setScaleY(0.8f);
                        btnUpdate.animate()
                            .alpha(1f)
                            .scaleX(1f)
                            .scaleY(1f)
                            .setDuration(400)
                            .setInterpolator(new OvershootInterpolator())
                            .start();

                        if (!data.forceUpdate) {
                            dialog.setCancelable(true);
                            btnLater.setVisibility(View.VISIBLE);
                        }
                        
                        // Auto trigger install
                        downloader.installApk(apkFile);
                    }, 3000);
                });
            }

            @Override
            public void onError(String message) {
                activity.runOnUiThread(() -> {
                    isDownloading = false;
                    progressLayout.setVisibility(View.GONE);
                    btnUpdate.setVisibility(View.VISIBLE);
                    btnUpdate.setText("Retry Update");
                    Toast.makeText(activity, message, Toast.LENGTH_SHORT).show();
                    
                    if (!data.forceUpdate) {
                        btnLater.setVisibility(View.VISIBLE);
                        dialog.setCancelable(true);
                    }
                });
            }
        });
    }
    
    private void animateCountdownText(String text) {
        tvCountdown.setText(text);
        tvCountdown.setAlpha(0f);
        tvCountdown.setScaleX(0.5f);
        tvCountdown.setScaleY(0.5f);
        
        tvCountdown.animate()
            .alpha(1f)
            .scaleX(1f)
            .scaleY(1f)
            .setDuration(300)
            .setInterpolator(new OvershootInterpolator())
            .start();
    }
}
