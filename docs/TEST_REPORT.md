# Test Report

Measured on 2026-10-22 against the release-candidate commit on
`feat/gameplay-experience-overhaul-v2` (macOS, Apple silicon, Node 26,
Chromium via Playwright 1.55). Everything below was run, not inferred.
This replaces the V2.1 report, whose claims predated the current tests.

## Summary

| Layer | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | ✅ clean |
| Unit + integration | `npm test` | ✅ 66 / 66 (7 files) |
| Level validation | `npm run validate:levels` | ✅ 40 valid, 0 fatal (9 BFS warnings — see below) |
| Input-replay proof, all levels | `node scripts/verify-levels.mjs` | ✅ 40 / 40 complete; 39 / 39 naive runs fail (3-1 is an honest opener) |
| E2E (Playwright) | `npx playwright test --workers=2` | ✅ 62 passed, 1 skipped (wall-clock perf probe, opt-in `PERF=1`) |
| Performance / soak | `node scripts/perf.mjs --headed` | see below; raw data `docs/perf-results.json` |
| Timing tolerance | `node scripts/forgiveness.mjs 60 3` | see `docs/forgiveness.json` and LEVEL_AUDIT |
| Android | `./gradlew assembleDebug bundleRelease` (JDK 21) | ✅ APK 5.4 MB, AAB 3.5 MB (unsigned); APK installs + boots on API 37 emulator |
| iOS | `xcodebuild … -sdk iphonesimulator` Debug + Release | ✅ builds; runs on iPhone 17 Pro simulator (iOS 26.5) |

## What the E2E suite covers

| Spec | What it proves |
|---|---|
| `levels.spec.ts` (40 tests) | Each level completes through real input on the deterministic sim, with the expected death count and zero illegal state transitions; each naive approach fails. |
| `mechanics.spec.ts` | 3-3 changes after a death; 5-4 pity pillar; 5-8 fake-exit → stair chain in order and the door's ceiling hop; 1-7 wall retracts; 1-6 swept crush; identical input → identical trace. |
| `multitouch.spec.ts` | Real two-finger CDP touch (hold right + jump); router ownership, slide hand-off, cancel, multi-press, dead zone, missed-up recovery, **up-outside release, no dir→jump slide, held direction survives respawn, pause releases pads and blocks overlay taps**. |
| `mobile.spec.ts` | Phone-aspect view widens; rendered pads drive movement and jump. |
| `smoke.spec.ts` | Real clicks: menu Play → 1-1; Levels → tile → game; back button; HUD pause → Resume; settings toggle persists. |
| `states.spec.ts` | Pause ignored while dying; manual restart mid-death; pause/resume; challenge payload. |
| `oneway.spec.ts` | One-way plank: pass up, land down, faces swap under flipped gravity. |
| `complete.spec.ts` | Completing 1-1 by input persists progress and unlocks 1-2; death→control p95 < 0.7 s. |

Unit tests cover movement math, jump assist, save/settings decode &
migration, challenge codes, achievements, level registry/parse/validation,
trap registry, and the FeedbackManager (routing, per-event debounce, global
haptic gap with priority override, haptics toggle, gentle mode, reduced
motion, shake detach, every profile maps to a real synth patch).

**Why replays instead of real-time bots:** headless Chromium renders this
game at ~5 fps, so real-time bots time out or drift. The replay harness
steps the real game at an exact 60 Hz, which also makes every level proof
deterministic and CI-stable. Real-time input is still covered by the
touch/mouse specs and by real-time headed recordings
(`docs/shots/after/*.webm`, which complete 1-4, 3-3 and 5-8).

**BFS warnings:** the coarse structural solver cannot model fall-block
stairs, retracting walls, springs or timed flips, so it reports "no path"
for 1-6, 1-7, 2-6, 3-2, 3-8, 4-6, 4-8, 5-4, 5-8. All nine are proven by
input replay; the unit test requires every level to have a replay *or* a
BFS path.

## Performance (desktop, headed Chromium, 2.5× render resolution)

| Metric | Result |
|---|---|
| Live play | 60.1 fps; p95 frame interval 17.7 ms (vsync-bound) |
| Full frame incl. WebGL render | p50 2.5 ms · p95 3.0 ms · p99 3.5 ms |
| Game logic per frame | 0.017–0.051 ms |
| Death → control | 300 ms (p50 and p95, game clock) |
| 200 deaths in one visit | heap +0.37 MB (13.16 → 13.53); physics bodies 24 → 24 |
| 40 consecutive level loads | heap +0.40 MB; level load + 30 frames p50 15 ms |
| Cold start to interactive menu | 841 ms (local preview) |

Not measured: frame rate on physical phones. These numbers bound CPU cost
and rule out leaks; they do not prove mid-range Android performance.

## Not verified (needs hardware or people)

- Haptic intensity/comfort on Android and iOS hardware (browser tests only
  prove event routing — the `FeedbackManager` log).
- Touch latency, pad reach and thermals on physical phones.
- Real audio interruptions (calls, Siri) and background/foreground on device.
- Human playtest — no player data exists; nothing in this repo claims any.
