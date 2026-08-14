package com.rgukt.connect;

import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;

@CapacitorPlugin(name = "FileDownload")
public class FileDownloadPlugin extends Plugin {

    @PluginMethod
    public void savePdf(PluginCall call) {
        String base64Data = call.getString("base64");
        String filename = call.getString("filename", "download.pdf");

        if (base64Data == null || base64Data.isEmpty()) {
            call.reject("Base64 data is required");
            return;
        }

        try {
            byte[] pdfAsBytes = Base64.decode(base64Data, Base64.DEFAULT);
            Uri fileUri = null;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // Modern Android: Write to MediaStore
                ContentValues contentValues = new ContentValues();
                contentValues.put(MediaStore.MediaColumns.DISPLAY_NAME, filename);
                contentValues.put(MediaStore.MediaColumns.MIME_TYPE, "application/pdf");
                contentValues.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS);

                fileUri = getContext().getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues);
                if (fileUri != null) {
                    try (OutputStream outputStream = getContext().getContentResolver().openOutputStream(fileUri)) {
                        if (outputStream != null) {
                            outputStream.write(pdfAsBytes);
                        }
                    }
                }
            } else {
                // Legacy Android (API < 29)
                File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                if (!downloadsDir.exists()) downloadsDir.mkdirs();
                File file = new File(downloadsDir, filename);
                try (FileOutputStream fos = new FileOutputStream(file)) {
                    fos.write(pdfAsBytes);
                }
                
                // Use FileProvider for Legacy
                fileUri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", file);
            }

            if (fileUri != null) {
                // TRIGGER AUTOMATIC OPEN
                Intent intent = new Intent(Intent.ACTION_VIEW);
                intent.setDataAndType(fileUri, "application/pdf");
                intent.setFlags(Intent.FLAG_ACTIVITY_NO_HISTORY | Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                
                // Use Intent Chooser for better UX
                Intent chooser = Intent.createChooser(intent, "Open Profile PDF");
                chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(chooser);

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("path", fileUri.toString());
                call.resolve(ret);
            } else {
                call.reject("Failed to create MediaStore entry.");
            }
        } catch (Exception e) {
            e.printStackTrace();
            call.reject("Download failed: " + e.getMessage());
        }
    }
}
