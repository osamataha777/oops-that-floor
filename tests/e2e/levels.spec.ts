import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const REPLAYS = JSON.parse(readFileSync(new URL('../replays/levels.json', import.meta.url), 'utf8'));

/**
 * Input-driven proof for every level. Each replay steps the real game
 * (scenes, Arcade physics, traps, tweens) at a fixed 60 Hz through the same
 * InputManager the touch router drives — see src/dev/sim.ts. Results are
 * deterministic, so these never flake on slow CI machines.
 *
 * `naive` is the obvious approach a first-time player would try; it must
 * fail, which proves each level's betrayal actually exists.
 */
type Replay = { program: string; deaths?: number; naive?: string; beat?: string };
const all = REPLAYS as Record<string, Replay>;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  expect(Object.keys(all).length, 'every level has a replay').toBe(40);
});

let page: import('@playwright/test').Page;
test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
  await page.goto('/');
  await page.waitForFunction(() => (window as any).__otfSim && (window as any).__otf?.scene?.isActive('Menu'), null, { timeout: 20000 });
});
test.afterAll(async () => page?.close());

for (const [id, rep] of Object.entries(all)) {
  test(`${id} completes via input replay — ${rep.beat ?? ''}`, async () => {
    const index = (Number(id[0]) - 1) * 8 + Number(id[2]) - 1;
    const r = await page.evaluate(([i, p]) => (window as any).__otfSim.run(i, p, { settle: false }), [index, rep.program] as const);
    expect(r.level).toBe(id);
    expect(r.completed, `${id} should complete (final ${JSON.stringify(r.final)}, causes ${r.causes})`).toBe(true);
    if (rep.deaths !== undefined) expect(r.deaths).toBe(rep.deaths);
    expect(r.illegalTransitions).toBe(0);
    if (rep.naive) {
      const n = await page.evaluate(([i, p]) => (window as any).__otfSim.run(i, p, { settle: false }), [index, rep.naive] as const);
      expect(n.completed && n.deaths === 0, `${id}: the naive approach should be betrayed`).toBe(false);
    }
  });
}
