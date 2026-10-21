import { describe, it, expect } from 'vitest';
import { cellsRect, overlap, playerRect, rectCenter } from '../../src/game/traps/context';
import { TRAP_TYPES } from '../../src/game/levels/types';

describe('trap registry surface', () => {
  it('implements 14 trap types', () => {
    expect(TRAP_TYPES.length).toBe(14);
    expect(TRAP_TYPES).toContain('collapse');
    expect(TRAP_TYPES).toContain('gravflip');
    expect(TRAP_TYPES).toContain('shygoal');
  });
});

describe('geometry helpers', () => {
  it('cellsRect merges cells to bounding box', () => {
    const r = cellsRect([
      { x: 0, y: 0, w: 30, h: 30 },
      { x: 30, y: 0, w: 30, h: 30 },
      { x: 60, y: 30, w: 30, h: 30 },
    ]);
    expect(r).toEqual({ x: 0, y: 0, w: 90, h: 60 });
  });
  it('overlap detects aabb intersections', () => {
    const a = { x: 0, y: 0, w: 10, h: 10 };
    expect(overlap(a, { x: 5, y: 5, w: 10, h: 10 })).toBe(true);
    expect(overlap(a, { x: 10, y: 0, w: 10, h: 10 })).toBe(false);
    expect(overlap(a, { x: -10, y: 0, w: 10, h: 10 })).toBe(false);
  });
  it('rectCenter centers', () => {
    expect(rectCenter({ x: 10, y: 20, w: 30, h: 40 })).toEqual({ x: 25, y: 40 });
  });
});
