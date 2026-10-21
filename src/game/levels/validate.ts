import { GRID_W, GRID_H, TILE, PHYSICS } from '../core/config';
import { parseLevel, markerLetters } from './parse';
import { LevelDef, TRAP_TYPES, TrapDef } from './types';

export interface LevelIssue {
  level: string;
  message: string;
  fatal: boolean;
}

const rectContainsPoint = (r: { x: number; y: number; w: number; h: number }, x: number, y: number) =>
  x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

const rectsOverlap = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** Solid-ish surfaces the player can stand/spawn on. */
function supportRects(parsed: ReturnType<typeof parseLevel>): { x: number; y: number; w: number; h: number }[] {
  return [...parsed.solids, ...parsed.platforms];
}

function validateOne(def: LevelDef): LevelIssue[] {
  const issues: LevelIssue[] = [];
  const say = (message: string, fatal = true) => issues.push({ level: def.id, message, fatal });

  let parsed: ReturnType<typeof parseLevel>;
  try {
    parsed = parseLevel(def);
  } catch (e) {
    say((e as Error).message);
    return issues;
  }

  if (def.chapter < 1 || def.chapter > 5) say(`chapter ${def.chapter} out of range`);
  if (def.index < 1 || def.index > 8) say(`index ${def.index} out of range`);
  if (`${def.chapter}-${def.index}` !== def.id) say(`id '${def.id}' does not match chapter-index ${def.chapter}-${def.index}`);
  if (!def.name.trim()) say('missing name');

  // Spawn must be inside world and have support within 3 tiles below.
  const { spawn } = parsed;
  if (spawn.x < 0 || spawn.x > parsed.width || spawn.y < 0 || spawn.y > parsed.height)
    say('spawn outside world bounds');
  const supported = supportRects(parsed).some(
    (r) => spawn.x >= r.x - TILE / 2 && spawn.x <= r.x + r.w + TILE / 2 && r.y >= spawn.y && r.y <= spawn.y + TILE * 4,
  );
  if (!supported) say('spawn has no supporting floor within 4 tiles below');

  // Goal reachable-ish: not embedded inside a solid.
  const g = parsed.goal;
  for (const s of supportRects(parsed)) {
    if (rectContainsPoint(s, g.x + g.w / 2, g.y + 8)) say('goal head embedded in solid', false);
    if (rectsOverlap({ x: g.x + 4, y: g.y + g.h - 8, w: g.w - 8, h: 6 }, s)) {
      // standing overlap is fine
    }
  }

  // Static spikes must not sit on the spawn or goal cells.
  for (const sp of parsed.spikes) {
    if (rectContainsPoint({ x: sp.x, y: sp.y - 4, w: sp.w, h: sp.h + 8 }, spawn.x, spawn.y + 12))
      say('static spike overlaps spawn');
    if (rectsOverlap(sp, g)) say('static spike overlaps goal');
  }

  // Trap checks.
  const letters = markerLetters(def);
  const ids = new Set<string>();
  for (const t of def.traps) {
    validateTrap(def, t, letters, issues);
    if (ids.has(t.id)) say(`duplicate trap id '${t.id}'`);
    ids.add(t.id);
  }
  for (const t of def.traps) {
    const trig = t.trigger;
    if ((trig.event === 'press' || trig.event === 'trap-complete') && !ids.has(trig.ref))
      say(`trap '${t.id}' triggers on unknown ref '${trig.ref}'`);
    if (trig.event === 'enter-area' && !letters.has(trig.area) && !ids.has(trig.area))
      say(`trap '${t.id}' enter-area references unknown marker '${trig.area}'`);
  }

  return issues;
}

function validateTrap(def: LevelDef, t: TrapDef, letters: Set<string>, issues: LevelIssue[]): void {
  const say = (message: string, fatal = true) => issues.push({ level: def.id, message, fatal });
  if (!(TRAP_TYPES as readonly string[]).includes(t.type)) {
    say(`trap '${t.id}' has unknown type '${t.type}'`);
    return;
  }
  const needsAt = !['gravflip'].includes(t.type) || t.at !== '@';
  const atOk = letters.has(t.at) || t.at === 'G' || t.at === '@';
  if (needsAt && !atOk) say(`trap '${t.id}' references missing marker '${t.at}'`);
  if (t.to !== undefined && !letters.has(t.to) && t.to !== 'G' && t.to !== '@')
    say(`trap '${t.id}' references missing 'to' marker '${t.to}'`);

  switch (t.type) {
    case 'mover':
      if (!t.to) say(`mover '${t.id}' needs a 'to' marker destination`, false);
      break;
    case 'fallblock':
      if (!t.to && t.trigger.event !== 'proximity' && t.trigger.event !== 'enter-area')
        say(`fallblock '${t.id}' usually wants proximity or enter-area trigger`, false);
      break;
    case 'plate':
      if (t.trigger.event !== 'touch' && t.trigger.event !== 'always' && t.trigger.event !== 'attempt-gte' && t.trigger.event !== 'attempt-eq')
        say(`plate '${t.id}' is pressed by touch — odd trigger '${t.trigger.event}'`, false);
      break;
    case 'fakegoal':
      if (t.trigger.event !== 'touch') say(`fakegoal '${t.id}' should trigger on touch`, false);
      break;
  }
}

/** Validate every level; also enforces registry invariants (40 levels, unique ids). */
export function validateAll(levels: LevelDef[]): LevelIssue[] {
  const issues: LevelIssue[] = [];
  const ids = new Set<string>();
  const perChapter = new Map<number, number>();
  for (const def of levels) {
    if (ids.has(def.id)) issues.push({ level: def.id, message: 'duplicate level id', fatal: true });
    ids.add(def.id);
    perChapter.set(def.chapter, (perChapter.get(def.chapter) ?? 0) + 1);
    issues.push(...validateOne(def));
  }
  for (let ch = 1; ch <= 5; ch++) {
    if ((perChapter.get(ch) ?? 0) !== 8)
      issues.push({ level: `chapter-${ch}`, message: `expected 8 levels, found ${perChapter.get(ch) ?? 0}`, fatal: true });
  }
  if (levels.length !== 40)
    issues.push({ level: 'registry', message: `expected 40 levels, found ${levels.length}`, fatal: true });
  return issues;
}

/**
 * Coarse physics sanity lint: is the jump height enough to reach the goal
 * elevation delta implied by the map? (Not a proof of solvability.)
 */
export function jumpSanity(def: LevelDef): LevelIssue[] {
  const issues: LevelIssue[] = [];
  const parsed = parseLevel(def);
  const jumpH = (PHYSICS.jumpVelocity * PHYSICS.jumpVelocity) / (2 * PHYSICS.gravityY);
  // find floor directly under goal within 4 tiles
  const under = supportRects(parsed)
    .filter((r) => r.y >= parsed.goal.y && parsed.goal.x + parsed.goal.w / 2 >= r.x && parsed.goal.x + parsed.goal.w / 2 <= r.x + r.w)
    .sort((a, b) => a.y - b.y)[0];
  if (under && parsed.spawn.y - under.y > jumpH * 4) {
    issues.push({ level: def.id, message: 'goal sits far above spawn — needs platforms/movers (check manually)', fatal: false });
  }
  return issues;
}
