package com.rgukt.connect;

import android.Manifest;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkRequest;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.view.animation.Animation;
import android.view.animation.AnimationUtils;
import android.webkit.WebView;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import java.util.concurrent.TimeUnit;

import com.getcapacitor.BridgeActivity;

import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {
    private static final String PREFS_NAME = "AppAuthPrefs";
    private static final String KEY_ENABLED = "auth_enabled";
    private static final int PERMISSION_REQUEST_CODE = 101;
    private boolean isSuccessfullyAuthenticated = false;
    private boolean hasRequestedPermissions = false;

    private View noInternetView;
    private View backOnlineView;
    private Button retryButton;
    private ImageView illustration;
    private ImageView successIcon;
    private ConnectivityManager connectivityManager;
    private ConnectivityManager.NetworkCallback networkCallback;
    private boolean isNetworkAvailable = true;
    private boolean wasOffline = false;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private Runnable hideBackOnlineRunnable;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppAuthPlugin.class);
        registerPlugin(FileDownloadPlugin.class);
        registerPlugin(AppPermissionsPlugin.class);
        registerPlugin(WidgetPlugin.class);
        registerPlugin(NotificationProgressPlugin.class);

        super.onCreate(savedInstanceState);

        noInternetView = findViewById(R.id.no_internet_view);
        backOnlineView = findViewById(R.id.back_online_view);
        retryButton = findViewById(R.id.retry_button);
        illustration = findViewById(R.id.no_internet_illustration);
        successIcon = findViewById(R.id.success_icon);

        if (retryButton != null) {
            retryButton.setOnClickListener(v -> checkConnectivityManually());
            // Requirement 3: Ensure button is on top and responsive
            retryButton.bringToFront();
        }

        // Requirement 7: Safe Area / Navigation Bar Handling for Overlays
        if (noInternetView != null) {
            ViewCompat.setOnApplyWindowInsetsListener(noInternetView, (v, insets) -> {
                int bottom = insets.getInsets(WindowInsetsCompat.Type.systemBars()).bottom;
                v.setPadding(v.getPaddingLeft(), v.getPaddingTop(), v.getPaddingRight(), bottom);
                return insets;
            });
        }
        if (backOnlineView != null) {
            ViewCompat.setOnApplyWindowInsetsListener(backOnlineView, (v, insets) -> {
                int bottom = insets.getInsets(WindowInsetsCompat.Type.systemBars()).bottom;
                v.setPadding(v.getPaddingLeft(), v.getPaddingTop(), v.getPaddingRight(), bottom);
                return insets;
            });
        }

        setupNetworkMonitoring();

        this.bridge.getWebView().setVerticalScrollBarEnabled(false);
        this.bridge.getWebView().setHorizontalScrollBarEnabled(false);
        this.bridge.getWebView().setScrollBarStyle(WebView.SCROLLBARS_OUTSIDE_OVERLAY);



        // Requirement: Make WebView automatically start below the status bar (disable edge-to-edge)

        WindowCompat.setDecorFitsSystemWindows(getWindow(), true);

        checkAndAuthenticate();
        handleIntent(getIntent());
        refreshWidgets();
        
        // Start background widget sync every 15 minutes
        PeriodicWorkRequest syncWorkRequest = new PeriodicWorkRequest.Builder(WidgetSyncWorker.class, 15, TimeUnit.MINUTES).build();
        WorkManager.getInstance(this).enqueueUniquePeriodicWork("WidgetSyncWork", ExistingPeriodicWorkPolicy.KEEP, syncWorkRequest);

        // Restored Native UpdateChecker per user request
        new UpdateChecker(this).checkForUpdates();
    }

    @Override
    public void onStart() {
        super.onStart();
    }

    private void refreshWidgets() {
        try {
            String[] widgetClasses = {
                "SeatingWidgetProvider", "ScheduleWidgetProvider", 
                "ComplaintsWidgetProvider", "ActionsWidgetProvider", "ProfileWidgetProvider"
            };
            for (String className : widgetClasses) {
                try {
                    Class<?> clazz = Class.forName("com.rgukt.connect." + className);
                    Intent intent = new Intent(this, clazz);
                    intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
                    int[] ids = AppWidgetManager.getInstance(this).getAppWidgetIds(new ComponentName(this, clazz));
                    intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
                    sendBroadcast(intent);
                } catch (ClassNotFoundException e) {
                    // Skip if widget class doesn't exist
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void setupNetworkMonitoring() {
        connectivityManager = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
        isNetworkAvailable = isCurrentlyConnected();
        if (!isNetworkAvailable) {
            wasOffline = true;
            showNoInternetScreen();
        }

        networkCallback = new ConnectivityManager.NetworkCallback() {
            @Override
            public void onAvailable(@NonNull Network network) { updateNetworkStatus(true); }
            @Override
            public void onLost(@NonNull Network network) { updateNetworkStatus(false); }
            @Override
            public void onCapabilitiesChanged(@NonNull Network network, @NonNull NetworkCapabilities capabilities) {
                updateNetworkStatus(capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET));
            }
        };

        connectivityManager.registerNetworkCallback(
            new NetworkRequest.Builder().addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET).build(),
            networkCallback
        );
    }

    private boolean isCurrentlyConnected() {
        if (connectivityManager == null) return true;
        Network activeNetwork = connectivityManager.getActiveNetwork();
        if (activeNetwork == null) return false;
        NetworkCapabilities capabilities = connectivityManager.getNetworkCapabilities(activeNetwork);
        return capabilities != null && capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
    }

    private void checkConnectivityManually() {
        boolean connected = isCurrentlyConnected();
        if (!connected) {
            Toast.makeText(this, "Still no internet.", Toast.LENGTH_SHORT).show();
            if (illustration != null) illustration.startAnimation(AnimationUtils.loadAnimation(this, android.R.anim.fade_in));
        }
        updateNetworkStatus(connected);
    }

    private void updateNetworkStatus(final boolean isConnected) {
        mainHandler.post(() -> {
            if (isConnected) {
                if (!isNetworkAvailable || wasOffline) {
                    if (wasOffline) {
                        showBackOnlineScreen();
                        wasOffline = false;
                    } else {
                        hideNoInternetScreen();
                    }

                }
                isNetworkAvailable = true;
            } else {
                if (isNetworkAvailable) {
                    showNoInternetScreen();
                    wasOffline = true;
                }
                isNetworkAvailable = false;
            }
        });
    }

    private void showNoInternetScreen() {
        if (backOnlineView != null) backOnlineView.setVisibility(View.GONE);
        if (noInternetView == null || noInternetView.getVisibility() == View.VISIBLE) return;
        noInternetView.setVisibility(View.VISIBLE);
        // Requirement 3: Bring to front to ensure it's not covered
        noInternetView.bringToFront(); 
        noInternetView.startAnimation(AnimationUtils.loadAnimation(this, R.anim.fade_in_slide_up));
    }

    private void showBackOnlineScreen() {
        if (backOnlineView == null || backOnlineView.getVisibility() == View.VISIBLE) return;
        if (noInternetView != null) noInternetView.setVisibility(View.GONE);
        backOnlineView.setVisibility(View.VISIBLE);
        backOnlineView.bringToFront();
        backOnlineView.startAnimation(AnimationUtils.loadAnimation(this, android.R.anim.fade_in));
        if (hideBackOnlineRunnable != null) mainHandler.removeCallbacks(hideBackOnlineRunnable);
        hideBackOnlineRunnable = this::hideBackOnlineScreen;
        mainHandler.postDelayed(hideBackOnlineRunnable, 2000);
    }

    private void hideBackOnlineScreen() {
        if (backOnlineView == null || backOnlineView.getVisibility() == View.GONE) return;
        Animation fadeOut = AnimationUtils.loadAnimation(this, android.R.anim.fade_out);
        fadeOut.setAnimationListener(new Animation.AnimationListener() {
            @Override public void onAnimationStart(Animation a) {}
            @Override public void onAnimationRepeat(Animation a) {}
            @Override public void onAnimationEnd(Animation a) { backOnlineView.setVisibility(View.GONE); }
        });
        backOnlineView.startAnimation(fadeOut);
    }

    private void hideNoInternetScreen() {
        if (noInternetView == null || noInternetView.getVisibility() == View.GONE) return;
        Animation fadeOut = AnimationUtils.loadAnimation(this, R.anim.fade_out_slide_down);
        fadeOut.setAnimationListener(new Animation.AnimationListener() {
            @Override public void onAnimationStart(Animation a) {}
            @Override public void onAnimationRepeat(Animation a) {}
            @Override public void onAnimationEnd(Animation a) { noInternetView.setVisibility(View.GONE); }
        });
        noInternetView.startAnimation(fadeOut);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        if (intent != null && intent.hasExtra("target_page")) {
            final String targetPage = intent.getStringExtra("target_page");
            intent.removeExtra("target_page");
            
            for (int i = 1; i <= 20; i++) {
                mainHandler.postDelayed(() -> {
                    if (this.bridge != null && this.bridge.getWebView() != null) {
                        this.bridge.getWebView().evaluateJavascript(
                            "window.dispatchEvent(new CustomEvent('appNavigate', { detail: '" + targetPage + "' }));", null);
                    }
                }, i * 250);
            }
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (connectivityManager != null && networkCallback != null) connectivityManager.unregisterNetworkCallback(networkCallback);
    }

    @Override
    public void onResume() {
        super.onResume();
        checkAndAuthenticate();
        updateNetworkStatus(isCurrentlyConnected());
    }

    @Override
    public void onPause() {
        super.onPause();
        isSuccessfullyAuthenticated = false;
    }

    @Override
    public void onBackPressed() {
        if ((noInternetView != null && noInternetView.getVisibility() == View.VISIBLE) || 
            (backOnlineView != null && backOnlineView.getVisibility() == View.VISIBLE)) return;
        if (getBridge() != null && getBridge().getWebView() != null && getBridge().getWebView().canGoBack()) {
            getBridge().getWebView().goBack();
        } else {
            super.onBackPressed();
        }
    }

    private void checkAndAuthenticate() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        if (prefs.getBoolean(KEY_ENABLED, false) && !isSuccessfullyAuthenticated) {
            if (BiometricHelper.canAuthenticate(this)) {
                BiometricHelper.showBiometricPrompt(this, new BiometricHelper.AuthCallback() {
                    @Override public void onSuccess() { isSuccessfullyAuthenticated = true; requestAppPermissions(); }
                    @Override public void onFailure() {}
                    @Override public void onError(int c, String s) { MainActivity.this.finishAffinity(); }
                });
            } else { requestAppPermissions(); }
        } else { requestAppPermissions(); }
    }

    public void requestAppPermissions() {
        if (hasRequestedPermissions) return;
        hasRequestedPermissions = true;
        
        List<String> perms = new ArrayList<>();
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            perms.add(Manifest.permission.CAMERA);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) perms.add(Manifest.permission.POST_NOTIFICATIONS);
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_MEDIA_IMAGES) != PackageManager.PERMISSION_GRANTED) perms.add(Manifest.permission.READ_MEDIA_IMAGES);
        } else if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) perms.add(Manifest.permission.READ_EXTERNAL_STORAGE);
        if (!perms.isEmpty()) ActivityCompat.requestPermissions(this, perms.toArray(new String[0]), PERMISSION_REQUEST_CODE);
    }
    
    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == 9009 && AppAuthPlugin.savedPhoneNumberCall != null) {
            com.getcapacitor.PluginCall call = AppAuthPlugin.savedPhoneNumberCall;
            AppAuthPlugin.savedPhoneNumberCall = null;
            if (resultCode == RESULT_OK) {
                try {
                    String phoneNumber = com.google.android.gms.auth.api.identity.Identity.getSignInClient(this).getPhoneNumberFromIntent(data);
                    com.getcapacitor.JSObject ret = new com.getcapacitor.JSObject();
                    ret.put("phoneNumber", phoneNumber);
                    call.resolve(ret);
                } catch (Exception e) {
                    call.reject("Error parsing phone number: " + e.getMessage());
                }
            } else {
                call.reject("User cancelled phone number hint");
            }
        }
    }
}
