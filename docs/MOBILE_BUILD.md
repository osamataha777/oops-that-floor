# Mobile Build Guide

Capacitor 8 packages the Vite `dist/` build into native Android and iOS shells. The game is fully offline — no permissions beyond the defaults.

## Prerequisites

- Node.js ≥ 20, npm
- **Android:** Android Studio (bundles JDK 21 + SDK). `ANDROID_HOME` must point at the SDK (this machine: `~/Library/Android/sdk`).
- **iOS:** Xcode 16+ on macOS. CocoaPods is *not* needed — Capacitor 8 uses Swift Package Manager (`ios/App/CapApp-SPM`).

## Everyday workflow

```bash
npm run build          # produce dist/
npx cap sync           # copy web assets + plugin config into both projects
npx cap open android   # → Android Studio
npx cap open ios       # → Xcode
```

## Android

### Debug APK (verified working)

```bash
cd android
JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" ./gradlew assembleDebug
# → android/app/build/outputs/apk/debug/app-debug.apk (~4.5 MB)
```

> The Gradle toolchain requires **JDK 21**; the system JDK here is 17, so we point `JAVA_HOME` at Android Studio's bundled JBR. If `java -version` already reports 21+, plain `./gradlew assembleDebug` works.

### Configuration already applied

- `AndroidManifest.xml`: `screenOrientation="landscape"`, `configChanges` covers rotation/keyboard so the WebView is never recreated.
- **Zero permissions** — the default `INTERNET` permission was removed; the game never touches the network.
- Back button: handled via `@capacitor/app` in `src/platform/native.ts` → pauses in-game, backs out of menus, exits at the main menu.
- Edge-to-edge: safe-area insets feed `PlatformAdapter.safeArea`, used to pad HUD/touch controls.
- Haptics: `@capacitor/haptics` (land/death/victory, gated by the in-game toggle).
- Share: `@capacitor/share` native share sheet for failure cards/challenges.
- Persistence: `@capacitor/preferences` (falls back to `localStorage` on web).

### Release AAB

```bash
cd android
./gradlew bundleRelease   # → app/build/outputs/bundle/release/app-release.aab
```

Requires a signing config: create `android/keystore.properties` (see `RELEASE_CHECKLIST.md`) or configure signing in Android Studio → Generate Signed Bundle. Do **not** commit keystores or passwords.

## iOS

### Debug build (unsigned, verified compiling)

```bash
cd ios/App
xcodebuild -project App.xcodeproj -scheme App -configuration Debug \
  -destination 'generic/platform=iOS' CODE_SIGNING_ALLOWED=NO build
```

For a device/simulator run, open `ios/App/App.xcodeproj` in Xcode, pick a team (Signing & Capabilities) and Run.

### Configuration already applied

- `Info.plist`: landscape-left/right only (iPhone + iPad).
- `capacitor.config.ts` → `ios.contentInset: 'never'`, `scrollEnabled: false` — no WKWebView rubber-banding over the game canvas.
- Safe-area: same `PlatformAdapter.safeArea` path as Android.
- Audio: WebAudio unlocks on first touch; `AudioManager` suspends on app backgrounding.

### Release archive

Xcode → select "Any iOS Device" → **Product ▸ Archive** → Distribute (App Store Connect). Requires an Apple Developer account, bundle id `com.oopsthatfloor.game` must be registered, and a distribution certificate/provisioning profile. See `RELEASE_CHECKLIST.md`.

## Versioning

- `package.json` `version` is the source of truth → mirror into `android/app/build.gradle` (`versionName`/`versionCode`) and Xcode (`MARKETING_VERSION`/`CURRENT_PROJECT_VERSION`) before a release.
