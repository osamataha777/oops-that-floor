# Architecture

## Stack

Phaser 3.90 · TypeScript · Vite 8 · Vitest · Playwright · Capacitor 8 (android + ios).

## Layering

```
┌──────────────────────────────────────────────┐
│ scenes/   Boot Menu LevelSelect Game          │  Phaser world, UI, state machine
├──────────────────────────────────────────────┤
│ runtime/  LevelRuntime                        │  instantiates a level in a scene, owns
│ entities/ Player                              │  trap instances + reset lifecycle
├──────────────────────────────────────────────┤
│ traps/    TrapBase + 14 impls, registry       │  lifecycle: dormant→armed→triggered→active
│ levels/   DSL parser + validator + 40 defs    │  data-driven, scene-agnostic
├──────────────────────────────────────────────┤
│ physics/  movement math                       │  pure TS — no Phaser imports
│ services/ save progress achievements share    │  pure TS — unit tested headlessly
│ platform/ native adapter                      │  Capacitor isolated behind an interface
└──────────────────────────────────────────────┘
```

The hard rule: **game logic never imports Capacitor; services never import Phaser.** Everything above the pure layer is disposable and replaceable.

## Scene graph

`BootScene` (procedural textures, audio unlock) → `MenuScene` ↔ `LevelSelectScene` → `GameScene` (all 40 levels, parameterized by `levelIndex`). Pause, settings, completion, and death are *overlays inside GameScene*, not scenes — restart never pays a scene-boot cost.

## LevelRuntime

`src/game/runtime/LevelRuntime.ts` is the unit of reset:

- Parses the level def once; builds tile solids, goal, spawn, and every trap instance via the trap registry.
- Owns all physics colliders and trap-owned timers/tweens.
- `reset()` restores every trap to `dormant`, re-arms triggers, resets moving parts and gravity — deterministic, no leaked callbacks.
- `destroy()` on scene shutdown frees everything.

This is what makes the <700 ms instant restart possible: death never re-boots Phaser.

## Trap engine

- `TrapBase` (`src/game/traps/TrapBase.ts`): lifecycle enum, `update(dt)`, `onPlayerDead()`, trigger-condition evaluation (`area`, `proximity`, `jump`, `land`, `timer`, `chain`), kill/body queries.
- Implementations in `traps/impl/` grouped by family: `floors`, `hazards`, `platforms`, `goals`, `mechanisms` (+`draw` helpers).
- **Registry** (`traps/registry.ts`) maps `TrapType → constructor` — level defs reference types by string; no hardcoded level numbers anywhere in trap code.
- Trap params (delay, speed, duration, reset behavior, `link`/`chain` targets, `onDeath` attempt gating) all come from the level definition.

## Level data

ASCII-map DSL: 32 chars/row × 18 rows. Legend includes `#` solid, `.` empty, `P` spawn, `G` goal, and trap markers (`c` collapse, `s` hidden spikes, `f` fall block, `w` surprise wall, `v` conveyor, `m` mover anchor, `d` fake door, `y` shy goal, `p` pressure plate, `g` gravity pad, `r` spinner, `k` crusher, `e` timed plank, `t` teleport goal).

`parse.ts` merges solid cells into maximal horizontal runs (fewer physics bodies), extracts markers into a lookup, and `validate.ts` enforces: row/col counts, single spawn/goal, marker↔trap-def correspondence, reachability flood-fill, jump-apex sanity, known trap types. `npm run validate` fails CI on any fatal issue.

## Player

`Player.ts` wraps an Arcade body: horizontal accel/decel via `nextVelocityX`, coyote/buffer via `JumpAssist` (both pure, in `physics/movement.ts`), variable jump via `applyJumpCut` on release, gravity-flip support (all math parameterized by gravity sign). Input is an `InputState` struct — the same struct is produced by keyboard *and* `TouchControls` (multitouch zones, scalable, edge-detection), so gameplay code is input-agnostic.

## Services

- `storage.ts` — `KVStore` interface; web uses `localStorage`, native uses `@capacitor/preferences`. Saves are JSON, versioned (`version: 1`), and `decodeSave` sanitizes every field (clamps ranges, drops malformed records, recovers from corruption).
- `progress.ts` — attempt/completion recording, sequential unlock, chapter-complete events.
- `achievements.ts` — declarative achievement defs evaluated against save + gameplay events.
- `challenge.ts` — `OTF-` codec; `shareCard.ts` — canvas renderer for the failure card.
- `services.ts` (game/core) — a tiny context object wiring storage+save+settings, created at boot; scenes read it rather than touching globals.

## Platform adapter

`src/platform/native.ts` exposes `PlatformAdapter` with `haptic()`, `shareCard()`, `onBack()`, `safeArea`, `isNative`. Web implementation is a no-op/clipboard fallback; native uses Haptics/Share/App plugins. Nothing else in the codebase imports `@capacitor/*`.

## Audio

`audio/synth.ts` synthesizes every sound (jump, land, spike, splat, pop, door, victory, UI) from oscillators/noise through WebAudio — zero audio files. `AudioManager` gates on first user gesture (mobile unlock), respects music/SFX sliders, suspends on `visibilitychange`/`pause` events.

## Performance design

- One texture atlas of procedurally generated sprites; no external image loads at runtime.
- Solids merged into run-length bodies; trap kill checks use precomputed rects; per-frame allocations avoided (reused `Rect`/`InputState` objects).
- Particle bursts are short-lived `Graphics`-based emitters, pooled by Phaser.
- Physics is fixed-step Arcade; `fps.target` unset (vsync-driven).
- Measured (desktop Chrome, headed): ~60 FPS avg, p1 ≈ 56.8 — see `docs/TEST_REPORT.md`.

## Known extension points (v1 intentionally unimplemented)

- **Monetization**: `services/` would host a rewarded-ads adapter behind `PlatformAdapter`; no SDK imported.
- **Deep links for challenges**: codec is URI-ready (`OTF-` codes); add `universalLinks`/`App Links` config when a domain exists.
- **Cosmetics**: character texture generation is parameterized; palette variants can ship as data.
