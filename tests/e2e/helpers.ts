import type { Page } from '@playwright/test';

/** Logical (view-space) → CSS page coordinates, for any view width. */
export async function toCss(page: Page, lx: number, ly: number): Promise<{ x: number; y: number }> {
  const box = (await page.locator('canvas').boundingBox())!;
  const vw = await page.evaluate(() => (window as any).__otfView.w as number);
  const k = box.width / vw;
  return { x: box.x + lx * k, y: box.y + ly * k };
}

/** Centre of an on-screen touch control ('L' | 'R' | 'J') in view space. */
export async function padCenter(page: Page, c: 'L' | 'R' | 'J'): Promise<{ x: number; y: number }> {
  return page.evaluate((c) => {
    const s = (window as any).__otf.scene.getScene('Game') as any;
    const p = s.touchUI.centers[c];
    return { x: p.x, y: p.y };
  }, c);
}

export async function startLevel(page: Page, index = 0): Promise<void> {
  await page.goto('/');
  await page.waitForFunction(() => (window as any).__otf?.scene?.isActive('Menu'), null, { timeout: 15000 });
  await page.evaluate((i) => (window as any).__otf.scene.start('Game', { index: i }), index);
  await page.waitForFunction(() => (window as any).__otf.scene.getScene('Game')?.state === 'playing', null, { timeout: 8000 });
}

/** Deterministic input replay (see src/dev/sim.ts). */
export function sim(page: Page, index: number, program: string): Promise<any> {
  return page.evaluate(([i, p]) => (window as any).__otfSim.run(i, p), [index, program] as const);
}
