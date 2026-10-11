package io.github.hdhotdog.hotties;

import android.app.DownloadManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.Uri;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.json.JSONArray;
import org.json.JSONObject;

@CapacitorPlugin(name = "AiModel")
public class AiModelPlugin extends Plugin {
    private JSONObject manifest;

    @PluginMethod
    public void connection(PluginCall call) {
        getBridge().execute(() -> {
            JSObject result = new JSObject();
            result.put("type", connectionType());
            call.resolve(result);
        });
    }

    @PluginMethod
    public void status(PluginCall call) {
        getBridge().execute(() -> {
            try {
                call.resolve(readStatus());
            } catch (Exception error) {
                call.reject("Could not check the AI model.", error);
            }
        });
    }

    @PluginMethod
    public void start(PluginCall call) {
        getBridge().execute(() -> {
            try {
                String network = connectionType();
                boolean allowCellular = Boolean.TRUE.equals(call.getBoolean("allowCellular", false));
                if ("cellular".equals(network) && !allowCellular) {
                    call.reject("Confirm cellular data use before downloading.", "CELLULAR_CONFIRMATION_REQUIRED");
                    return;
                }
                if (!"wifi".equals(network) && !("cellular".equals(network) && allowCellular)) {
                    call.reject("Connect to Wi-Fi to download the AI model.", "NETWORK_UNAVAILABLE");
                    return;
                }
                if (isReady()) {
                    call.resolve(readStatus());
                    return;
                }
                SharedPreferences.Editor edit = preferences().edit();
                edit.putBoolean("allowCellular", allowCellular).remove("error").apply();
                if (preferences().getLong("downloadId", -1L) < 0) enqueueCurrent();
                call.resolve(readStatus());
            } catch (Exception error) {
                call.reject("Could not start the AI model download.", error);
            }
        });
    }

    @PluginMethod
    public void delete(PluginCall call) {
        getBridge().execute(() -> {
            try {
                long id = preferences().getLong("downloadId", -1L);
                if (id >= 0) downloadManager().remove(id);
                preferences().edit().clear().apply();
                removeTree(stagingDir());
                removeTree(installedDir());
                call.resolve(readStatus());
            } catch (Exception error) {
                call.reject("Could not delete the AI model.", error);
            }
        });
    }

