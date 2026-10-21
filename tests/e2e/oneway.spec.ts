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
  await page.waitForTimeout(800);

  // launch straight up from under the first plank (row13, cols 9-10 →
  // x 270..330, stand plane 390). Placed mid-air in the ghost gap —
  // the rise must pass THROUGH the plank (apex ≈336 < 390).
  await page.evaluate(() => {
    const s = (window as any).__otf.scene.getScene('Game') as any;
    s.player.setPosition(300, 450);
    s.player.body.setVelocity(0, -640);
  });
  const crossed = await page.waitForFunction(
    () => (window as any).__otf.scene.getScene('Game').player.y < 355,
    { timeout: 2500 },
  ).then(() => true).catch(() => false);
  expect(crossed, 'player should pass through the plank going up').toBe(true);

  // then falls back and lands ON the plank (grounded, center-y ≈ 371)
  const landed = await page.waitForFunction(
    () => {
      const s = (window as any).__otf.scene.getScene('Game') as any;
      const p = s.player;
      return p.y < 385 && p.y > 355 && p.grounded;
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
