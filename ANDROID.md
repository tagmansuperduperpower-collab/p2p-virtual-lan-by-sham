# Android build

## Toolchain

Build ini menggunakan JDK 21, Android command-line tools, Android platform 36 dan Gradle 8.14.3 melalui Capacitor 8.6.2. `npx cap doctor` melaporkan Android looking great dan `npm audit --omit=dev` melaporkan 0 vulnerability.

## Build debug APK

```bash
export JAVA_HOME="$HOME/android-toolchain/jdk"
export ANDROID_HOME="$HOME/android-sdk"
export ANDROID_SDK_ROOT="$HOME/android-sdk"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$HOME/android-toolchain/gradle/bin:$PATH"
npx cap sync android
cd android
./gradlew assembleDebug
```

Artifact berada di `android/app/build/outputs/apk/debug/app-debug.apk`.

## Signaling Android

APK ini memuat URL HTTPS Preview semasa melalui `capacitor.config.json`, lalu menggunakan WebSocket secure (`wss`) untuk signaling. Ini membolehkan APK debug berfungsi tanpa cuba menyambung ke `capacitor://localhost`. Untuk release production, tukar URL itu kepada domain server signaling yang kekal sebelum build semula.

## Semakan yang dibuat

- Manifest: `com.sham.p2pvirtualan`, min SDK 24, target SDK 36, permission INTERNET.
- APK zip integrity: lulus.
- HTTPS `/health`: lulus.
- WSS `/signal`: lulus.
- Capacitor Doctor: Android looking great.
- Dependency audit: 0 vulnerability.

## Had yang masih terbuka

APK debug belum ditandatangani untuk release Play Store. Ia juga bergantung kepada server signaling Preview yang sedang hidup. Untuk edaran awam, sediakan domain/backend signaling production, TURN fallback dan signing key release.
