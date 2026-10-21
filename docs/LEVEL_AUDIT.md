# Level Audit — all 40 (V2.1)

Each level scored on the beat framework: **Setup → Betrayal → Discovery → Payoff**.
Status: ✅ input-driven E2E · 🤖 bot-verified · 📐 structural only (BFS + rules) · 📝 manual check pending.

Validation legend for the "proven" column:
- `bot` — completed via scripted real input in E2E
- `state` — trap/state transitions verified live in E2E
- `bfs` — solvability proven by the solver only (no input run)
- `lethal` — spike lethality confirmed post-fix (V2.1)

## Chapter 1 — Trust Nothing (redesigned V2)

| # | Name | Setup → Betrayal → Payoff | Traps | Proven | Notes |
|---|------|---------------------------|-------|--------|-------|
| 1-1 | First Steps | Safe walk → spike pops near mid-floor → hop it, door | hidden spikes | ✅ bot | opener teaches "nothing is safe" gently |
| 1-2 | Mind the Gap | Long gap → plank assist → jump timing | one-way planks | 📐 | |
| 1-3 | Cracks | Solid-looking floor → collapses on touch → keep moving | collapse | 📐 | |
| 1-4 | It Moved! | Exit waits → door runs away → corner it | shygoal | 📐 | signature reveal, menu mirrors it |
| 1-5 | The Nice Path | Two routes → high road via planks → route choice | one-way planks | ✅ state | **fixed**: planks were unreachable |
| 1-6 | Shortcut | Obvious spike gap → safer-looking detour is fake | ghost floor | 📐 | |
| 1-7 | Patience | Timed steps → wait vs rush | timed | 📐 | |
| 1-8 | Graduation | Combo of ch1 beats → chapter test | mixed | 📐 | |

## Chapter 2 — Everything Moves

| # | Name | Beat | Traps | Proven | Notes |
|---|------|------|-------|--------|-------|
| 2-1 | Moving Day | Huge gap → mover carries you → ride timing | mover | 📐 | honest opener |
| 2-2 | Belt Sander | Floor is a belt → drags toward spikes → counter-run | conveyor | 📐 | |
| 2-3 | Blink Steps | Steps vanish on fuse → keep moving | timed | 📐 | |
| 2-4 | The Crusher | Slam bait → rise window → walk under | crusher | 📐 | |
| 2-5 | Chain Reaction | Plate powers the mover → activate then ride | plate+mover | 📐 | |
| 2-6 | Skyfall | Blocks drop underfoot → never stop | fallblock ×3 | 📐 | |
| 2-7 | Heartbeat | Rhythm spikes in sequence → off-beat move | periodic spikes | 📐 | periodic spikes were always lethal |
| 2-8 | Muscle Memory | Belt → mover → fallblock combo → stay calm | conveyor+mover+fallblock | 📐 | |

## Chapter 3 — The Rules Changed

| # | Name | Beat | Traps | Proven | Notes |
|---|------|------|-------|--------|-------|
| 3-1 | It Fled | Door runs twice → corner it | shygoal | 📐 | |
| 3-2 | Upsies | Shimmer flips gravity → ceiling walk | gravflip | 📐 | **fixed**: goal head carved |
| 3-3 | The Floor Remembers | Try 1: sting → try 2: bridge gone → high road | attempt-gated ×2 | ✅ state | world-remembers intro |
| 3-4 | Button Mash | Button 1 slams a brick in your path → button 2 opens door | plate×2 + wall×2 | ✅ state | **re-authored** (first dir:1 riser) |
| 3-5 | Cracked Means Safe | Ugly tiles real, clean ones paint → read the floor | collapse(never)+ghost | 📐 | n:99 dormancy = stable tiles by design |
| 3-6 | Gravity Lane | Two flips over a spike pit → route plan | gravflip ×2 | 📐 | |
| 3-7 | It Learns | Try 1: bridge-exit sting → try 2+: no bridge AND armed landing | attempt-gated ×3 | ✅ state | **re-authored**: true escalation vs old 3-3 clone |
| 3-8 | Rules Lawyer | Plate → wall sinks → jump into shimmer | plate+wall+gravflip | 📐 | **fixed**: goal head carved |

## Chapter 4 — Chaos Academy

| # | Name | Beat | Traps | Proven | Notes |
|---|------|------|-------|--------|-------|
| 4-1 | Combo Meal | Belt onto cracking floor → sting at the end | conveyor+collapse+spikes | 📐 | spikes now lethal (V2.1) |
| 4-2 | Bounce House | Shy steps + spinner arm → middle-hop timing | timed+spinner | 📐 | |
| 4-3 | Red Light | Rhythm spikes + cycling crusher → move on off-beat | spikes+crusher | 📐 | |
| 4-4 | The Helpful Wall | Press → door sinks → bridge erupts behind you | plate+wall×2 | ✅ state | **re-authored**: betrayal-that-helps, trap-complete chain |
| 4-5 | Overcooked | Belt + timed + fallblock → appliance chaos | conveyor+timed+fallblock | 📐 | |
| 4-6 | The Audition | Fake door + floor sting + shy real door → audition all | fake+spikes+shy | 📐 | spikes now lethal (V2.1) |
| 4-7 | Trust Fall | Zigzag steps; two are painted-on → real ones crumble | collapse×4 + ghost×2 | ✅ state | **re-authored**: per-step crumbles, spatial zigzag |
| 4-8 | Final Exam I | Belt → collapse → spinner → timed → shy door | 5-trap combo | 📐 | |

## Chapter 5 — Final Betrayal

| # | Name | Beat | Traps | Proven | Notes |
|---|------|------|-------|--------|-------|
| 5-1 | Trust Nothing II | Whole floor falls → sprint-jumps → end tile stings | collapse×4 + spikes | ✅ state | **re-authored**: added the home-stretch sting |
| 5-2 | Crusher Gauntlet | Three slams, faster each → bait-and-walk ×3 | crusher ×3 | 📐 | escalation by shrinking delay |
| 5-3 | Gravity Maze | Flip chain, one-way doors → plan landings | gravflip ×2 | 📐 | |
| 5-4 | Memory Lane | Attempt 1 = different level; world remembers | attempt-gated ×2 | ✅ state | proven across attempts (E2E) |
| 5-5 | The Gauntlet | Belt → collapse → spinner → timed → crusher | 5-trap combo | 📐 | |
| 5-6 | Door Simulator | Painted doors guarded by hidden spikes → only shy door honest | fake×2 + spikes + shy | ✅ state | **re-authored**: doors are bait, floor bites |
| 5-7 | Everything at Once | Belt → collapse → spinner → flip chain | 5-trap combo | 📐 | |
| 5-8 | The Final Betrayal | Sprint → press → wall → crusher → chase door | 6-trap combo | 📐 | finale keeps the full toolkit |

## Coverage honesty

- **Input-driven E2E exists for**: 1-1 (full completion), 1-5, 3-4, 3-7, 4-4, 4-7, 5-1, 5-4, 5-6 — 9 levels.
- **All 40**: BFS-solvable, geometry-validated, zero warnings.
- **Remaining 31**: structurally sound but not input-run end-to-end; trap
  semantics they rely on are covered by the suite (collapse, timed, mover,
  crusher, gravflip, plate/wall, fake/shy goals, ghosts, attempt gates).
- The V2.1 lethal-spike fix changed effective difficulty on ~10 levels —
  they now deliver their designed stings. Difficulty re-tuning should be
  informed by real playtest deaths-per-level data.
