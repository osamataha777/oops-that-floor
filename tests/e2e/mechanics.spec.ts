import { test, expect } from '@playwright/test';
import { startLevel, sim } from './helpers';

/**
 * Signature mechanics, asserted on live game state. These are diagnostic
 * integration tests: they read trap/scene internals after driving real input
 * through the deterministic replay harness (no state is written directly).
 */
const traps = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const s = (window as any).__otf.scene.getScene('Game') as any;
    return Object.fromEntries(s.runtime.traps.map((t: any) => [t.id, t.state]));
  });

test('3-3 "The Floor Remembers": the level changes after a death', async ({ page }) => {
  await startLevel(page);
  // attempt 1 → die to the sting by the door
  const r = await sim(page, 18, 'R110');
  expect(r.deaths).toBeGreaterThanOrEqual(1);
  expect(r.causes[0]).toContain('spikes');
  const t = await traps(page);
  expect(t.s1, 'sting retired after the first death').toBe('dormant');
  expect(['armed', 'triggered', 'active', 'done']).toContain(t.c1);
});

test('5-4 "Pity Party": the gap is impossible until you have tried once', async ({ page }) => {
  await startLevel(page);
  const r = await sim(page, 35, 'R80 W R26 RJ16 RG R0 RJ16 R60');
  expect(r.deaths).toBe(1);
  expect(r.completed).toBe(true);
  expect(r.events.some((e: string) => e.includes('p1=done'))).toBe(true);
});

test('5-8 finale: the fake exit builds a staircase, the real door flees to the ceiling', async ({ page }) => {
  await startLevel(page);
  const r = await sim(page, 39, 'R10 RJ16 R5 _24 R50 _70 R0 RJ10 RG R0 RJ10 RG R0 RJ14 RG R0 RJ10 RG R10 _0 L35 LJ14 L25 LJ8 L120');
  const order = ['d1=done', 'e1=done', 'f1=done', 'g1=done'].map((k) => r.events.findIndex((e: string) => e.endsWith(k)));
  expect(order.every((i) => i >= 0), `chain fired: ${r.events.join(' ')}`).toBe(true);
  expect([...order].sort((a, b) => a - b)).toEqual(order);
  expect(r.events.some((e: string) => e.includes('goal→') && e.endsWith(',60'))).toBe(true); // ceiling spot (y=60)
  expect(r.completed).toBe(true);
});

test('1-7 "Nope": the tall wall changes its mind and sinks', async ({ page }) => {
  await startLevel(page);
  const r = await sim(page, 6, 'R40 RJ20 R260');
  const w2 = r.events.filter((e: string) => e.includes('w2='));
  expect(w2.some((e: string) => e.endsWith('active'))).toBe(true);
  expect(w2.some((e: string) => e.endsWith('done'))).toBe(true);
  expect(r.completed).toBe(true);
});

test('1-6: a falling block crushes Pip even at full fall speed (swept test)', async ({ page }) => {
  await startLevel(page);
  const r = await sim(page, 5, 'R200');
  expect(r.causes.some((c: string) => c.includes('crush'))).toBe(true);
});

test('restart is deterministic: same input → same trace, any number of deaths later', async ({ page }) => {
  await startLevel(page);
  const a = await sim(page, 20, 'R300');
  const b = await sim(page, 20, 'R300');
  expect(a.trace).toEqual(b.trace);
  expect(a.deaths).toBe(b.deaths);
});
