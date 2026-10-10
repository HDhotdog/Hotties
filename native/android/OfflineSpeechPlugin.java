package io.ionic.hotties;

import android.Manifest;
import android.os.Build;
import android.os.Bundle;
import android.content.Intent;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.ArrayList;
import java.util.Locale;

@CapacitorPlugin(name = "OfflineSpeech", permissions = {
    @Permission(alias = "microphone", strings = {Manifest.permission.RECORD_AUDIO})
})
public class OfflineSpeechPlugin extends Plugin {
    private SpeechRecognizer recognizer;
    private PluginCall listeningCall;

    @PluginMethod
    public void available(PluginCall call) {
        JSObject result = new JSObject();
        result.put("available", Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
            SpeechRecognizer.isOnDeviceRecognitionAvailable(getContext()));
        call.resolve(result);
    }

    @PluginMethod
    public void listen(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S ||
            !SpeechRecognizer.isOnDeviceRecognitionAvailable(getContext())) {
            call.reject("On-device speech recognition is unavailable. Type the sentence instead.");
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
            call.reject("Microphone permission was denied. Type the sentence instead.");
            return;
        }
        startListening(call);
    }

    private void startListening(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (listeningCall != null) {
                call.reject("Speech recognition is already running.");
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
                        if (error == SpeechRecognizer.ERROR_NO_MATCH || error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT) {
                            message = "No speech was recognized. Try again or type the sentence.";
                        } else if (error == SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS) {
                            message = "Microphone access is needed for voice entry. Type the sentence instead.";
                        } else {
                            message = "On-device speech recognition is unavailable right now. Type the sentence instead.";
                        }
                        finish(null, message);
                    }
                    @Override public void onResults(Bundle results) {
                        ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                        String text = matches == null || matches.isEmpty() ? "" : matches.get(0).trim();
                        finish(text, text.isEmpty() ? "No speech was recognized. Try again or type the sentence." : null);
                    }
                });
                Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.GERMANY.toLanguageTag());
                intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
                recognizer.startListening(intent);
            } catch (Exception error) {
                finish(null, "Could not start on-device speech recognition. Type the sentence instead.");
            }
        });
    }

    private void finish(String text, String error) {
        PluginCall call = listeningCall;
        listeningCall = null;
        if (recognizer != null) {
            recognizer.destroy();
            recognizer = null;
        }
        if (call == null) return;
        if (error != null) call.reject(error);
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
            finish(null, "Speech recognition cancelled.");
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
