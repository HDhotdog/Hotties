import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

// Native projects are generated locally and gitignored. Apply required scanner
// settings after `cap add` and before every `cap sync`.
const androidVariables = 'android/variables.gradle';
if (existsSync(androidVariables)) {
  const original = readFileSync(androidVariables, 'utf8');
  const updated = original.replace(/minSdkVersion\s*=\s*\d+/, 'minSdkVersion = 26');
  if (updated === original && !/minSdkVersion\s*=\s*26/.test(original)) {
    throw new Error(`Could not set minSdkVersion in ${androidVariables}`);
  }
  writeFileSync(androidVariables, updated);

  const manifestPath = 'android/app/src/main/AndroidManifest.xml';
  if (existsSync(manifestPath)) {
    let manifest = readFileSync(manifestPath, 'utf8');
    for (const permission of ['android.permission.CAMERA', 'android.permission.INTERNET', 'android.permission.RECORD_AUDIO']) {
      if (!manifest.includes(permission)) {
        manifest = manifest.replace(/<manifest\b[^>]*>/, (tag) => `${tag}\n    <uses-permission android:name="${permission}" />`);
      }
    }
    if (!manifest.includes('android.speech.RecognitionService')) {
      manifest = manifest.replace('</manifest>',
        '    <queries><intent><action android:name="android.speech.RecognitionService" /></intent></queries>\n</manifest>');
    }
    writeFileSync(manifestPath, manifest);
  }

  const javaDir = 'android/app/src/main/java/io/ionic/hotties';
  const mainActivityPath = `${javaDir}/MainActivity.java`;
  if (existsSync(mainActivityPath)) {
    let activity = readFileSync(mainActivityPath, 'utf8');
    if (!activity.includes('OfflineSpeechPlugin.class')) {
      activity = activity.replace('import com.getcapacitor.BridgeActivity;',
        'import com.getcapacitor.BridgeActivity;\nimport android.os.Bundle;');
      activity = activity.replace(/public class MainActivity extends BridgeActivity \{\s*\}/,
        'public class MainActivity extends BridgeActivity {\n' +
        '  @Override public void onCreate(Bundle savedInstanceState) {\n' +
        '    registerPlugin(OfflineSpeechPlugin.class);\n' +
        '    super.onCreate(savedInstanceState);\n' +
        '  }\n' +
        '}');
      if (!activity.includes('OfflineSpeechPlugin.class')) throw new Error('Could not register offline speech plugin.');
      writeFileSync(mainActivityPath, activity);
    }
    if (!activity.includes('LocalShoppingModelPlugin.class')) {
      activity = activity.replace('registerPlugin(OfflineSpeechPlugin.class);',
        'registerPlugin(OfflineSpeechPlugin.class);\n    registerPlugin(LocalShoppingModelPlugin.class);');
      if (!activity.includes('LocalShoppingModelPlugin.class')) throw new Error('Could not register local shopping model plugin.');
      writeFileSync(mainActivityPath, activity);
    }
    copyFileSync('native/android/OfflineSpeechPlugin.java', `${javaDir}/OfflineSpeechPlugin.java`);
    copyFileSync('native/android/LocalShoppingModelPlugin.java', `${javaDir}/LocalShoppingModelPlugin.java`);
    const modelAsset = 'android/app/src/main/assets/shopping-model.gguf';
    copyFileSync('.model-cache/native/qwen2.5-0.5b-instruct-q4_k_m.gguf', modelAsset);
  }

  const gradlePath = 'android/app/build.gradle';
  if (existsSync(gradlePath)) {
    let gradle = readFileSync(gradlePath, 'utf8');
    if (!gradle.includes('ndkVersion "30.0.16248370"')) {
      gradle = gradle.replace('android {', 'android {\n    ndkVersion "30.0.16248370"');
    }
    if (!gradle.includes('shopping-llm/CMakeLists.txt')) {
      gradle = gradle.replace('android {',
        'android {\n    externalNativeBuild { cmake { path "../../native/android/shopping-llm/CMakeLists.txt" } }');
      if (!gradle.includes('shopping-llm/CMakeLists.txt')) throw new Error('Could not configure native shopping model build.');
    }
    writeFileSync(gradlePath, gradle);
  }
}

const iosInfo = 'ios/App/App/Info.plist';
if (existsSync(iosInfo)) {
  let info = readFileSync(iosInfo, 'utf8');
  if (!info.includes('NSCameraUsageDescription')) {
    info = info.replace(/<\/dict>\s*<\/plist>/,
      '    <key>NSCameraUsageDescription</key>\n    <string>Scan food product barcodes to add them to your fridge.</string>\n</dict>\n</plist>');
    writeFileSync(iosInfo, info);
  }
}
