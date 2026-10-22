import { test, expect } from '@playwright/test';
import { toCss, padCenter, startLevel } from './helpers';

// iPhone-14-ish landscape viewport with touch events
test.use({ hasTouch: true, viewport: { width: 844, height: 390 } });

/**
 * Real mouse-as-touch input on the rendered pads drives the player. Asserts
 * the control state immediately and a small movement, so it stays robust
 * when headless rendering is slow (CI / parallel workers).
 */
test('touch controls render and drive the player on a mobile viewport', async ({ page }) => {
  await startLevel(page, 0);
  const game = () => page.evaluate(() => {
    const s = (window as any).__otf.scene.getScene('Game') as any;
    return { x: s.player.x as number, right: s.ctl.right as boolean, jump: s.ctl.jumpHeld as boolean, view: (window as any).__otfView.w as number };
  });
  const g0 = await game();
  expect(g0.view, 'phone aspect widens the view').toBeGreaterThan(960);

  const rc = await padCenter(page, 'R');
  const right = await toCss(page, rc.x, rc.y);
  await page.mouse.move(right.x, right.y);
  await page.mouse.down();
  expect((await game()).right).toBe(true);
  await page.waitForFunction((x0) => (window as any).__otf.scene.getScene('Game').player.x > x0 + 12, g0.x, { timeout: 15000 });
  await page.mouse.up();
  expect((await game()).right).toBe(false);

  const jc = await padCenter(page, 'J');
  const jump = await toCss(page, jc.x, jc.y);
  await page.mouse.move(jump.x, jump.y);
  await page.mouse.down();
  expect((await game()).jump).toBe(true);
  await page.waitForFunction(() => (window as any).__otf.scene.getScene('Game').player.body.velocity.y < -50, null, { timeout: 15000 });
  await page.mouse.up();
  expect((await game()).jump).toBe(false);
});
