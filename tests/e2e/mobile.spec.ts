import { test, expect } from '@playwright/test';

// iPhone-14-ish landscape viewport with touch events
test.use({ hasTouch: true, viewport: { width: 844, height: 390 } });

const css = async (page: import('@playwright/test').Page, x: number, y: number) => {
  const box = (await page.locator('canvas').boundingBox())!;
  const k = box.width / 960;
  return { x: box.x + x * k, y: box.y + y * k };
};

test('touch controls render and drive the player on a mobile viewport', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('canvas');
  await page.waitForTimeout(1400);
  // Start 1-1 directly — deterministic, independent of save state.
  await page.evaluate(() => (window as any).__otf.scene.start('Game', { index: 0 }));
  await page.waitForTimeout(900);

  const startX = await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (window as any).__otf.scene.getScene('Game').player.x as number;
  });

  // hold the on-screen ▶ zone (big thumb area — the circle visual is an anchor).
  // Hold until the player demonstrably moves — wall-clock holds are flaky
  // under shared-CPU runs.
  const right = await css(page, 240, 474);
  await page.mouse.move(right.x, right.y);
  await page.mouse.down();
  let endX = startX;
  const deadline = Date.now() + 3000;
  while (endX - startX <= 60 && Date.now() < deadline) {
    await page.waitForTimeout(80);
    endX = await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (window as any).__otf.scene.getScene('Game').player.x as number;
    });
  }
  await page.mouse.up();
  expect(endX - startX).toBeGreaterThan(60); // actually walked right

  // tap the on-screen ▲ jump button — y should dip (or jump fires)
  const jump = await css(page, 841, 474);
  await page.mouse.move(jump.x, jump.y);
  await page.mouse.down();
  let midY = 999;
  const jDeadline = Date.now() + 2000;
  while (midY >= 470 && Date.now() < jDeadline) {
    await page.waitForTimeout(60);
    midY = await page.evaluate(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (window as any).__otf.scene.getScene('Game').player.y as number;
    });
  }
  await page.mouse.up();
  expect(midY).toBeLessThan(470); // left the ground
});
