package io.github.hdhotdog.hotties;

import android.Manifest;
import android.os.Build;
import android.os.Bundle;
import android.content.Intent;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.RecognitionSupport;
import android.speech.RecognitionSupportCallback;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.Locale;

@CapacitorPlugin(name = "OfflineSpeech", permissions = {
    @Permission(alias = "microphone", strings = {Manifest.permission.RECORD_AUDIO})
})
public class OfflineSpeechPlugin extends Plugin {
    private SpeechRecognizer recognizer;
    private PluginCall listeningCall;
    private final Map<String, String> recognitionLocales = new HashMap<>();

    @PluginMethod
    public void available(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || !SpeechRecognizer.isOnDeviceRecognitionAvailable(getContext())) {
                resolveAvailable(call, false);
                return;
            }
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
                resolveAvailable(call, true);
                return;
            }
            final SpeechRecognizer checker;
            try {
                checker = SpeechRecognizer.createOnDeviceSpeechRecognizer(getContext());
            } catch (Exception error) {
                resolveAvailable(call, false);
                return;
            }
            try {
                Intent intent = recognitionIntent(call.getString("locale", "en-GB"));
                checker.checkRecognitionSupport(intent, getContext().getMainExecutor(), new RecognitionSupportCallback() {
                    @Override public void onSupportResult(RecognitionSupport support) {
                        String locale = call.getString("locale", "en-GB");
                        String language = Locale.forLanguageTag(locale).getLanguage();
                        String installed = support.getInstalledOnDeviceLanguages().stream()
                            .filter(candidate -> candidate.equalsIgnoreCase(locale)).findFirst().orElse(null);
                        if (installed == null) installed = support.getInstalledOnDeviceLanguages().stream()
                            .filter(candidate -> Locale.forLanguageTag(candidate).getLanguage().equals(language)).findFirst().orElse(null);
                        if (installed != null) recognitionLocales.put(locale, installed);
                        else recognitionLocales.remove(locale);
                        boolean supported = installed != null;
                        checker.destroy();
                        resolveAvailable(call, supported);
                    }
                    @Override public void onError(int error) {
                        checker.destroy();
                        // Engines may not implement this probe; listening still reports language errors.
                        resolveAvailable(call, error == SpeechRecognizer.ERROR_CANNOT_CHECK_SUPPORT);
                    }
                });
            } catch (Exception error) {
                checker.destroy();
                resolveAvailable(call, false);
            }
        });
    }

    private void resolveAvailable(PluginCall call, boolean available) {
        JSObject result = new JSObject();
        result.put("available", available);
        call.resolve(result);
    }

    private Intent recognitionIntent(String locale) {
        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, recognitionLocales.getOrDefault(locale, locale));
        intent.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true);
        intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
        return intent;
    }

    @PluginMethod
    public void listen(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S ||
            !SpeechRecognizer.isOnDeviceRecognitionAvailable(getContext())) {
            call.reject("On-device speech recognition is unavailable.", "SPEECH_UNAVAILABLE");
            return;
        }
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            requestPermissionForAlias("microphone", call, "microphoneResult");
            return;
        }
        startListening(call);
    }

    @PermissionCallback
    private void microphoneResult(PluginCall call) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            call.reject("Microphone permission was denied.", "MICROPHONE_DENIED");
            return;
        }
        startListening(call);
    }

    private void startListening(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (listeningCall != null) {
                call.reject("Speech recognition is already running.", "SPEECH_BUSY");
                return;
            }
            listeningCall = call;
            try {
                recognizer = SpeechRecognizer.createOnDeviceSpeechRecognizer(getContext());
                recognizer.setRecognitionListener(new RecognitionListener() {
                    @Override public void onReadyForSpeech(Bundle params) {}
                    @Override public void onBeginningOfSpeech() {}
                    @Override public void onRmsChanged(float rmsdB) {}
                    @Override public void onBufferReceived(byte[] buffer) {}
                    @Override public void onEndOfSpeech() {}
                    @Override public void onPartialResults(Bundle partialResults) {}
                    @Override public void onEvent(int eventType, Bundle params) {}
                    @Override public void onError(int error) {
                        String message;
                        String code;
                        if (error == SpeechRecognizer.ERROR_NO_MATCH || error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT) {
                            message = "No speech was recognized. Try again or type the product.";
                            code = "SPEECH_NO_MATCH";
                        } else if (error == SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS) {
                            message = "Microphone access is needed for voice entry. Type the product instead.";
                            code = "MICROPHONE_DENIED";
                        } else if (error == SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED || error == SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE) {
                            message = "The selected speech language is unavailable.";
                            code = "SPEECH_LANGUAGE_UNAVAILABLE";
                        } else {
                            code = "SPEECH_UNAVAILABLE";
                            message = "On-device speech recognition is unavailable right now. Type the product instead.";
                        }
                        finish(null, message, code);
                    }
                    @Override public void onResults(Bundle results) {
                        ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                        String text = matches == null || matches.isEmpty() ? "" : matches.get(0).trim();
                        finish(text, text.isEmpty() ? "No speech was recognized." : null, "SPEECH_NO_MATCH");
                    }
                });
                Intent intent = recognitionIntent(call.getString("locale", "en-GB"));
                recognizer.startListening(intent);
            } catch (Exception error) {
                finish(null, "Could not start on-device speech recognition.", "SPEECH_UNAVAILABLE");
            }
        });
    }

    private void finish(String text, String error, String code) {
        PluginCall call = listeningCall;
        listeningCall = null;
        if (recognizer != null) {
            recognizer.destroy();
            recognizer = null;
        }
        if (call == null) return;
        if (error != null) call.reject(error, code);
        else {
            JSObject result = new JSObject();
            result.put("text", text);
            call.resolve(result);
        }
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (recognizer != null) recognizer.cancel();
            finish(null, "Speech recognition cancelled.", "SPEECH_CANCELLED");
            call.resolve();
        });
    }

    @Override
    protected void handleOnDestroy() {
        if (recognizer != null) recognizer.destroy();
        recognizer = null;
        listeningCall = null;
        super.handleOnDestroy();
    }
}
