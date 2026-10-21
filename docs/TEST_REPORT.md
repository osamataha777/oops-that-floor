# Test Report

Environment: macOS (Apple Silicon), Node 26, Chrome via Playwright, Android SDK + JBR-21, Xcode 27.1.

## Automated results

| Suite | Command | Result |
| --- | --- | --- |
| Typecheck | `npx tsc --noEmit` | ✅ 0 errors |
| Unit + integration (Vitest) | `npm test` | ✅ 53 tests, 6 files |
| Level validator | `npm run validate:levels` | ✅ 40 levels, 0 fatal, 2 intentional warnings |
| Web build | `npm run build` | ✅ `dist/` ~1.3 MB JS (~348 KB gzip) |
| Browser E2E smoke | `npm run test:e2e` | ✅ 3/3 (boot→play, level select, pause/resume) |
| Android debug | `./gradlew assembleDebug` | ✅ `app-debug.apk` (4.5 MB) |
| iOS build (unsigned) | `xcodebuild CODE_SIGNING_ALLOWED=NO` | ✅ `App.app` for arm64 iOS 15+ |

## Coverage map

**Unit** (`tests/unit/`):
- `movement.test.ts` — accel/decel, turnaround boost, fall clamp, variable-jump cut (both gravity signs), coyote-window expiry, buffer landing fire, single-consume.
- `save.test.ts` — save/settings decode: corruption recovery, range clamps, malformed-record dropping, round-trips.
- `progress` inside `save.test.ts` — attempts, unlock-on-complete, first-try detection, chapter-complete event, completion counting.
- `challenge.test.ts` — codec round-trips, determinism, checksum tamper rejection, malformed input, level-range enforcement, share text.
- `levels.test.ts` — registry integrity (40 = 5×8, unique ids, ≥12 trap types), zero fatal validation issues, parser extraction, run-merging, marker collection.
- `traps.test.ts` — trap-type surface (14 types), geometry helpers.

**Integration** (`tests/integration/flow.test.ts`): simulated full playthrough — all 40 levels unlock sequentially, 80 deaths recorded, achievements (`first-blood`, `persistent`, `chapter-1`, `all-clear`) fire, save survives an encode→decode "app restart", challenge codes resolve to real levels.

**E2E** (`tests/e2e/smoke.spec.ts`): real Chromium against the production build — canvas boots without page errors, Play enters gameplay, keyboard movement/jump works, level select opens and enters a level, Esc pause/resume cycle is clean.

## Manual verification (screenshots)

Verified visually via headed-Chromium captures: menu (title, buttons, character), level select (chapter headers, lock/completion states), gameplay (tiles, spikes, goal door, HUD chips), and the death loop — stepping on the collapse trap in `1-1` produced the gag + quip ("★ Floor 1, You 0"), death counter incremented, and the player respawned.

## Performance measurement

Headed Chromium, `requestAnimationFrame` sampling over 300 frames while moving through level 1-1:

| Metric | Value |
| --- | --- |
| Average FPS | **60.0** |
| p1 (worst 1%) | 56.8 |
| Min frame | 56.8 |
| JS heap | ~54 MB |

Startup: dev-server cold load to interactive menu ≈ 1.5 s (includes texture generation). Restart latency measured interactively: death → control returns visibly within one quip beat, well under the 700 ms target — `LevelRuntime.reset()` does not restart the scene.

## Validation gaps (honest)

- **No physical-device run** — touch feel, haptics, safe areas, thermal/perf on real hardware unverified.
- **Solvability is structural** — validator + jump-sanity + reachability, not a physics bot. Human playtesting of all 40 levels remains on `RELEASE_CHECKLIST.md`.
- **E2E is smoke-level** — it does not play levels to completion.
- `npm audit --omit=dev`: **0 vulnerabilities** in production deps. The 3 moderate findings are dev-toolchain only (esbuild/vite advisory); they do not ship to builds but should be re-checked on dependency updates.
