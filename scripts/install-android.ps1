# Builds the web app, syncs it into the Android project, builds a debug APK,
# and installs it on a connected/USB-debugging-enabled Android device via adb.

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$jdk25 = "C:\Program Files\Eclipse Adoptium\jdk-25.0.1.8-hotspot"
$androidSdk = "$env:LOCALAPPDATA\Android\Sdk"

if (Test-Path $jdk25) {
    $env:JAVA_HOME = $jdk25
}
$env:ANDROID_HOME = $androidSdk
$env:ANDROID_SDK_ROOT = $androidSdk

Set-Location $repoRoot

Write-Host "==> Building web app..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { throw "Web build failed" }

Write-Host "==> Syncing Capacitor Android project..." -ForegroundColor Cyan
npx cap sync android
if ($LASTEXITCODE -ne 0) { throw "Capacitor sync failed" }

Write-Host "==> Building debug APK..." -ForegroundColor Cyan
Set-Location "$repoRoot\android"
.\gradlew.bat assembleDebug
if ($LASTEXITCODE -ne 0) { throw "Gradle build failed" }
Set-Location $repoRoot

$apk = "$repoRoot\android\app\build\outputs\apk\debug\app-debug.apk"
if (-not (Test-Path $apk)) { throw "APK not found at $apk" }

$adbCmd = Get-Command adb -ErrorAction SilentlyContinue
$adb = if ($adbCmd) { "adb" } else { "$androidSdk\platform-tools\adb.exe" }
if (-not (Test-Path $adb) -and -not $adbCmd) { throw "adb not found on PATH or at $androidSdk\platform-tools\adb.exe" }

Write-Host "==> Checking for connected device..." -ForegroundColor Cyan
$devices = (& $adb devices) | Select-Object -Skip 1 | Where-Object { $_.Trim() -ne "" }
if (-not $devices) {
    Write-Host "No device detected. Connect your phone via USB with USB debugging enabled, then re-run this script." -ForegroundColor Yellow
    exit 1
}

Write-Host "==> Installing APK on device..." -ForegroundColor Cyan
& $adb install -r $apk
if ($LASTEXITCODE -ne 0) { throw "adb install failed" }

Write-Host "==> Done! App installed." -ForegroundColor Green