    private synchronized JSObject readStatus() throws Exception {
        JSONArray files = files();
        long total = 0;
        for (int i = 0; i < files.length(); i++) total += files.getJSONObject(i).getLong("size");
        JSObject result = new JSObject();
        result.put("totalBytes", total);
        if (isReady()) {
            result.put("state", "ready");
            result.put("downloadedBytes", total);
            result.put("directory", installedDir().getAbsolutePath());
            return result;
        }

        SharedPreferences prefs = preferences();
        int index = prefs.getInt("index", 0);
        long completed = 0;
        for (int i = 0; i < Math.min(index, files.length()); i++) completed += files.getJSONObject(i).getLong("size");
        long id = prefs.getLong("downloadId", -1L);
        if (id < 0) {
            result.put("state", prefs.contains("error") ? "failed" : "missing");
            result.put("downloadedBytes", completed);
            if (prefs.contains("error")) result.put("error", prefs.getString("error", "Download failed."));
            return result;
        }

        try (Cursor cursor = downloadManager().query(new DownloadManager.Query().setFilterById(id))) {
            if (cursor == null || !cursor.moveToFirst()) {
                failCurrent("The system download disappeared.");
                return readStatus();
            }
            int state = cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
            if (state == DownloadManager.STATUS_SUCCESSFUL) {
                JSONObject asset = files.getJSONObject(index);
                File downloaded = new File(stagingDir(), asset.getString("path"));
                if (!matchesHash(downloaded, asset)) {
                    failCurrent("Downloaded model file failed its integrity check. Retry the download.");
                    return readStatus();
                }
                prefs.edit().putInt("index", index + 1).remove("downloadId").apply();
                if (index + 1 == files.length()) {
                    File marker = new File(stagingDir(), "ready");
                    try (FileOutputStream output = new FileOutputStream(marker)) {
                        output.write(manifest().getString("version").getBytes(StandardCharsets.UTF_8));
                    }
                    removeTree(installedDir());
                    if (!stagingDir().renameTo(installedDir())) throw new Exception("Could not install verified model files.");
                    prefs.edit().clear().apply();
                } else {
                    enqueueCurrent();
                }
                return readStatus();
            }
            if (state == DownloadManager.STATUS_FAILED) {
                failCurrent("The model download failed. Check the connection and retry.");
                return readStatus();
            }
            long current = cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR));
            result.put("downloadedBytes", completed + Math.min(current, files.getJSONObject(index).getLong("size")));
            result.put("state", state == DownloadManager.STATUS_PAUSED ? "paused" : "downloading");
            return result;
        }
    }

    private void enqueueCurrent() throws Exception {
        SharedPreferences prefs = preferences();
        JSONArray files = files();
        int index = prefs.getInt("index", 0);
        if (index >= files.length()) throw new Exception("No model files remain to download.");
        JSONObject asset = files.getJSONObject(index);
        File destination = new File(stagingDir(), asset.getString("path"));
        if (!destination.getParentFile().isDirectory() && !destination.getParentFile().mkdirs()) {
            throw new Exception("Could not create model storage.");
        }
        if (destination.exists() && !destination.delete()) throw new Exception("Could not replace a partial model file.");
        DownloadManager.Request request = new DownloadManager.Request(Uri.parse(asset.getString("url")));
        int networks = DownloadManager.Request.NETWORK_WIFI;
        if (prefs.getBoolean("allowCellular", false)) networks |= DownloadManager.Request.NETWORK_MOBILE;
        request.setAllowedNetworkTypes(networks);
        request.setAllowedOverRoaming(false);
        request.setTitle("Hotties AI model");
        request.setDescription("Downloading optional category suggestions");
        request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE);
        request.setDestinationInExternalFilesDir(getContext(), null,
            "ai-models/." + manifest().getString("version") + "-staging/" + asset.getString("path"));
        long id = downloadManager().enqueue(request);
        prefs.edit().putLong("downloadId", id).apply();
    }

    private void failCurrent(String message) throws Exception {
        int index = preferences().getInt("index", 0);
        if (index < files().length()) {
            File current = new File(stagingDir(), files().getJSONObject(index).getString("path"));
            if (current.exists()) current.delete();
        }
        preferences().edit().remove("downloadId").putString("error", message).apply();
    }

    private boolean matchesHash(File file, JSONObject asset) throws Exception {
        if (!file.isFile() || file.length() != asset.getLong("size")) return false;
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (FileInputStream input = new FileInputStream(file)) {
            byte[] chunk = new byte[65536];
            int count;
            while ((count = input.read(chunk)) != -1) digest.update(chunk, 0, count);
        }
        byte[] bytes = digest.digest();
        StringBuilder hex = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) hex.append(String.format("%02x", b & 0xff));
        return hex.toString().equals(asset.getString("sha256"));
    }

    private String connectionType() {
        ConnectivityManager manager = (ConnectivityManager) getContext().getSystemService(Context.CONNECTIVITY_SERVICE);
        Network network = manager.getActiveNetwork();
        NetworkCapabilities capabilities = network == null ? null : manager.getNetworkCapabilities(network);
        if (capabilities == null || !capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)) return "none";
        if (capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) return "wifi";
        if (capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)) return "cellular";
        return "unknown";
    }

    private DownloadManager downloadManager() {
        return (DownloadManager) getContext().getSystemService(Context.DOWNLOAD_SERVICE);
    }

    private JSONObject manifest() throws Exception {
        if (manifest == null) {
            try (InputStream input = getContext().getAssets().open("ai-model-manifest.json")) {
                ByteArrayOutputStream buffer = new ByteArrayOutputStream();
                byte[] chunk = new byte[4096];
                int count;
                while ((count = input.read(chunk)) != -1) buffer.write(chunk, 0, count);
                manifest = new JSONObject(buffer.toString(StandardCharsets.UTF_8.name()));
            }
        }
        return manifest;
    }

    private JSONArray files() throws Exception {
        return manifest().getJSONArray("files");
    }

    private SharedPreferences preferences() throws Exception {
        return getContext().getSharedPreferences("ai-model-" + manifest().getString("version"), Context.MODE_PRIVATE);
    }

    private File rootDir() {
        File external = getContext().getExternalFilesDir(null);
        if (external == null) throw new IllegalStateException("App storage is unavailable.");
        return new File(external, "ai-models");
    }

    private File stagingDir() throws Exception {
        return new File(rootDir(), "." + manifest().getString("version") + "-staging");
    }

    private File installedDir() throws Exception {
        return new File(rootDir(), manifest().getString("version"));
    }

    private boolean isReady() throws Exception {
        return new File(installedDir(), "ready").isFile();
    }

    private void removeTree(File file) throws Exception {
        if (!file.exists()) return;
        if (file.isDirectory()) {
            File[] children = file.listFiles();
            if (children != null) for (File child : children) removeTree(child);
        }
        if (!file.delete()) throw new Exception("Could not remove " + file.getName());
    }
}
