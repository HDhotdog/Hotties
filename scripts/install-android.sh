#!/usr/bin/env bash
# Build the web app and Android debug APK, then install it on a USB-connected device.
set -euo pipefail

die() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

command -v npm >/dev/null 2>&1 || die 'npm is required.'
command -v npx >/dev/null 2>&1 || die 'npx is required.'
[[ -x android/gradlew ]] || die 'Android project is missing. Run npx cap add android first.'

sdk="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Android/Sdk}}"
[[ -d "$sdk" ]] || die "Android SDK not found at $sdk. Set ANDROID_HOME to its location."
export ANDROID_HOME="$sdk"
export ANDROID_SDK_ROOT="$sdk"

if command -v adb >/dev/null 2>&1; then
  adb_bin="$(command -v adb)"
else
  adb_bin="$sdk/platform-tools/adb"
  [[ -x "$adb_bin" ]] || die "adb not found on PATH or at $adb_bin."
fi

java_bin="${JAVA_HOME:+$JAVA_HOME/bin/java}"
if [[ -z "$java_bin" ]]; then
  java_bin="$(command -v java || true)"
fi
[[ -n "$java_bin" && -x "$java_bin" ]] || die 'Java not found. Set JAVA_HOME to a JDK 21 installation.'
java_major="$("$java_bin" -version 2>&1 | sed -nE 's/.*version "([0-9]+).*/\1/p' | head -n 1)"
[[ "$java_major" =~ ^[0-9]+$ ]] || die "Could not determine Java version from $java_bin."
(( java_major >= 21 && java_major < 25 )) || die "Java $java_major is unsupported here. Set JAVA_HOME to JDK 21 (Gradle 8.14.3 cannot run on JDK 25)."

printf '==> Checking for a connected Android device...\n'
adb_output="$("$adb_bin" devices)" || die 'adb could not list devices.'
mapfile -t devices < <(printf '%s\n' "$adb_output" | awk '$2 == "device" { print $1 }')
if [[ -n "${ANDROID_SERIAL:-}" ]]; then
  device="$ANDROID_SERIAL"
  found=false
  for connected in "${devices[@]}"; do
    if [[ "$connected" == "$device" ]]; then found=true; break; fi
  done
  "$found" || die "ANDROID_SERIAL=$device is not a connected, authorized device."
else
  case "${#devices[@]}" in
    0) die 'No device detected. Connect your phone and enable USB debugging.' ;;
    1) device="${devices[0]}" ;;
    *) die 'Multiple devices detected. Set ANDROID_SERIAL to the device to use.' ;;
  esac
fi

printf '==> Building web app...\n'
npm run build
printf '==> Configuring Android scanner and launcher assets...\n'
npm run native:configure
npm run native:assets
printf '==> Syncing Capacitor Android project...\n'
npx cap sync android
printf '==> Building debug APK...\n'
(cd android && ./gradlew assembleDebug)

apk="$repo_root/android/app/build/outputs/apk/debug/app-debug.apk"
[[ -f "$apk" ]] || die "APK not found at $apk."

printf '==> Installing APK on %s...\n' "$device"
"$adb_bin" -s "$device" install --no-streaming -r "$apk"
printf '==> Done. App installed.\n'
