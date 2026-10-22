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
│ traps/    TrapBase + 15 impls, registry       │  lifecycle: dormant→armed→triggered→active
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

## Determinism & time

- **Trap sim clock** — every trap owns `elapsed`, advanced only by `update()`; `after()` schedules on it. Pause, the death freeze and the intro stop trap time for free, and reset cancels everything.
- **Tweens on the game clock** — `core/clock.ts` drives every TweenManager from the loop delta (Phaser's default is `Date.now()`).
- **Replay harness** — `src/dev/sim.ts` (`window.__otfSim.run(levelIndex, program)`) sleeps the RAF loop and calls `game.headlessStep` at exactly 60 Hz, feeding `InputManager.scripted`. Same input → same trace. Used by `tests/e2e/levels.spec.ts`, `scripts/verify-levels.mjs`, `search.mjs`, `forgiveness.mjs`, `shoot.mjs`.

## GameScene state machine

`intro → playing ⇄ paused`, `playing → dying → playing`, `playing → complete → exiting`, any → `exiting`. Transitions go through `go(next)` against a table; illegal ones are rejected and counted (`illegalTransitions`, asserted 0 by every replay). Simulation runs only in `playing`; the view animates in every state except `paused`.

## LevelRuntime

Builds and owns one level: parses the map, bakes static ground/planks/spikes into a single texture (`core/bake.ts`, neighbour-aware edges per material), creates merged static bodies with **internal faces disabled** (no seam snags), one-way 12 px planks, the goal (can hang from ceilings), and every trap. `reset()` restores gravity, goal and traps deterministically; `destroy()` frees all.

## Traps

`TrapBase` lifecycle `dormant → armed → triggered → active → done`, with hooks `arm/fire/restore/teardown/onUpdate/onTriggered` (telegraph), `rearm()` for cycles, `suspicionPoint()` (what Pip may eye warily), `params.say` one-liners. Fifteen families in `traps/impl/` (`floors`, `hazards`, `platforms`, `goals`, `mechanisms`), mapped by `registry.ts`. Collision-relevant motion (walls, crushers, movers) is evaluated on the sim clock, never by tweens.

## Pip

`entities/Player.ts` is an invisible 20×26 Arcade body (movement math in `physics/movement.ts`: accel/decel, coyote, buffer, armed jump-cut with 50 ms minimum, 1.22× fall gravity). `entities/PipView.ts` is the visual rig (parts from `pipArt.ts`, generated at 3× in `BootScene`): springs for squash/lean/sprout/hands/gaze, run cycle by distance, 14 expressions, blink, idle glances, death gags, dizzy respawn, celebrations. The rig never touches the hitbox.

## Feedback

`feedback/FeedbackManager.ts`: `GameplayEvent → profile → sfx + haptic + camera shake`. Per-event debounce, global haptic gap with priority override, gentle mode, reduced motion, shake sink attached/detached by the active scene. Haptics: `platform/native.ts` preloads `@capacitor/haptics` once and fires without awaiting.

## Rendering & layout

`core/view.ts` picks a backing resolution (≤ 2.5×) and a logical view width (960–1280) matching the screen aspect. Cameras zoom from the top-left; the 960-wide level is centred and side margins extend the world. HUD, overlays and touch pads live in view space (scroll factor 0). Text renders at the backing resolution.

## Worlds & UI

`world/Backdrop.ts` paints each chapter (baked layers + a few owned ambient animations). `ui/widgets.ts` is the UI kit (tactile buttons, icon buttons, toggles, sliders, panels, toasts); `ui/transition.ts` the single scene transition; `anim/motion.ts` the shared durations/eases.

## Services & platform

Unchanged contract: services are pure TS (save/progress/achievements/challenge/share card); only `platform/native.ts` imports Capacitor. Audio is synthesized (`audio/synth.ts`, compressor-mixed, voice-capped); `AudioManager` runs a lookahead music sequencer with one style per chapter and resumes after iOS interruptions.
