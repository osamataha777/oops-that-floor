# Game Design — Oops! That Floor!

## Pillars

1. **Fair betrayal.** Every trap is surprising the first time and understandable in hindsight. No random deaths, no invisible requirements, no impossible timings.
2. **Comedy over cruelty.** Deaths are cartoon gags — pancakes, confetti, disbelief — followed by a quip and an instant retry. The game mocks the *situation*, not the player.
3. **One more try.** Restart to control in <700 ms. The fun is the surprise; the loop must never get in the way of it.

## Core loop

```
see level → predict → act → surprise → laugh/die → instant respawn →
apply knowledge → succeed → next surprise
```

Each level is a single screen (32×18 tiles, 960×540). A level lasts 5–15 s once solved (early) up to ~60 s (late).

## Controls

| Action | Touch | Keyboard |
| --- | --- | --- |
| Move left/right | ◀ ▶ buttons (multitouch) | ←→ / A D |
| Jump | ▲ button | Space / W / ↑ |
| Pause | ❚❚ HUD button | Esc / P / Android back |

Feel: acceleration/deceleration ramps, **coyote time** (90 ms), **jump buffering** (130 ms), **variable jump height** (release = velocity cut ×0.42), capped fall speed. Tuned in `src/game/core/config.ts` (`PHYSICS`).

## The character — "Oopsie"

A round dark-plum blob with big eyes, tiny legs, and a permanent attitude problem. States: idle (breathing/bobbing), run, jump, fall, land (squash), shock (eyes pop), pancake (flattened), ghost-puff death, victory bounce. All animation is procedural squash/stretch + sprite frames generated at boot — see `src/game/scenes/BootScene.ts`.

## Humor system

- **Quips** (`src/game/effects/juice.ts`): contextual, rotated, throttled. A quip can appear on a *subset* of deaths (not all) and never delays respawn. Categories by death cause (spikes, crush, fall, betrayed-by-floor, etc.).
- **Death gags**: random cartoon outcome per death — pancake flatten, confetti burst, shrink, dramatic spin-off.
- **Trap personality**: shy doors peek, walls pop in with a smug dust-puff, crushers slam with a screen shake.

## Chapters

| # | Name | Theme | Signature ideas |
| --- | --- | --- | --- |
| 1 | Trust Nothing | warm cream/cocoa | collapse floors, pop-up spikes, surprise walls, first fake door |
| 2 | Everything Moves | moss/fern | movers, fallers, conveyors, timed planks |
| 3 | The Rules Changed | dusk violet | gravity flips, moving/shy goals, pressure plates, ceiling goals |
| 4 | Chaos Academy | clay/rust | combinations & chain reactions, crusher gauntlets |
| 5 | Final Betrayal | slate/indigo | long multi-stage levels, every trap type, final gauntlet |

## Signature mechanics (original)

1. **The Suspicious World** — visual trust signals that the player learns to *mis*trust: slightly-different tile shading marks doomed planks in later chapters; in some levels the "dangerous-looking" route is the safe one (Chapter 3+).
2. **Chain Reaction Comedy** — one input triggers a scripted cascade: plate → wall appears → platform starts → block falls → goal reveals itself. Implemented via the `chain`/`link` trap params (a trap completing can arm others).
3. **The World Remembers** — selected levels in chapters 3 and 5 change behavior on later attempts via `attempt-gte`/`attempt-eq` triggers: what was safe on attempt 1 betrays on attempt 2, deterministically — the player learns the evolving sequence rather than facing RNG.

## Death & restart

`GameScene` runs a small state machine: `playing → dying → respawn → playing`. On death:

1. Freeze input; play gag animation + sound + haptic (~250 ms).
2. Reset the `LevelRuntime` in place — all traps return to `dormant`, movers/conveyors/goals restore, solids rebuilt — **no scene restart**, no leaked timers/tweens (runtime owns them all).
3. Player respawns at spawn with a brief blink-in; control returns; total < 700 ms target.

## Progression & retention

- Sequential unlocks (finish N → N+1 unlocks); per-chapter completion badges.
- 10 local achievements (first death, persistent, first-try clears, no-death streaks, chapter clears, all-clear, secret-finder, share).
- Attempts + best-attempts recorded per level; "most embarrassing level" is computable from stats for share cards.
- No timers, streaks-for-streaks'-sake, ads, or pay-to-progress. Monetization hooks are intentionally absent in v1 (integration points noted in `docs/ARCHITECTURE.md`).

## Shareable comedy

- **Funny Failure Card**: an offscreen-canvas-rendered PNG (character gag + level id + quip + attempts + challenge code) shared via native share sheet, or downloaded on web.
- **Challenge codes**: `OTF-LL-DD-C` — level index + your death count, base-36, check-summed. Deterministic and offline; decoding clamps to shipped levels.
