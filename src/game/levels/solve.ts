import { GRID_W, GRID_H, PHYSICS } from '../core/config';
import { parseLevel } from './parse';
import { LevelDef, TrapType } from './types';

/**
 * Coarse deterministic solvability check — a BFS over "can the player occupy
 * this cell" with the tuned movement envelope derived from PHYSICS:
 *   jump apex  ≈ 3.8 tiles  (v²/2g = 640²/3600 ≈ 114px)
 *   flat reach ≈ 8 tiles    (340 px/s × 0.71s ≈ 242px)
 * We stay conservative: ≤6 across flat/climbing, ≤8 when descending.
 *
 * Trap semantics applied:
 *   standable:  collapse / timed / mover / conveyor / fallblock / plate / wall
 *   lethal:     spikes / crusher / spinner (jumpable, never occupied)
 *   passable:   ghost / fakegoal / shygoal / plate-cell / gravflip zones
 *   stateful:   occupying a gravflip cell toggles the "flipped" BFS state —
 *               including cells traversed mid-jump or mid-fall
 *   rides:      cells above mover 'at' ↔ above mover 'to' are connected
 *   goals:      shygoal may also stand at its 'to' flee cells
 */

const STANDABLE_TRAP: TrapType[] = ['collapse', 'timed', 'mover', 'conveyor', 'fallblock', 'plate'];
const LETHAL_TRAP: TrapType[] = ['spikes', 'crusher', 'spinner'];

interface Grid {
  cols: number;
  solid: boolean[];     // blocks occupancy
  standable: boolean[]; // supports standing (solid ∪ trap solids)
  lethal: boolean[];    // kills on occupancy
  flip: boolean[];      // gravflip zone
}

function buildGrid(def: LevelDef): Grid {
  const parsed = parseLevel(def);
  const cols = def.widthCells ?? GRID_W;
  const n = cols * GRID_H;
  const g: Grid = {
    cols,
    solid: new Array(n).fill(false),
    standable: new Array(n).fill(false),
    lethal: new Array(n).fill(false),
    flip: new Array(n).fill(false),
  };
  const idx = (c: number, r: number) => r * cols + c;
  const inBounds = (c: number, r: number) => c >= 0 && c < cols && r >= 0 && r < GRID_H;
  const mark = (x: number, y: number, w: number, h: number, f: (i: number) => void) => {
    for (let r = Math.floor(y / 30); r <= Math.floor((y + h - 1) / 30); r++)
      for (let c = Math.floor(x / 30); c <= Math.floor((x + w - 1) / 30); c++)
        if (inBounds(c, r)) f(idx(c, r));
  };

  for (const s of parsed.solids) mark(s.x, s.y, s.w, s.h, (i) => { g.solid[i] = g.standable[i] = true; });
  for (const p of parsed.platforms) mark(p.x, p.y, p.w, p.h, (i) => { g.standable[i] = true; });
  for (const s of parsed.spikes) mark(s.x - 3, s.y - 18, s.w + 6, s.h + 20, (i) => { g.lethal[i] = true; });

  const typeAt = new Map<string, TrapType>();
  for (const t of def.traps) if (!typeAt.has(t.at)) typeAt.set(t.at, t.type);

  for (const [letter, rects] of parsed.markers) {
    const type = typeAt.get(letter);
    if (!type) continue;
    for (const r of rects) {
      if (STANDABLE_TRAP.includes(type)) mark(r.x, r.y, r.w, r.h, (i) => { g.standable[i] = true; });
      if (type === 'wall') mark(r.x, r.y, r.w, r.h, (i) => { g.solid[i] = g.standable[i] = true; });
      if (LETHAL_TRAP.includes(type)) mark(r.x, r.y - 2, r.w, r.h + 4, (i) => { g.lethal[i] = true; });
      if (type === 'gravflip') mark(r.x, r.y, r.w, r.h, (i) => { g.flip[i] = true; });
    }
  }
  // mover 'to' destinations are standable too (the platform travels there)
  for (const t of def.traps) {
    if (t.type === 'mover' && t.to && parsed.markers.has(t.to))
      for (const r of parsed.markers.get(t.to)!)
        mark(r.x, r.y, r.w, r.h, (i) => { g.standable[i] = true; });
  }
  return g;
}

export interface SolveResult {
  solvable: boolean;
  visited: number;
  visitedCells?: string[];
}

