# Final Overhaul Audit — Oops! That Floor!

Branch `feat/gameplay-experience-overhaul-v2`, audited from commit `5d1010c`
(V2.1) and carried through to the current release candidate. Every "fixed"
item below has the evidence named next to it; nothing is marked done on
reasoning alone.

**How evidence was gathered.** A deterministic replay harness
(`src/dev/sim.ts`) pauses the real-time loop and steps the *actual* game —
scenes, Arcade physics, traps, tweens, timers — at an exact 60 Hz, feeding
input through the same `InputManager` the touch router drives. Identical
input gives an identical trace (asserted in `tests/e2e/mechanics.spec.ts`).
That made it possible to find, reproduce and regression-test defects that
real-time Playwright bots could not see (headless rendering runs at ~5 fps).

---

## 1. Baseline (before)

| Check | Result at `5d1010c` |
|---|---|
| `npm run typecheck`, unit tests (57), `validate:levels`, build | pass |
| Playwright E2E | 20/21 serially; the 1-1 bot fails (wall-clock bot at ~5 fps headless) |
| Level proof | coarse BFS only; no input-driven proof for any level except 1-1 |
| Screenshots | `docs/shots/baseline/` (captured fresh, 2× DPR) |

## 2. Confirmed defects (all fixed)

| # | Defect | Player impact | Fix | Evidence |
|---|---|---|---|---|
| D1 | `HiddenSpikesTrap.pop()` set `out` only after a 110 ms timer, so the periodic check re-called `pop()` every frame in between — overlapping tweens and timers, unbounded `timers[]` growth | jittery spikes; memory growth on rhythm levels | one idempotent `exposed` flag; lethality starts when the rise ends; visible peek telegraph | `hazards.ts`; 200-death soak flat (§5) |
| D2 | Trap timers ran on the Phaser scene clock | fuses/collapses kept running while paused and during the death freeze | per-trap simulation clock, advanced only by `update()` | `TrapBase.ts`; mechanics/levels specs |
| D3 | Phaser tweens use `Date.now()`, not the game loop | visual/physics drift on frame stalls; non-replayable | tweens driven by the loop delta (`core/clock.ts`) | replay determinism test |
| D4 | Adding bodies to the `dynamics` group reset them to `allowGravity:true, immovable:false` | walls were pushable (3-4's wall could be walked through); fall blocks dropped on load | group created with gravity off / immovable on | 3-4 replay: blocked before plate, passes after |
| D5 | Each ground row was its own body; Arcade resolves Y before X, so seams on wall faces read as ceilings | **Pip could not jump while pressed against most ledges** | stacked runs merged; fully covered static faces disabled ("internal edges") | 1-4 / 2-7 traces; all 40 replays |
| D6 | Falling blocks moved ~20 px/frame near the ground and skipped over Pip, then rested on his head | unfair "survive" / soft-lock | swept crush test; pass-through while falling | `1-6` naive replay dies; mechanics spec |
| D7 | Shy door measured proximity from its *original* spot | chained hops in consecutive frames ("Fine. Take it." instantly) | proximity from current spot + 450 ms cooldown | 1-4 events: hops at frame 173 and 311 |
| D8 | Timed steps with a `touch` trigger fused **all** steps when one was touched | blink stairs vanished en masse | per-cell fuse | 2-3 replay |
| D9 | `GravFlipTrap.teardown` threw when the scene shut down (physics world already gone) | **crash on leaving/restarting any gravity level** | null-guarded | baseline capture crashed; now clean |
| D10 | Gravity-flip camera tween survived resets | camera tilt after respawn | effect removed; flash only | code |
| D11 | Static spikes drawn and lethal ~15 px *above* the floor; one-way planks drawn as full blocks | wrong reads, unfair-looking deaths | spikes oriented to their surface with matching kill zone; planks drawn and collide as 12 px planks | screenshots before/after |
| D12 | Input: respawn cleared held touch directions; `pointerupoutside` unhandled; a direction finger sliding into the jump zone jumped; sub-frame taps gave full jumps | lost input after death; stuck direction; accidental jumps | held state survives respawn; up-outside/blur release; no dir↔jump hand-off; jump cut armed by the jump with a 50 ms minimum | `multitouch.spec.ts` (5 new cases) |
| D13 | Pause didn't freeze tweens/timers; pads stayed live under overlays (overlay taps leaked into jump) | traps progressed while paused; phantom jump on resume | pause freezes physics+tweens; pads disabled & released | `multitouch.spec.ts`, `states.spec.ts` |
| D14 | Settings sliders computed values in the wrong space inside a container | every tap set ~max volume/size | world-transform hit math | `smoke.spec.ts` settings test |
| D15 | 960×540 canvas upscaled on phones (blurry text/Pip); letterboxed on 19.5:9 | soft visuals, wasted screen | render at device resolution (camera zoom, ≤2.5×), view widens to the screen aspect | `shots/after`, iOS simulator capture |
| D16 | `addPointer(2)` on every level start; per-jump particle emitters | object churn in long sessions | 4 pointers once; pooled `Fx` emitters | soak test |
| D17 | Uncommitted ch2 motif: 10 tweens fighting over one Graphics object | jitter | replaced by the backdrop system | — |
| D18 | Level defects: 1-6 beaten by holding right; old 3-1 door teleported; several levels a single floor row | no surprise / no level | all 40 rebuilt (see LEVEL_AUDIT) | `levels.spec.ts` |

Defects found *during* the redesign and fixed before shipping (caught by the
harness): 5-2 trigger zones offset from their pistons (unbaitable); 2-8 lift
leaving before the player arrived (≈4 s idle wait); 1-6 trigger zones above
Pip's body; 4-6 arms parked on the spring arc (0.3 % success → ~18 %).

## 3. Design weaknesses addressed

- **Identity:** Pip rebuilt as a layered, procedurally animated mascot
  (gumdrop body, face-plate, sprout with secondary motion, hands, feet,
  14 expressions, blinks, gaze) fully decoupled from the 20×26 hitbox.
  Five art-directed worlds with distinct materials (turf, riveted metal,
  crystal, theatre brick, moonlit slate) and parallax backdrops.
- **Levels:** every level is a short comedy beat (setup → surprise →
  discovery → recovery → payoff), uses the screen's height, and is proven
  by input replay with a failing "naive" run. Signature moments: the shy
  door (1-4, early), the wall that changes its mind (1-7), the level that
  remembers (3-3/3-7), the door on the ceiling (3-8), the pity pillar (5-4),
  and a finale that fakes its own ending (5-8).
- **UX:** compact non-blocking intro banner; earned tips; fast completion
  ribbon with one dominant **Next**; chapter cards; first-play control
  hints on the pads; new menu/level select/settings.
- **Feedback:** `FeedbackManager` (event → sound + haptic + shake), with
  debouncing, a global haptic gap with priority override, gentle mode,
  and no buzz on ordinary jumps.

## 4. Architecture notes

- Trap lifecycle `dormant → armed → triggered → active → done` is unchanged
  in shape but now deterministic: sim clock, idempotent transitions,
  `onTriggered` telegraph hook, `rearm()` for cycles, `params.say` lines.
- `GameScene` has an explicit transition table (illegal transitions are
  rejected and counted; replays assert zero).
- Static scenery is baked to textures once (`core/bake.ts`); only dynamic
  traps redraw.
- Remaining concerns: `GameScene.ts` (~550 lines) and `PipView.ts` are the
  largest modules; `window.__otf/__otfSim/__otfView` debug handles ship in
  production (harmless offline, but can be gated behind a build flag).

## 5. Performance (measured — `scripts/perf.mjs`, `docs/perf-results.json`)

Desktop Chromium (Apple silicon), headed, 1280×720 at 2.5× resolution:

| Metric | Target | Measured |
|---|---|---|
| Live frame rate | 60 fps | 60.1 fps, p95 frame 17.7 ms (vsync-bound) |
| Full frame incl. WebGL render | ≤16.7 ms | p50 2.5 ms · p95 3.0 ms · p99 3.5 ms |
| Game logic per frame | — | 0.017–0.051 ms (busiest levels) |
| Death → control | ≤700 ms p95 | 300 ms p50 / p95 (game clock) |
| 200 deaths, one visit | no growth | heap 13.16 → 13.53 MB; bodies 24 → 24; display objects 69 → 70 |
| 40 level loads | no growth | heap 13.53 → 13.93 MB; load+30 frames p50 15 ms |
| Menu ready (cold, local) | fast | 841 ms |

**Not measured:** a real mid-range Android phone / iPhone. Desktop GPU
numbers bound CPU cost but do not prove device frame rate.

## 6. Mobile compatibility

- ✅ Landscape lock (both); view widens to the device aspect; safe-area insets
  feed the pad layout; Android immersive edge-to-edge with display cutouts;
  iOS status bar hidden; app-hidden auto-pause; iOS audio interruption resume.
- ✅ Android debug APK + release AAB build (JDK 21); APK installs and boots on
  an API 37 emulator (logcat). iOS Debug/Release simulator builds; app runs on
  the iPhone 17 Pro simulator (`docs/shots/native/`).
- ⚠️ Not verified on physical devices: haptic feel, touch latency, thermals,
  real audio interruptions, notch devices other than the simulator.
- ⚠️ Text uses the platform's rounded system font (no bundled font) — Android
  will render its own sans; consider bundling an OFL rounded face.

## 7. Prioritized remaining actions

1. **Human playtest** (protocol in `PLAYTEST_PROTOCOL.md`) — especially 1-2,
   2-7, 4-7, 5-1, 5-5 (tightest measured timing windows) and first-minute
   comprehension.
2. Physical-device pass: haptics comfort, 60 fps on a mid-range Android,
   pad reach on small phones.
3. Signing: Play upload keystore; Apple team + distribution profile.
4. Bundle a rounded OFL font; gate debug handles behind a build flag.
5. Optional: localization extraction (strings are inline today).
