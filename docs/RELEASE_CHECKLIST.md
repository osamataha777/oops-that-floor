# Release Checklist — v1.0 release candidate

✅ verified here by a build/test run · ⚠️ implemented, needs device or people · ⛔ blocked on accounts/credentials

## Gate A — Functional correctness

- ✅ All gameplay loops: menu → level select → play → death/instant respawn → completion → next level → finale (smoke + replay specs)
- ✅ 40 / 40 levels load and complete through real input; naive approaches fail (`levels.spec.ts`)
- ✅ State machine: explicit transition table; replays assert zero illegal transitions
- ✅ Progress, attempts, achievements and settings persist (unit + `complete.spec.ts`); corrupt saves fall back safely (unit)
- ✅ Offline: no network calls; all art/audio generated at runtime
- ✅ Settings and sharing paths implemented with graceful fallbacks (share → copy/“unavailable” toast)
- ✅ Android debug APK + release AAB build; iOS simulator Debug + Release builds
- ⚠️ Share sheet on real Android/iOS (implemented via Capacitor Share + Filesystem; not exercised on hardware)

## Gate B — Gameplay quality

- ✅ First eight levels reworked as the vertical slice (harmless first betrayal, early signature moment, first-play pad hints)
- ✅ Movement envelope measured and regression-tested (jump 109 px, tap hop 47–61 px, run jump 232 px, 0.13 s to top speed)
- ✅ Death → control 300 ms; deaths never require dismissing a dialog
- ✅ Every level has a distinct beat (see `LEVEL_AUDIT.md`)
- ⚠️ Fairness for first-time players — **human playtest required** (protocol in `PLAYTEST_PROTOCOL.md`; flagged levels in LEVEL_AUDIT)

## Gate C — Presentation

- ✅ Original mascot rig (Pip) with expressions, secondary motion, contextual reactions
- ✅ Five art-directed chapters; materials, backdrops, ambient motion; device-resolution rendering
- ✅ Consistent UI kit (tactile buttons, panels, toasts, icon buttons); menu, level select, settings, pause, completion ribbon
- ✅ FeedbackManager: tuned sound/haptic/shake per event; chapter music styles
- ⚠️ Typography uses the platform rounded font; Android shows its default sans — consider bundling an OFL rounded font
- ⚠️ Haptic comfort — needs hardware

## Gate D — Release confidence

- ✅ Regression: typecheck, 66 unit tests, 63 E2E (1 opt-in), 40 replays
- ✅ Performance measured (`docs/perf-results.json`); no leak over 200 deaths / 40 loads
- ✅ Accessibility essentials: reduced motion, screen-shake toggle, gentle mode (softer haptics/shake), high-contrast hazard outlines, haptics toggle, adjustable pad size/opacity/spacing; hazards distinguishable by shape not only colour; all audio cues have visual counterparts
- ✅ Asset licensing: no third-party assets (`ASSET_LICENSES.md`); Phaser + Capacitor MIT
- ✅ Privacy: no accounts, ads, analytics, tracking or permissions; iOS `PrivacyInfo.xcprivacy` (UserDefaults CA92.1); see `PRIVACY_POLICY.md`
- ⚠️ Physical-device run: 60 fps on a mid-range Android, iPhone safe areas, audio interruption, background/foreground
- ⚠️ Optional: gate `window.__otf*` debug handles behind a build flag

## Platform specifics

**Android** — targetSdk/compileSdk 36 (meets current Play target-API rules), minSdk 24, landscape lock, immersive edge-to-edge with cutout support, keep-screen-on, hardware Back → pause/resume/leave, zero permissions.
- ⛔ Upload keystore + `signingConfig` → signed `bundleRelease`
- ⚠️ Play pre-launch report on real devices

**iOS** — landscape only, status bar hidden, full screen, privacy manifest, audio-interruption resume.
- ⛔ Apple Developer team, signing, `xcodebuild archive` → App Store Connect
- ⚠️ TestFlight on a notched iPhone

## Store submission

- ⛔ Developer accounts (Google Play, Apple)
- ✅ Listing copy draft: `STORE_LISTING.md`
- ✅ Screenshots source: `docs/shots/after/` (re-capture at store sizes)
- ⛔ Age-rating questionnaires (expected: Everyone / 4+ — cartoon peril, no violence beyond slapstick)
- ⛔ Trademark check on the name

## Build instructions

```bash
npm ci
npm run build            # web bundle → dist/
npx cap sync             # copy into native shells
# Android (needs JDK 21, e.g. Android Studio's JBR)
cd android && ./gradlew assembleDebug bundleRelease
# iOS
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release -destination 'generic/platform=iOS' archive
```