export function solveLevel(def: LevelDef): SolveResult {
  const parsed = parseLevel(def);
  const g = buildGrid(def);
  const cols = g.cols;
  const idx = (c: number, r: number) => r * cols + c;
  const inB = (c: number, r: number) => c >= 0 && c < cols && r >= 0 && r < GRID_H;
  const pass = (c: number, r: number) => inB(c, r) && !g.solid[idx(c, r)] && !g.lethal[idx(c, r)];
  const standing = (c: number, r: number, flipped: boolean) =>
    pass(c, r) && inB(c, r + (flipped ? -1 : 1)) && g.standable[idx(c, r + (flipped ? -1 : 1))];

  // Goal cells: the G cell plus a one-cell halo, plus shygoal flee markers.
  const goalCells = new Set<number>();
  const gc = Math.floor((parsed.goal.x + parsed.goal.w / 2) / 30);
  const gr = Math.floor(parsed.goal.y / 30);
  for (const [c, r] of [[gc, gr], [gc, gr - 1], [gc, gr + 1], [gc - 1, gr], [gc + 1, gr]] as const)
    if (inB(c, r)) goalCells.add(idx(c, r));
  for (const t of def.traps) {
    if (t.type === 'shygoal' && t.to && parsed.markers.has(t.to))
      for (const r of parsed.markers.get(t.to)!)
        goalCells.add(idx(Math.floor(r.x / 30), Math.floor(r.y / 30)));
  }

  const sc = Math.floor(parsed.spawn.x / 30), sr = Math.floor(parsed.spawn.y / 30);

  // Ride edges connect the cells ABOVE the mover's 'at'/'to' platforms.
  const rideMap = new Map<number, number[]>();
  const ride = (a: number, b: number) => {
    if (!rideMap.has(a)) rideMap.set(a, []);
    rideMap.get(a)!.push(b);
  };
  for (const t of def.traps) {
    if (t.type === 'mover' && t.to && parsed.markers.has(t.at) && parsed.markers.has(t.to)) {
      for (const a of parsed.markers.get(t.at)!)
        for (const b of parsed.markers.get(t.to)!) {
          const ac = Math.floor(a.x / 30), ar = Math.floor(a.y / 30) - 1;
          const bc = Math.floor(b.x / 30), br = Math.floor(b.y / 30) - 1;
          if (inB(ac, ar) && inB(bc, br)) { ride(idx(ac, ar), idx(bc, br)); ride(idx(bc, br), idx(ac, ar)); }
        }
    }
  }

  // Horizontal jump reach in tiles per elevation delta, from real physics:
  //   y(t) = jumpVel·t + 0.5·g·t² ; solve for t at dy = dr·30px, then 340px/s·t.
  const vy = Math.abs(PHYSICS.jumpVelocity), grav = PHYSICS.gravityY, vx = PHYSICS.maxSpeed;
  const reachTiles = (dr: number): number => {
    const dy = dr * 30; // dr>0 = descending
    const disc = vy * vy + 2 * grav * dy;
    if (disc < 0) return 0; // can't climb that high at all
    const t = (vy + Math.sqrt(disc)) / grav;
    return Math.floor((vx * t) / 30);
  };
  const dcLimit = (dr: number): number => Math.min(reachTiles(dr), dr < 0 ? 7 : 9);

  const key = (c: number, r: number, f: boolean) => (f ? 1 : 0) * cols * GRID_H + r * cols + c;
  const seen = new Set<number>();
  const queue: [number, number, boolean][] = [[sc, sr, false]];
  seen.add(key(sc, sr, false));

  const push = (c: number, r: number, f: boolean) => {
    if (inB(c, r) && !seen.has(key(c, r, f))) {
      seen.add(key(c, r, f));
      queue.push([c, r, f]);
    }
  };

  let visited = 0;
  const MAX = 400000;

  while (queue.length && visited < MAX) {
    const [c, r, f] = queue.shift()!;
    visited++;
    const i = idx(c, r);
    if (goalCells.has(i) || goalCells.has(idx(c, Math.max(0, Math.min(GRID_H - 1, r + (f ? 1 : -1))))))
      return { solvable: true, visited };
    if (g.flip[i]) push(c, r, !f);
    for (const b of rideMap.get(i) ?? []) push(b % cols, Math.floor(b / cols), f);

    const dir = f ? -1 : 1;
    const isStanding = standing(c, r, f);

    if (isStanding) {
      // walk (may step into air — fall handles the drop)
      for (const dc of [-1, 1]) if (pass(c + dc, r)) push(c + dc, r, f);
    }

    // fall: scan down-column; air-control drift ±min(step,3); flip on traversal
    {
      for (let step = 1; step <= GRID_H; step++) {
        const nr = r + dir * step;
        if (!inB(c, nr) || g.solid[idx(c, nr)]) break;
        for (let dc = -Math.min(step, 3); dc <= Math.min(step, 3); dc++) {
          const nc = c + dc;
          if (!inB(nc, nr) || g.solid[idx(nc, nr)] || g.lethal[idx(nc, nr)]) continue;
          if (g.flip[idx(nc, nr)]) push(nc, nr, !f);
          if (standing(nc, nr, f)) push(nc, nr, f);
        }
        if (g.lethal[idx(c, nr)]) break;
      }
    }

    if (isStanding) {
      // jump: ballistic arc, apex ~3.5 tiles; reach derived from PHYSICS
      for (let dc = -9; dc <= 9; dc++) {
        for (let dr = -4; dr <= 4; dr++) {
          if (dc === 0 && dr === 0) continue;
          if (Math.abs(dc) > dcLimit(dr)) continue;
          const nc = c + dc, nr = r + dir * dr;
          if (!inB(nc, nr) || !standing(nc, nr, f)) continue;
          let clear = true;
          const steps = Math.max(Math.abs(dc), Math.abs(dr)) * 2 + 4;
          for (let s = 1; s <= steps && clear; s++) {
            const t = s / steps;
            const tc = Math.round(c + dc * t);
            const tr = Math.round(r + dir * (dr * t - 3.5 * 4 * t * (1 - t)));
            if (!inB(tc, tr) || g.solid[idx(tc, tr)]) { clear = false; break; }
            if (g.flip[idx(tc, tr)]) push(tc, tr, !f);
            // lethal cells along the arc make this particular arc deadly, not impossible
            if (g.lethal[idx(tc, tr)]) { clear = false; break; }
          }
          if (clear) push(nc, nr, f);
        }
      }
    }
  }
  return {
    solvable: false,
    visited,
    visitedCells: [...seen].map((k) => {
      const f = k >= cols * GRID_H;
      const kk = f ? k - cols * GRID_H : k;
      return `${k % cols},${Math.floor(kk / cols)}${f ? '↑' : ''}`;
    }),
  };
}

/** Solve-check every level. */
export function solvabilityIssues(levels: LevelDef[]) {
  return levels.map((def) => ({ def, ...solveLevel(def) }));
}
