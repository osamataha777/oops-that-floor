import { describe, it, expect } from 'vitest';
import { cellsRect, overlap, playerRect, rectCenter } from '../../src/game/traps/context';
import { TRAP_TYPES } from '../../src/game/levels/types';
import { LEVELS } from '../../src/game/levels/index';

describe('trap registry surface', () => {
  it('implements 15 trap types', () => {
    expect(TRAP_TYPES.length).toBe(15);
    expect(TRAP_TYPES).toContain('collapse');
    expect(TRAP_TYPES).toContain('gravflip');
    expect(TRAP_TYPES).toContain('shygoal');
  });
});

describe('attempt-gated trap contract', () => {
  // Contract: `attempt` is 1-based — the first try is attempt 1, the second try
  // (after one death/restart) is attempt 2. Level data `n` values are authored
  // against this numbering.
  it('attempt-eq targets the first try only (world-remembers stings)', () => {
    for (const l of LEVELS) {
      for (const t of l.traps) {
        if (t.trigger.event === 'attempt-eq') {
          expect(t.trigger.n, `${l.id}:${t.id} should use 1-based attempt numbers`).toBe(1);
        }
      }
    }
  });
  it('attempt-gte thresholds change the world after the first death (≥2)', () => {
    for (const l of LEVELS) {
      for (const t of l.traps) {
        if (t.trigger.event === 'attempt-gte') {
          expect(t.trigger.n, `${l.id}:${t.id}`).not.toBe(1); // n=1 would always fire
        }
      }
    }
  });
});

describe('cause-aware death gags', () => {
  // deathAnimFor lives in juice.ts (Phaser-bound); mapping is smoke-verified
  // in the E2E suite — this keeps the unit suite DOM-free.
  it('all shipped death causes are declared', () => {
    for (const l of LEVELS) for (const t of l.traps) expect(TRAP_TYPES).toContain(t.type);
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
