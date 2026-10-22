# Level Audit — all 40 levels

Every level was reviewed against the ten questions in the brief (clear
objective, distinct mechanic, memorable moment, understandable surprise,
recovery, difficulty, learning, reachable exit, no dead waiting,
different from neighbours) and then rebuilt or refined. The class column
says what happened relative to V2.1.

**Proof columns** (all from `tests/replays/levels.json`, executed by
`tests/e2e/levels.spec.ts` and `scripts/verify-levels.mjs`):

- **Replay** — the level is completed through real input on the
  deterministic 60 Hz sim; shown as the solution's game time.
- **Naive** — the "obvious first try" (usually *hold right*) must fail;
  shown as the number of deaths it produced (0 = it fails without dying,
  e.g. stuck or chased off). This proves the betrayal exists.
- **Jitter** — share of 60 replays that still succeed when every timed
  input is shifted ±3 frames (±50 ms). It ranks timing *fragility of the
  scripted route*, not human difficulty (humans correct as they go). Values
  under ~20 % are flagged for the human playtest.

## Chapter 1 — Trust Nothing (meadow)

| Lvl | Name | Beat | Class | Replay | Naive | Jitter | Notes |
|---|---|---|---|---|---|---|---|
| 1-1 | Just Walk | stroll up two steps → path sags into a **harmless** dip → hop out | Replace | 2.3 s | stuck (0) | 65 % | first betrayal costs nothing; first-play pad hints |
| 1-2 | Mind the Gap | cute gap → cracked landing crumbles under a normal hop → commit to a full jump (or bounce off) | Replace | 2.3 s | 1 | 100 % | first death in the game; ~150 ms takeoff window + coyote — **playtest** |
| 1-3 | Now It Bites | low road vs planks → floor grows teeth as you near → jump early or go high | Major | 2.5 s | 2 | 70 % | player choice of route |
| 1-4 | Cold Feet | door panics, flees up behind you, then back down, then gives up | Major | 6.4 s | chased (0) | 97 % | **early signature moment**; Pip shocked + looks at the door |
| 1-5 | The Nice Path | sturdy bridge → middle was painted on → leap or take planks | Major | 2.5 s | 2 | 67 % | |
| 1-6 | Watch Your Head | ledge too tall → second sky block lands where you get stuck → wait, then climb it | Replace | 3.9 s | 1 | 52 % | danger becomes stairs |
| 1-7 | Nope | rude wall (hop it) → huge wall "Nope." → it gets bored and sinks | Replace | 3.9 s | stuck (0) | 100 % | teaches patience; wall "changes its mind" |
| 1-8 | Pop Quiz | crumbling bridge → teeth on the steps → painted gap → fake door | Replace | 2.6 s | 4 | 97 % | chapter recap |

## Chapter 2 — Everything Moves (workshop)

| Lvl | Name | Beat | Class | Replay | Naive | Jitter | Notes |
|---|---|---|---|---|---|---|---|
| 2-1 | Moving Day | hop on the cart, hold right → walk off its far end → ride, then jump | Major | 3.9 s | 2 | 100 % | honest-ish opener |
| 2-2 | Belt Sander | one belt fights you, the next flings you past the ledge into teeth | Major | 2.5 s | 1 | 98 % | |
| 2-3 | Blink Steps | stair over a pit; each step blinks out a beat after landing | Major | 2.6 s | 1 (stood still) | 75 % | widened to 4-wide steps after the bot found 2-wide too fiddly |
| 2-4 | The Crusher | a waiting piston + a rhythm piston in a low tunnel → bait, back off, slip under | Major | 3.8 s | 3 | 77 % | |
| 2-5 | Chain Reaction | big button → crate drops on the presser → crate on the button opens the door | Replace | 4.8 s | 1 | 100 % | environmental chain reaction |
| 2-6 | Bounce House | spring flings you into a spiked ceiling at full tilt → steer in mid-air | Replace | 2.7 s | 3 | 100 % | introduces springs + air control |
| 2-7 | Heartbeat | staircase whose landings bite on a rolling beat; tips peek before rising | Major | 4.1 s | 1 | **20 %** | safe edges widened to 2 tiles; **playtest** rhythm readability |
| 2-8 | Assembly Line | belt under a piston → lift → blink steps | Replace | 5.0 s | 2 | 32 % | lift now waits for you (was a 4 s idle) |

## Chapter 3 — The Rules Changed (crystal dream)

