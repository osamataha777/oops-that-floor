# Level Design

40 levels · 5 chapters × 8 · single-screen 32×18 ASCII maps.

## Authoring format

Levels are ASCII maps parsed by `src/game/levels/parse.ts`:

| Glyph | Meaning |
| --- | --- |
| `#` | solid tile |
| `=` | one-way platform |
| `X` | static spike strip |
| `~` | ghost floor (looks solid, never collides) |
| `^` | decor bump |
| `@` | player spawn |
| `G` | goal/exit |
| `.` | empty |
| `a`–`z` | trap markers — letters are bound per-level by `TrapDef.at` |

Marker letters carry no fixed meaning; each level's `traps:` array maps a letter to a trap type + trigger + params (`speed`, `fuse`, `hops`, `duration`, `tell`, `safe`, …). An optional `to` letter marks secondary cells (mover destinations, shy-goal flee spots). The map says *where*, the def says *how*.

**Trigger events** (`TriggerDef`): `always`, `touch`, `proximity`, `enter-area`, `press`, `jump`, `land`, `trap-complete`, `timer`, `attempt-gte`, `attempt-eq`. Shipped levels use the first seven plus `attempt-*`; `jump`/`land`/`trap-complete`/`timer` are engine-supported for future content.

## Difficulty curve

| Chapter | Levels | Target solve time | New ideas introduced |
| --- | --- | --- | --- |
| 1 Trust Nothing | 1-1…1-8 | 5–15 s | collapse, hidden spikes, surprise wall, fall block, fake door, crusher |
| 2 Everything Moves | 2-1…2-8 | 10–25 s | movers, conveyors, timed planks, multi-stage traps |
| 3 The Rules Changed | 3-1…3-8 | 15–35 s | gravity flips, shy/teleport goals, pressure plates, chained events |
| 4 Chaos Academy | 4-1…4-8 | 20–45 s | combinations, crusher gauntlets, attempt-2 changes |
| 5 Final Betrayal | 5-1…5-8 | 30–60 s | everything, memory/observation puzzles, multi-stage finale |

## Design rules applied

1. **First-death teachability** — every trap can kill you once, never twice for the same reason. Trap zones are sized so a player who saw the trap has time to react next attempt.
2. **Readable hazards** — spikes/crushers/spinners always render in the hazard palette; suspicious floor is *slightly* off-shade (learnable, not invisible).
3. **No required blind jumps** — the camera shows every landing zone before you must commit.
4. **Deterministic surprises** — traps use fixed delays/distances; "World Remembers" levels index behavior on attempt count, not RNG.
5. **Solo-able with the tuned controller** — jump apex (~3.3 tiles), coyote 90 ms, buffer 130 ms assumed by `validate.ts` jump-sanity checks.
6. **Pacing** — every chapter opens gentler than the last chapter closed; 8th levels are chapter "boss" layouts.

## Validator coverage (`npm run validate:levels`)

For each level: exact dimensions, exactly one spawn/goal, every glyph known, every marker has a matching parameterized trap (and vice versa), flood-fill reachability from spawn (ignoring traps), jump-gap sanity, and trap-param sanity (speeds, delays in range). Two **warnings** are intentional: `3-2` and `3-8` place goals embedded in solid ceiling, correct for gravity-flip levels.

## Per-level design notes

(Condensed — each level's trick is documented in its `tip` field in `src/game/levels/ch*.ts`, shown in-game from attempt 4+.)

- **Ch1** teaches the grammar: floor lies (1-1, 1-3), spikes lie (1-2, 1-6), walls lie (1-4), doors lie (1-5, 1-8).
- **Ch2** makes lies move: the first conveyor carries you *toward* a spike (2-2); timed planks force commitment (2-5).
- **Ch3** breaks rules: gravity flips mid-jump (3-2, 3-8 — ceiling goals), the exit runs away (3-3 shy goal, 3-7 teleport), plates open paths you shouldn't trust (3-5).
- **Ch4** chains them: plate → wall → mover → goal (4-3), crusher alley (4-5), the attempt-2 betrayal (4-6).
- **Ch5** combines everything; 5-8 is a multi-stage final gauntlet using every trap family once.
