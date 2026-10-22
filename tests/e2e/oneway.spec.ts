import { test, expect } from '@playwright/test';

/**
 * One-way platform contract on 1-5 (index 4):
 *  - rising through a '=' plank does NOT collide (no bonk)
 *  - falling onto it DOES collide (lands on top)
 *  - flipped gravity swaps the colliding face
 */
test('one-way platforms: pass-through up, solid down, flip-aware', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('canvas');
  await page.waitForTimeout(1500);
  await page.evaluate(() => (window as any).__otf.scene.start('Game', { index: 4 }));
  await page.waitForFunction(() => (window as any).__otf.scene.getScene('Game')?.state === 'playing');

  // 1-5: planks at row 11 (cols 11-14 → x 330..450, stand plane y=330).
  // Launch straight up from the floor beneath; the rise must pass THROUGH.
  await page.evaluate(() => {
    const s = (window as any).__otf.scene.getScene('Game') as any;
    s.player.body.reset(390, 437);
    s.player.body.setVelocity(0, -820);
  });
  const crossed = await page.waitForFunction(
    () => (window as any).__otf.scene.getScene('Game').player.y < 300,
    { timeout: 2500 },
  ).then(() => true).catch(() => false);
  expect(crossed, 'player should pass through the plank going up').toBe(true);

  // then falls back and lands ON the plank (grounded, center-y ≈ 371)
  const landed = await page.waitForFunction(
    () => {
      const s = (window as any).__otf.scene.getScene('Game') as any;
      const p = s.player;
      return p.y < 322 && p.y > 312 && p.grounded;
    },
    { timeout: 3000 },
  ).then(() => true).catch(() => false);
  expect(landed, 'player should land on top of the plank').toBe(true);

  // gravity flip → collision face swaps
  const faces = await page.evaluate(() => {
    const s = (window as any).__otf.scene.getScene('Game') as any;
    s.physics.world.gravity.y = -1800;
    s.runtime.update(16); // let the face-sync run
    const b = (s.runtime.platforms.getChildren()[0] as any).body;
    return { up: b.checkCollision.up, down: b.checkCollision.down };
  });
  expect(faces.up).toBe(false);
  expect(faces.down).toBe(true);
});
