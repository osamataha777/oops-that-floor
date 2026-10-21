# Repository Assessment

Assessment of the two reference repositories performed before implementation.
This project is **not** a fork of either repository — it is an original game
built on the same technical foundation (Phaser 3 + TypeScript + Vite).

## 1. `arjan/leveldevil` (primary technical foundation)

- **Stack**: Phaser 3.80, TypeScript, Vite 5, Arcade Physics, Tiled JSON maps
  (`public/assets/maps/level1..11.json`), MIT license.
- **Structure**: `BootScene` → `PreloadScene` → `GameScene` + `UIScene`
  (virtual touch buttons) + `VictoryScene` + `MobileOrientationScene`.
- **Game config** (`src/game/GameConfig.ts`): `Phaser.AUTO`, `pixelArt: true`,
  480×270 logical resolution with `Scale.FIT`, gravity 1600, `activePointers: 3`.
- **Player** (`src/objects/Player.ts`): solid controller — speed 200,
  jump velocity −500, coyote time 80 ms, jump buffer 100 ms, variable jump
  height via min/max hold time (100–300 ms), WASD + cursors + virtual buttons
  exposed by `UIScene`.
- **Traps**: implemented ad-hoc inside `GameScene` (hidden layer tiles, spike
  sprites, falling objects, slimes, a mushroom boss). No reusable trap engine;
  trap logic is interleaved with scene code and keyed to specific Tiled maps.
- **Assets**: Pixel Adventure pack (Pixel Frog). The pack is distributed free
  of charge (CC0-like), but it is a pixel-art style that does not match the
  required premium flat-cartoon identity. Not reused.

### Worth retaining (concepts, not code)

- Coyote/buffer/variable-jump timing values — proven feel.
- `activePointers: 3` for multitouch, `Scale.FIT` for mobile.
- Separate UI overlay scene pattern for touch controls.

### Missing / technical debt

- No trap lifecycle framework, no data-driven trap declarations.
- Level data requires an external Tiled editor pipeline — heavyweight for a
  single-screen rage platformer; replaced here by a typed ASCII-map DSL that is
  validated in CI.
- Health/invulnerability model doesn't fit instant-death/rage design.
- Full scene restart on death; no sub-700 ms in-place reset.
- No persistence, settings, audio, achievements, sharing, or tests.
- No Capacitor packaging.

## 2. `Leonxlnx/level-devil` (gameplay reference — "FableDevil")

- **Stack**: one-file vanilla Canvas 2D game (`game.js`, ~2 200 lines), no
  engine, no build system, MIT license.
- **Design strengths**:
  - Every trap implements a uniform interface —
    `update(dt,g)`, `solids()`, `kills()`, `draw()` — which inspired our trap
    lifecycle contract (dormant → armed → triggered → active → completed).
  - Trap repertoire worth studying: `CollapseFloor` (shake → fall),
    `PopSpikes` (proximity/periodic), `FallBlock` (drops, then becomes safe
    ground), `FakeDoor`, swinging spiked bob, timed spike patterns.
  - Flat pastel palette per theme — matches our visual direction.
  - 30 imperatively scripted levels; each hand-placed, no repetition.
- **Not reused**: it is imperative Canvas code, not Phaser; merging it would
  fight the Arcade physics model. Levels are hard-coded rect lists — our
  ASCII DSL is more maintainable and auditable.

## 3. Licensing audit

| Source | License | Used? |
| --- | --- | --- |
| arjan/leveldevil code | MIT | Concepts only (no code copied) |
| Pixel Adventure art (Pixel Frog) | Free/CC0 | **No** — style mismatch |
| Leonxlnx/level-devil code | MIT | **No** — gameplay ideas only |
| Phaser 3 | MIT | Yes (runtime dependency) |
| Capacitor | MIT | Yes (packaging) |

**Decision**: all in-game art is generated procedurally at boot via Phaser
`Graphics → generateTexture`, and all audio is synthesized at runtime via
WebAudio. The game therefore ships **zero third-party art or audio files**,
eliminating redistribution risk entirely. See `ASSET_LICENSES.md`.

## 4. Selected architecture (implemented)

- Phaser 3.90 + TypeScript + Vite + Arcade Physics.
- Logical resolution 960×540 (32×18 tiles @ 30 px), `Scale.FIT`, landscape.
- Data-driven ASCII-map level DSL + declarative trap definitions, validated
  by `scripts/validate-levels.ts` and Vitest.
- Modular trap engine (13 trap types) with a uniform lifecycle and event bus
  for chain reactions.
- In-place deterministic reset (no scene restart) targeting < 700 ms
  death → control.
- Capacitor 8 for Android/iOS; local-first persistence
  (`@capacitor/preferences` on native, `localStorage` on web).

## 5. Risk assessment

| Risk | Mitigation |
| --- | --- |
| 40 hand-designed levels is the largest content cost | Compact ASCII DSL; validator + solvability lint per level |
| Moving-platform carry & rotating hazards under Arcade physics (AABB bodies) | Kinematic bodies + manual delta transfer; orbiting sensor bodies |
| Sub-700 ms restart with many live tweens/timers | Per-level runtime registry; all trap timers tracked & cancelled on reset |
| WKWebView `localStorage` eviction | `@capacitor/preferences` on native builds |
| Store name collision | Basic availability search performed; full trademark check left on release checklist |
| No physical devices in CI | Playwright browser smoke tests + explicit `TEST_REPORT.md` section listing untested device paths |
