package io.ionic.hotties;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import android.os.SystemClock;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.security.MessageDigest;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "LocalShoppingModel")
public class LocalShoppingModelPlugin extends Plugin {
    private static final String MODEL_NAME = "shopping-model.gguf";
    private static final String MODEL_SHA256 = "74a4da8c9fdbcd15bd1f6d01d621410d31c6fc00986f5eb687824e7b93d7a9db";
    private static final long MODEL_BYTES = 491400032L;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private boolean loaded = false;
    private long loadDurationMs = 0;

    static { System.loadLibrary("shopping_llm"); }

    private static native boolean nativeLoad(String path);
    private static native String nativeGenerate(String text);
    private static native void nativeCancel();

    @PluginMethod
    public void prepare(PluginCall call) {
        executor.execute(() -> {
            try {
                ensureLoaded();
                JSObject result = new JSObject();
                result.put("loadMs", loadDurationMs);
                call.resolve(result);
            } catch (Exception error) {
                call.reject("Local shopping model could not load: " + error.getMessage());
            }
        });
    }

    @PluginMethod
    public void generate(PluginCall call) {
        String text = call.getString("text", "").trim();
        if (text.isEmpty()) {
            call.reject("Enter or say some shopping items.");
            return;
        }
        executor.execute(() -> {
            try {
                ensureLoaded();
                String output = nativeGenerate(text);
                if (output == null) throw new IllegalStateException("Generation failed or was cancelled.");
                JSObject result = new JSObject();
                result.put("text", output);
                call.resolve(result);
            } catch (Exception error) {
                call.reject("Local shopping model failed: " + error.getMessage());
            }
        });
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        nativeCancel();
        call.resolve();
    }

    private synchronized void ensureLoaded() throws Exception {
        if (loaded) return;
        long started = SystemClock.elapsedRealtime();
        File model = new File(getContext().getFilesDir(), MODEL_NAME);
        if (model.length() != MODEL_BYTES || !MODEL_SHA256.equals(sha256(model))) {
            File temp = new File(getContext().getFilesDir(), MODEL_NAME + ".tmp");
            try (InputStream input = getContext().getAssets().open(MODEL_NAME);
                 FileOutputStream output = new FileOutputStream(temp)) {
                byte[] bytes = new byte[1024 * 1024];
                int count;
                while ((count = input.read(bytes)) >= 0) output.write(bytes, 0, count);
            }
            if (temp.length() != MODEL_BYTES || !MODEL_SHA256.equals(sha256(temp)) ||
                (model.exists() && !model.delete()) || !temp.renameTo(model)) {
                temp.delete();
                throw new IllegalStateException("Bundled model verification failed.");
            }
        }
        if (!nativeLoad(model.getAbsolutePath())) throw new IllegalStateException("Native model initialization failed.");
        loadDurationMs = SystemClock.elapsedRealtime() - started;
        loaded = true;
    }

    private static String sha256(File file) throws Exception {
        if (!file.isFile()) return "";
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (FileInputStream input = new FileInputStream(file)) {
            byte[] bytes = new byte[1024 * 1024];
            int count;
            while ((count = input.read(bytes)) >= 0) digest.update(bytes, 0, count);
        }
        StringBuilder hex = new StringBuilder(64);
        for (byte value : digest.digest()) hex.append(String.format("%02x", value & 0xff));
        return hex.toString();
    }

    @Override
    protected void handleOnDestroy() {
        nativeCancel();
        executor.shutdownNow();
        super.handleOnDestroy();
    }
}
