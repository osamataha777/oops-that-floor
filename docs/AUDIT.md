# Product Audit — baseline (pre-overhaul)

Conducted on `main` @ `b73525c` by playing the live build (headed Chromium captures: menu, level select, 1-1 gameplay, death→respawn) and reading every core file.

## Scores (0–10)

| Area | Score | Notes |
| --- | --- | --- |
| First impression | 6 | Clean menu, but static and text-heavy; character too small |
| Visual identity | 5 | Pleasant pastel palette, but generic — flat tiles, no parallax, no lighting |
| Character personality | 4 | "Pip" exists but tiny, few expressions, no mascot moments |
| Movement responsiveness | 7 | coyote/buffer/variable jump all work; feel untuned, no landing dust |
| Mobile touch controls | 5 | works (E2E-verified) but small buttons, one layout, no slide-input |
| Level creativity | 4 | many "walk right, floor betrays" clones; few memorable set-pieces |
| Surprise & humor | 5 | quips + traps exist; death gags are random, not cause-aware |
| Difficulty fairness | 5 | mostly fair; some gaps borderline (4-2/4-5 dc≈7) — now BFS-verified possible |
| Death/retry satisfaction | 6 | 326 ms restart is great; gags get repetitive fast |
| Sound design | 5 | functional synth; thin, no chapter ambience, no anticipation cues |
| Animation quality | 4 | squash/stretch only; traps don't telegraph with personality |
| UI polish | 5 | coherent theme; chips/buttons plain; completion modal is heavy |
| Navigation clarity | 7 | menu → select → game clean; back button wired |
| Social sharing | 4 | works but card lacks the challenge code; entry via `window.prompt` |
| Replayability | 4 | achievements + best attempts; no daily/variety hooks (by design) |
| Technical stability | 7 | tests pass; confirmed defects below |
| Device performance | 7 | 60 FPS desktop, sim-verified iOS shell; mobile TBD |

## Confirmed defects (from code inspection)

1. **`=` platforms are not one-way** — `LevelRuntime.buildStatics()` adds them as full static bodies; player bonks jumping through from below. **Fix: one-way collision.**
2. **Tips spoil the trick** — `showIntroCard()` shows `def.tip` immediately on every entry. **Fix: progressive hints (attempt ≥3 or on-demand hint chip).**
3. **Pause during death anim leaks to `playing`** — death tween/delayedCall still fires `respawn()` → `state='playing'` while pause overlay is open; input resumes behind the modal. **Fix: defer respawn while paused; pause only from 'playing'.**
4. **Traps tick during `intro`** — `update()` runs `runtime.update` in the intro state; 'always'-triggered traps arm/fire before the player has control. **Fix: tick only in 'playing'.**
5. **Attempt counter is 0-based and ambiguous** — `attempt-eq:1` means "second try"; designers read n as the attempt number. **Fix: 1-based attempts, update level data (+1), document.**
6. **`window.prompt()` for challenge codes** — browser chrome, broken on native. **Fix: in-game code entry.**
7. **`onBackButton` async race** — if the scene removes the listener before the dynamic import resolves, the listener is added but never removed. **Fix: cancellation flag.**
8. **Share card omits the challenge code** — text has it, image doesn't. **Fix: draw code on card.**
9. **Death gags are random, not cause-aware** — spec asks crush→pancake, pit→disappearing act, fake goal→freeze. **Fix: cause→anim map.**
10. **`update()` runs while `dying`** — traps keep evaluating and can fire/reset mid-death-anim; harmless today but fragile. **Fix: tick only in 'playing'.**

## Disproven concerns

- **Multitouch basics**: 3 pointers are enabled; zones use `pointerdown/up/out/cancel` — slide-off cancels correctly. Verified by `mobile.spec.ts`. Improvement needed is *ergonomics*, not correctness.
- **Dormant attempt-gated traps**: `arm()` runs but trigger eval is blocked — for the content used (collapse/hidden-spikes) visuals are correct. Contract still normalized via #5.
- **`localStorage` corruption**: `decodeSave` clamps + recovers — tested.

## Direction

- **Visual**: Direction B (Premium Minimal Wonderland) — biggest upgrade per effort: richer tiles, parallax, lighting, expressive Pip. Keep procedural assets (zero licensing risk, tiny download).
- **Character**: formalize **Pip** — blob with eyes/feet, 9 expression states, squash-stretch animation system.
- **Levels**: redesign all 40 around a documented Setup→Bait→Betrayal→Recovery→Payoff beat; first 8 rebuilt as the showcase.
- **Controls**: two layouts (buttons + edge-swipe zones), scalable, settings-selectable.
