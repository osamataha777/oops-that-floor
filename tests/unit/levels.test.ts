import { describe, it, expect } from 'vitest';
import { LEVELS, levelAt, indexOfLevel, chapterIds } from '../../src/game/levels/index';
import { validateAll, jumpSanity } from '../../src/game/levels/validate';
import { solveLevel } from '../../src/game/levels/solve';
import { parseLevel } from '../../src/game/levels/parse';
import { TRAP_TYPES } from '../../src/game/levels/types';

describe('level registry', () => {
  it('has 40 levels in 5 chapters of 8', () => {
    expect(LEVELS).toHaveLength(40);
    for (let ch = 1; ch <= 5; ch++) expect(LEVELS.filter((l) => l.chapter === ch)).toHaveLength(8);
  });
  it('ids are unique and ordered', () => {
    const ids = LEVELS.map((l) => l.id);
    expect(new Set(ids).size).toBe(40);
    LEVELS.forEach((l, i) => expect(l.id).toBe(`${l.chapter}-${l.index}`));
  });
  it('covers at least 12 distinct trap types', () => {
    const used = new Set(LEVELS.flatMap((l) => l.traps.map((t) => t.type)));
    expect(used.size).toBeGreaterThanOrEqual(12);
    for (const t of used) expect(TRAP_TYPES).toContain(t);
  });
});

describe('level validation', () => {
  const issues = validateAll(LEVELS);
  it('has zero fatal issues', () => {
    expect(issues.filter((i) => i.fatal)).toEqual([]);
  });
  it('has at most benign warnings', () => {
    for (const i of issues.filter((i) => !i.fatal)) expect(i.message).toMatch(/goal|platform|mover/i);
  });
});

describe('level parsing', () => {
  it('extracts spawn and goal for every level', () => {
    for (const l of LEVELS) {
      const p = parseLevel(l);
      expect(p.spawn.x).toBeGreaterThan(0);
      expect(p.goal.w).toBeGreaterThan(0);
    }
  });
  it('merges solid cells into runs', () => {
    const p = parseLevel(levelAt(0));
    expect(p.solids.length).toBeGreaterThan(0);
    expect(p.solids.every((r) => r.w % 30 === 0 || r.w === 30)).toBe(true);
  });
  it('collects trap markers', () => {
    const p = parseLevel(LEVELS.find((l) => l.id === '1-3')!);
    expect(p.markers.get('c')?.length).toBe(4);
    expect(p.markers.get('s')?.length).toBe(3);
  });
});

describe('level design invariants', () => {
  it('every level has a named identity', () => {
    for (const l of LEVELS) expect(l.name.length).toBeGreaterThan(1);
  });
  it('harder chapters use more traps on average', () => {
    const avg = (ch: number) => LEVELS.filter((l) => l.chapter === ch).reduce((a, l) => a + l.traps.length, 0) / 8;
    expect(avg(5)).toBeGreaterThanOrEqual(avg(1));
  });
  it('jump sanity produces no fatal issues', () => {
    expect(LEVELS.flatMap(jumpSanity).filter((i) => i.fatal)).toEqual([]);
  });
  it('every level has a plausible spawn→goal path (trap-aware BFS)', () => {
    const unsolvable = LEVELS.filter((l) => !solveLevel(l).solvable).map((l) => l.id);
    expect(unsolvable).toEqual([]);
  });
});
