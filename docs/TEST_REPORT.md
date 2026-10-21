# Test Report

Environment: macOS (Apple Silicon), Node 26, Chrome via Playwright, Android SDK + JBR-21, Xcode 27.1.

## Automated results

| Suite | Command | Result |
| --- | --- | --- |
| Typecheck | `npx tsc --noEmit` | ✅ 0 errors |
| Unit + integration (Vitest) | `npm test` | ✅ 57 tests, 6 files |
| Level validator | `npm run validate:levels` | ✅ 40 levels, **0 warnings** (3-2/3-8 goal-head carved in V2.1) |
| Solvability BFS | (part of validator + `levels.test.ts`) | ✅ all 40 have a plausible path |
| Web build | `npm run build` | ✅ `dist/` ~1.3 MB JS (~352 KB gzip) |
| Browser E2E | `npm run test:e2e` | ✅ 21/21 — smoke, bot 1-1, pause, one-way, multitouch (2), states (5), world-remembers, level beats (6), perf |
| Android debug | `./gradlew assembleDebug` | ✅ BUILD SUCCESSFUL (JDK 21, V2.1 re-verified) |
| iOS build (unsigned) | `xcodebuild … iphonesimulator` | ✅ BUILD SUCCEEDED (Xcode 27.1, V2.1 re-verified) |
| iOS Simulator run | `xcodebuild … iphonesimulator` + `simctl install/launch` | ✅ game boots to menu in landscape on iPhone 17 Pro sim (screenshot-verified, earlier pass) |

## Coverage map

**Unit** (`tests/unit/`):
- `movement.test.ts` — accel/decel, turnaround boost, fall clamp, variable-jump cut (both gravity signs), coyote-window expiry, buffer landing fire, single-consume.
- `save.test.ts` — save/settings decode: corruption recovery, range clamps, malformed-record dropping, round-trips.
- `progress` inside `save.test.ts` — attempts, unlock-on-complete, first-try detection, chapter-complete event, completion counting.
- `challenge.test.ts` — codec round-trips, determinism, checksum tamper rejection, malformed input, level-range enforcement, share text.
- `levels.test.ts` — registry integrity (40 = 5×8, unique ids, ≥12 trap types), zero fatal validation issues, parser extraction, run-merging, marker collection, and **trap-aware solvability** — a BFS with the real jump envelope that verifies a spawn→goal path exists through movers, ghosts, lethal cells, and gravity flips.
- `traps.test.ts` — trap-type surface (14 types), geometry helpers.

**Integration** (`tests/integration/flow.test.ts`): simulated full playthrough — all 40 levels unlock sequentially, 80 deaths recorded, achievements (`first-blood`, `persistent`, `chapter-1`, `all-clear`) fire, save survives an encode→decode "app restart", challenge codes resolve to real levels.

**E2E** (`tests/e2e/`), 21 tests against the production build:
- `smoke.spec` — boot→play, level select, pause/resume.
- `complete.spec` — scripted bot completes 1-1 & unlocks 1-2 (real input); death→respawn latency on the game clock.
- `oneway.spec` — one-way plank: pass-through up, solid landing, gravity-flip face swap. Caught a real level bug (1-5 unreachable).
- `worldremembers.spec` — 5-4 verified live across attempts: try 1 spikes armed/bridge dormant → try 2 bridge crumbles on touch.
- `states.spec` — pause ignored while dying, manual restart during death anim, pause→resume, challenge payload → Game scene.
- `multitouch.spec` — **real two-finger CDP touch** (right+jump simultaneously, verified the player both moves and jumps), plus synthetic-pointer router: ownership, slide handoff, cancel, multi-press, dead zone, missed-pointerup recovery.
- `levels-v21.spec` — the six re-authored beats played live: 3-4 wrong-button brick, 4-4 door→bridge chain, 3-7 adaptation across attempts, 5-6 door-bait death, 5-1 sprint+sting, 4-7 ghost-step fall.
- `perf.spec` — measurements below (run serially / headed for honest numbers; under parallel-worker contention it reports but skips timing budgets, since rAF is CPU-starved and the numbers aren't device-representative).

## Manual verification (screenshots)

Verified visually via headed-Chromium captures: menu (title, buttons, character), level select (chapter headers, lock/completion states), gameplay (tiles, spikes, goal door, HUD chips), and the death loop — stepping on the collapse trap in `1-1` produced the gag + quip ("★ Floor 1, You 0"), death counter incremented, and the player respawned.

## Performance measurement (V2.1, `perf.spec.ts` — headed Chromium, Apple Silicon)

| Metric | Target | Measured |
| --- | --- | --- |
| Cold nav → menu ready | <3 s | **868 ms** |
| Level start → playing | <1.5 s | **612 ms** |
| Frame time p50 / p95 / p99 | 16.7 ms | **16.7 / 17.2 / 17.6 ms (60.1 FPS)** |
| Restart latency p50 / p95 (game clock, 20 deaths) | <700 ms | **151 / 333 ms** |
| JS heap across 12 level reloads | no growth | **−27.7 MB (GC — no leak)** |

Headless-CI reference only: ~23 fps under the software rasterizer — not
device-representative; headed numbers above are the honest ones on this machine.

## Validation gaps (honest)

- **No physical-device run** — touch feel, haptics, safe areas, thermal/perf on real hardware unverified.
- **Solvability is now semi-formal** — the trap-aware BFS proves a path exists within the real jump envelope (it caught and fixed real authoring issues during development), but it doesn't model timing fairness, crusher cycles, or coyote-tight windows. Human playtesting of all 40 levels remains on `RELEASE_CHECKLIST.md`.
- **E2E input-completes 1-1** (bot) and plays through the redesigned beats of 9 levels; the remaining 31 are BFS-solved + rule-validated, not end-to-end input runs (see `docs/LEVEL_AUDIT.md`).
- **V2.1 spike-lethality fix changed effective difficulty** — ~10 levels now deliver their designed stings for the first time; deaths-per-level tuning needs real playtest data before store submission.
- Per-level validation status is tracked in `docs/LEVEL_AUDIT.md`.
- `npm audit --omit=dev`: **0 vulnerabilities** in production deps. The 3 moderate findings are dev-toolchain only (esbuild/vite advisory); they do not ship to builds but should be re-checked on dependency updates.
