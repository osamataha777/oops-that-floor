# Release Checklist

Status of every requirement, verified against this repo. ✅ = verified by a build/test run in this environment. ⚠️ = implemented, needs device/store verification. ⛔ = blocked on external accounts/credentials.

## Verified in this environment

- [x] Game boots; menu → level select → gameplay → pause/death/restart flows (Playwright)
- [x] 40 original levels, all validated (`npm run validate` — 0 fatal, 2 intentional warnings)
- [x] 14 trap types implemented and used in shipped content
- [x] Sequential unlocks, attempts, settings persist (unit + integration tests)
- [x] Instant restart path exists (`LevelRuntime.reset`, no scene reload)
- [x] Coyote time, jump buffer, variable jump height (unit tested)
- [x] Challenge codes deterministic + checksummed (unit tested)
- [x] Achievements fire in simulated playthrough (integration test)
- [x] Share-card renderer exists and produces a PNG locally
- [x] Web build passes (`npm run build`)
- [x] Android debug APK compiles (`assembleDebug` — 4.5 MB)
- [x] iOS project compiles unsigned (`xcodebuild CODE_SIGNING_ALLOWED=NO`)
- [x] Landscape lock set on both platforms; zero Android permissions
- [x] No third-party assets; procedural art/audio only
- [x] No network calls / accounts / ads / analytics

## Needs real-device verification before store submission

- [ ] ⚠️ Playtest all 40 levels end-to-end on a phone — solvability BFS proves a path exists; fairness/timing still needs humans
- [ ] ⚠️ Touch controls: multitouch feel, button placement/scaling on small + large screens
- [ ] ⚠️ Safe-area padding on notched devices (adapter implemented, untested on hardware)
- [ ] ⚠️ Haptics intensity/appropriateness on Android + iOS
- [ ] ⚠️ 60 FPS on a mid-range device (desktop Chrome measured 60; mobile TBD)
- [ ] ⚠️ Background/foreground resume; audio interruption behavior
- [ ] ⚠️ Offline first-launch on installed builds (Airplane-mode cold start)
- [ ] ⚠️ Long-session soak: 200+ deaths, no leak/jank

## External blockers (store submission)

- [ ] ⛔ Google Play + Apple Developer accounts
- [ ] ⛔ Android release keystore → `keystore.properties` + `./gradlew bundleRelease`
- [ ] ⛔ iOS distribution certificate/provisioning → Xcode Archive → App Store Connect
- [x] App icon set — original procedurally-drawn `icon-1024.png` deployed to Android mipmap densities (incl. adaptive foreground) and iOS `AppIcon`
- [ ] ⛔ Store listing assets: screenshots, feature graphic, description, privacy label
- [ ] ⛔ Formal trademark check on "Oops! That Floor!" (alternatives ready)
- [ ] ⛔ App-store age rating / content questionnaires
- [ ] ⛔ Optional: `apple-app-site-association` + Android App Links if challenge deep links ship

## Known limitations

- `npm audit --omit=dev` is clean (0 production vulnerabilities); 3 moderate findings exist in dev-only tooling — re-check on dependency updates.
- Playwright E2E covers boot/navigation smoke only; per-level solvability is asserted structurally (validator + jump sanity) but needs human playtesting.
- Bundle is ~1.3 MB JS (~350 KB gzipped) — dominated by Phaser; acceptable for install size but consider code-splitting scenes if startup time matters on low-end devices.
