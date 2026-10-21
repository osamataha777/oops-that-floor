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
  const play = await css(page, 350, 280);
  await page.mouse.click(play.x, play.y);
  await page.waitForTimeout(900);

  const startX = await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (window as any).__otf.scene.getScene('Game').player.x as number;
  });

  // hold the on-screen ▶ button
  const right = await css(page, 240, 474);
  await page.mouse.move(right.x, right.y);
  await page.mouse.down();
  await page.waitForTimeout(700);
  await page.mouse.up();

  const endX = await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (window as any).__otf.scene.getScene('Game').player.x as number;
  });
  expect(endX - startX).toBeGreaterThan(60); // actually walked right

  // tap the on-screen ▲ jump button — y should dip (or jump fires)
  const jump = await css(page, 841, 474);
  await page.mouse.move(jump.x, jump.y);
  await page.mouse.down();
  await page.waitForTimeout(120);
  const midY = await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (window as any).__otf.scene.getScene('Game').player.y as number;
  });
  await page.mouse.up();
  expect(midY).toBeLessThan(470); // left the ground
});
