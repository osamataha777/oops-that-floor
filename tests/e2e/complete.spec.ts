import { test, expect } from '@playwright/test';
import { startLevel, sim } from './helpers';

test('completing 1-1 through real input persists progress and unlocks 1-2', async ({ page }) => {
  await startLevel(page);
  const r = await sim(page, 0, 'R45 RJ14 R40 RJ14 R20 RJ14 R20 RJ14 R80');
  expect(r.completed).toBe(true);
  const save = JSON.parse((await page.evaluate(() => localStorage.getItem('otf.save.v1')))!);
  expect(save.levels['1-1'].completed).toBe(true);
  expect(save.unlockedThrough).toBeGreaterThanOrEqual(1);
});

test('death → control returns within 0.7 s of game time (p95 target)', async ({ page }) => {
  await startLevel(page);
  // Walk into the 1-3 teeth repeatedly; measure frames from death to the
  // respawned player moving again, on the deterministic 60 Hz clock.
  const frames = await page.evaluate(() => {
    const sim = (window as any).__otfSim;
    sim.run(2, '_1', { settle: false, tail: 0 });
    const s = (window as any).__otf.scene.getScene('Game') as any;
    const out: number[] = [];
    let deadAt = -1;
    for (let f = 0; f < 1200 && out.length < 10; f++) {
      s.ctl.scripted = { dir: 1, jumpDown: false, jumpHeld: false };
      sim.step();
      if (s.state === 'dying' && deadAt < 0) deadAt = f;
      if (deadAt >= 0 && s.state === 'playing') {
        out.push(f - deadAt);
        deadAt = -1;
      }
    }
    return out;
  });
  expect(frames.length).toBeGreaterThanOrEqual(5);
  const sorted = [...frames].sort((a, b) => a - b);
  const p95 = sorted[Math.ceil(sorted.length * 0.95) - 1];
  expect(p95 / 60).toBeLessThan(0.7);
});
