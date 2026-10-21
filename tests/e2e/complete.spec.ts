import { test, expect } from '@playwright/test';

interface Snap {
  state: string;
  x: number;
  y: number;
  grounded: boolean;
}

const snap = (page: import('@playwright/test').Page) =>
  page.evaluate((): Snap => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scene = (window as any).__otf.scene.getScene('Game');
    const body = scene?.player?.body;
    return {
      state: scene?.state ?? 'none',
      x: scene?.player?.x ?? -1,
      y: scene?.player?.y ?? -1,
      grounded: body ? (body.blocked.down || body.touching.down) : false,
    };
  });

test('scripted bot completes level 1-1 and unlocks 1-2', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('canvas');
  await page.waitForTimeout(1400);
  await page.mouse.click(350, 280); // Play
  await page.waitForTimeout(900);

  // 1-1: spike at col 11 (~x 330–360), pit at cols 18–19 (x 540–600), door ~x 880.
  // Bot: hold right; hop when grounded inside trigger windows; retries after deaths.
  await page.keyboard.down('ArrowRight');
  const deadline = Date.now() + 25000;
  let done = false;
  let lastJump = 0;
  while (Date.now() < deadline && !done) {
    const s = await snap(page);
    if (s.state === 'complete') { done = true; break; }
    if (s.state === 'playing' && s.grounded && Date.now() - lastJump > 900) {
      const hop = async () => {
        lastJump = Date.now();
        await page.keyboard.down('Space');
        await page.waitForTimeout(260);
        await page.keyboard.up('Space');
      };
      if (s.x > 230 && s.x < 300) await hop();       // clear the spike
      if (s.x > 470 && s.x < 540) await hop();       // clear the pit
    }
    await page.waitForTimeout(25);
  }
  await page.keyboard.up('ArrowRight');
  expect(done, 'bot never completed 1-1').toBe(true);

  const save = await page.evaluate(() => localStorage.getItem('otf.save.v1'));
  const parsed = JSON.parse(save!);
  expect(parsed.levels['1-1'].completed).toBe(true);
  expect(parsed.unlockedThrough).toBeGreaterThanOrEqual(1);
});

test('death → respawn restores player control quickly', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('canvas');
  await page.waitForTimeout(1400);
  await page.mouse.click(350, 280);
  await page.waitForTimeout(900);

  // walk right into the spike and measure death → control
  await page.keyboard.down('ArrowRight');
  let died = 0;
  let controlBack = 0;
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const s = await snap(page);
    if (s.state === 'dying' && !died) died = Date.now();
    if (died && s.state === 'playing' && s.x < 200) { controlBack = Date.now(); break; }
    await page.waitForTimeout(20);
  }
  await page.keyboard.up('ArrowRight');
  expect(died).toBeGreaterThan(0);
  expect(controlBack).toBeGreaterThan(0);
  expect(controlBack - died).toBeLessThan(900);
});
