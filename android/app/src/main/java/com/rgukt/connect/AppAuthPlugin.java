package com.rgukt.connect;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.CancellationSignal;
import android.util.Log;

import androidx.core.content.ContextCompat;
import androidx.credentials.ClearCredentialStateRequest;
import androidx.credentials.Credential;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.CustomCredential;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.exceptions.GetCredentialException;
import androidx.credentials.exceptions.ClearCredentialException;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.google.android.libraries.identity.googleid.GetGoogleIdOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;
import com.google.android.gms.auth.api.identity.GetPhoneNumberHintIntentRequest;
import com.google.android.gms.auth.api.identity.Identity;
import android.app.Activity;
import android.content.Intent;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.annotation.ActivityCallback;

import java.util.UUID;

@CapacitorPlugin(name = "AppAuth")
public class AppAuthPlugin extends Plugin {

    private static final String PREFS_NAME = "AppAuthPrefs";
    private static final String KEY_ENABLED = "auth_enabled";
    private CredentialManager credentialManager;
    public static PluginCall savedPhoneNumberCall;

    @Override
    public void load() {
        super.load();
        credentialManager = CredentialManager.create(getContext());
    }

    @PluginMethod
    public void setAuthEnabled(PluginCall call) {
        Boolean enabled = call.getBoolean("enabled");
        if (enabled == null) {
            call.reject("Must provide 'enabled' boolean");
            return;
        }

        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        editor.putBoolean(KEY_ENABLED, enabled);
        editor.apply();

        call.resolve();
    }

    @PluginMethod
    public void isAuthEnabled(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        boolean isAuthEnabled = prefs.getBoolean(KEY_ENABLED, false);

        JSObject ret = new JSObject();
        ret.put("enabled", isAuthEnabled);
        call.resolve(ret);
    }

    @PluginMethod
    public void isBiometricAvailable(PluginCall call) {
        boolean available = BiometricHelper.canAuthenticate(getContext());
        JSObject ret = new JSObject();
        ret.put("available", available);
        call.resolve(ret);
    }

    @PluginMethod
    public void googleLogin(PluginCall call) {
        String webClientId = call.getString("webClientId", "2907414387-datca8tad78d07d57edkhta34a3btgg8.apps.googleusercontent.com");
        
        String hashedNonce = UUID.randomUUID().toString(); // Generate nonce
        
        GetGoogleIdOption googleIdOption = new GetGoogleIdOption.Builder()
                .setFilterByAuthorizedAccounts(false)
                .setServerClientId(webClientId)
                .setNonce(hashedNonce)
                .setAutoSelectEnabled(true)
                .build();

        GetCredentialRequest request = new GetCredentialRequest.Builder()
                .addCredentialOption(googleIdOption)
                .build();

        credentialManager.getCredentialAsync(
                getActivity(),
                request,
                new CancellationSignal(),
                ContextCompat.getMainExecutor(getContext()),
                new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                    @Override
                    public void onResult(GetCredentialResponse result) {
                        handleSignIn(result, call);
                    }

                    @Override
                    public void onError(GetCredentialException e) {
                        call.reject("Google Sign-In failed: " + e.getMessage());
                    }
                }
        );
    }

    private void handleSignIn(GetCredentialResponse result, PluginCall call) {
        Credential credential = result.getCredential();
        if (credential instanceof CustomCredential &&
                GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(credential.getType())) {
            try {
                GoogleIdTokenCredential googleIdTokenCredential =
                        GoogleIdTokenCredential.createFrom(((CustomCredential) credential).getData());

                JSObject user = new JSObject();
                user.put("id", googleIdTokenCredential.getId());
                user.put("idToken", googleIdTokenCredential.getIdToken());
                user.put("email", googleIdTokenCredential.getId()); // Using ID as email since it usually is for GIS
                user.put("name", googleIdTokenCredential.getDisplayName());
                if (googleIdTokenCredential.getProfilePictureUri() != null) {
                    user.put("photoUrl", googleIdTokenCredential.getProfilePictureUri().toString());
                }
                call.resolve(user);
            } catch (Exception e) {
                call.reject("Error parsing Google ID Token: " + e.getMessage());
            }
        } else {
            call.reject("Unexpected credential type");
        }
    }

    @PluginMethod
    public void googleLogout(PluginCall call) {
        ClearCredentialStateRequest request = new ClearCredentialStateRequest();
        credentialManager.clearCredentialStateAsync(
                request,
                new CancellationSignal(),
                ContextCompat.getMainExecutor(getContext()),
                new CredentialManagerCallback<Void, ClearCredentialException>() {
                    @Override
                    public void onResult(Void result) {
                        call.resolve();
                    }

                    @Override
                    public void onError(ClearCredentialException e) {
                        call.reject("Failed to clear credentials: " + e.getMessage());
                    }
                }
        );
    }

    @PluginMethod
    public void authenticate(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            BiometricHelper.showBiometricPrompt(getActivity(), new BiometricHelper.AuthCallback() {
                @Override
                public void onSuccess() {
                    call.resolve();
                }

                @Override
                public void onFailure() {
                    call.reject("Authentication failed");
                }

                @Override
                public void onError(int errorCode, String errString) {
                    call.reject(errString, String.valueOf(errorCode));
                }
            });
        });
    }

    @PluginMethod
    public void requestPhoneNumber(PluginCall call) {
        GetPhoneNumberHintIntentRequest request = GetPhoneNumberHintIntentRequest.builder().build();
        Identity.getSignInClient(getActivity())
                .getPhoneNumberHintIntent(request)
                .addOnSuccessListener( result -> {
                    try {
                        savedPhoneNumberCall = call;
                        getActivity().startIntentSenderForResult(
                            result.getIntentSender(),
                            9009,
                            null, 0, 0, 0
                        );
                    } catch (Exception e) {
                        call.reject("Failed to start phone number hint intent", e);
                    }
                })
                .addOnFailureListener(e -> {
                    call.reject("Failed to get phone number hint", e);
                });
    }
}