| Lvl | Name | Beat | Class | Replay | Naive | Jitter | Notes |
|---|---|---|---|---|---|---|---|
| 3-1 | Upsies | impossible pit → shimmer → you fall *up* → ceiling walk | Replace | 2.5 s | — (honest) | 100 % | deliberate breather/opener |
| 3-2 | Gravity Lease | the flip wears off mid-ceiling; jump the ceiling teeth | Replace | 3.7 s | 3 | 73 % | |
| 3-3 | The Floor Remembers | try 1: honest bridge, teeth by the door; try 2: teeth gone, bridge collapses | Refine | 2.4 s | 3 | 40 % | **level changes after failure** (asserted in mechanics.spec) |
| 3-4 | Button Mash | first button raises a brick, second opens the door | Refine | 2.4 s | blocked (0) | 92 % | door made unjumpable (4 tall) |
| 3-5 | Cracked Means Safe | clean stones are paint, ugly ones hold | Refine | 2.6 s | 1 | 42 % | stones widened 2→3 |
| 3-6 | Gravity Lane | jump the floor teeth, flip, jump the ceiling teeth | Major | 2.6 s | 10 | 42 % | old version could be beaten by holding right |
| 3-7 | It Learns | adapts each attempt (bridge gone + booby-trapped landing) | Refine | 2.7 s | 3 | 80 % | |
| 3-8 | Rules Lawyer | gate → door flees onto the ceiling behind you → flip → walk home upside down | Replace | 4.3 s | chased (0) | 47 % | door hangs upside-down |

## Chapter 4 — Chaos Academy (theatre)

| Lvl | Name | Beat | Class | Replay | Naive | Jitter | Notes |
|---|---|---|---|---|---|---|---|
| 4-1 | Opening Night | two spinning arms sweep the stage | Replace | 2.6 s | 4 | 83 % | spinner intro |
| 4-2 | The Audition | three identical doors; the real one hides beside a prop | Major | 2.4 s | stuck (0) | **13 %** | low jitter is the two-jump route; **playtest** |
| 4-3 | Conductor | low orchestra-pit corridor; spike beds sink in a walking-pace wave | Major | 3.2 s | 7 | 100 % | wait once, then just walk — the "aha" |
| 4-4 | The Helpful Bridge | button raises a bridge… that sinks again ~1.5 s later | Major | 2.5 s | 2 (hesitated) | 100 % | press-and-sprint |
| 4-5 | Fire Drill | floor collapses section by section behind you | Replace | 2.5 s | 2 | 47 % | chase |
| 4-6 | Trapeze | springs over two pits past spinning arms | Replace | 3.3 s | 5 | 68 % | arms re-placed (0.3 %→18 % start-timing success) |
| 4-7 | Trust Fall | crumbling cracked stairs + painted clean decoys | Refine | 2.2 s | 5 | 42 % | |
| 4-8 | Final Exam I | belt → arm → bridge → spring → shy door | Major | 3.4 s | 7 | 68 % | |

## Chapter 5 — Final Betrayal (moonlit castle)

| Lvl | Name | Beat | Class | Replay | Naive | Jitter | Notes |
|---|---|---|---|---|---|---|---|
| 5-1 | Just Walk (Reprise) | 1-1 by moonlight: the dip has teeth, the step crumbles onto spikes, the door runs home | Replace | 4.1 s | 6 | **12 %** | callback level; **playtest** |
| 5-2 | Crusher Gauntlet | three pistons, each less patient | Refine | 3.6 s | 7 | **12 %** | zones were offset (unbaitable) — fixed |
| 5-3 | Gravity Maze | borrowed flip over teeth → upside-down door | Major | 2.5 s | 4 | **12 %** | |
| 5-4 | Pity Party | impossible gap → after one try the floor grows a pillar ("Fine. Have a pillar.") | Replace | 4.0 s (1 death by design) | 4 | 62 % | one deliberate, signposted death |
| 5-5 | The Gauntlet | belt, bridge, arm, blink steps, piston | Major | 3.3 s | 5 | 17 % | added a safe tile before the arm (was 2 %) |
| 5-6 | Door Simulator | the first door is real and bolts behind three props whose floors bite | Major | 2.3 s | 4 | 52 % | backtracking removed |
| 5-7 | Everything at Once | belt, bridge, arm, flip onto a crumbling ceiling, flip home | Major | 3.1 s | 4 | 72 % | |
| 5-8 | The Final Betrayal | fake exit flops → stairs assemble → real door flees to the far ceiling → walk home upside down | Replace | 7.3 s | 6 | 30 % | **finale**; chain asserted in mechanics.spec |

## Mandatory manual playtest cases

Automation proves every level is completable and that each naive approach
fails; it cannot prove *fun* or *fairness to a first-timer*. These need
human eyes (see `PLAYTEST_PROTOCOL.md`):

1. 1-1 → 1-4 first-minute comprehension with no instructions.
2. 1-2 jump window feel on touch.
3. Low-jitter levels: 2-7, 4-2, 5-1, 5-2, 5-3, 5-5.
4. 5-4's forced first death reads as a joke, not a cheat.
5. 3-3 / 3-7: does the player understand *why* the level changed?
6. 5-8 finale clarity: is the fake exit → stairs → ceiling chase readable?
