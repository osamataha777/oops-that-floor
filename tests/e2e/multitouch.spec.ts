import { test, expect } from '@playwright/test';

// iPhone-14-ish landscape viewport with touch events
test.use({ hasTouch: true, viewport: { width: 844, height: 390 } });

const css = async (page: import('@playwright/test').Page, gx: number, gy: number) => {
  const box = (await page.locator('canvas').boundingBox())!;
  return { x: box.x + gx * (box.width / 960), y: box.y + gy * (box.height / 540) };
};

const startLevel = async (page: import('@playwright/test').Page, index = 0) => {
  await page.goto('/');
  await page.waitForSelector('canvas');
  await page.waitForTimeout(1200);
  await page.evaluate((i) => (window as any).__otf.scene.start('Game', { index: i }), index);
  await page.waitForFunction(
    () => (window as any).__otf.scene.getScene('Game').state === 'playing',
    { timeout: 8000 },
  );
};

const readCtl = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const s = (window as any).__otf.scene.getScene('Game') as any;
    return { left: s.ctl.left, right: s.ctl.right, jumpHeld: s.ctl.jumpHeld };
  });

const emitPtr = (
  page: import('@playwright/test').Page,
  ev: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
  id: number,
  x: number,
  y: number,
  isDown = true,
) =>
  page.evaluate(
    ([ev, id, x, y, isDown]) => {
      const s = (window as any).__otf.scene.getScene('Game') as any;
      s.input.emit(ev, { id, x, y, isDown });
    },
    [ev, id, x, y, isDown] as const,
  );

test('real two-finger touch: hold right + jump simultaneously', async ({ page }) => {
  await startLevel(page);
  const session = await page.context().newCDPSession(page);
  const right = await css(page, 260, 490); // R thumb zone
  const jump = await css(page, 800, 490); // J thumb zone
  const x0 = await page.evaluate(() => (window as any).__otf.scene.getScene('Game').player.x);
  const y0 = await page.evaluate(() => (window as any).__otf.scene.getScene('Game').player.y);

  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { x: right.x, y: right.y, id: 1 },
      { x: jump.x, y: jump.y, id: 2 },
    ],
  });
  await page.waitForTimeout(600);
  const mid = await page.evaluate(() => {
    const s = (window as any).__otf.scene.getScene('Game') as any;
    return { x: s.player.x, y: s.player.y, minY: s.player.y, right: s.ctl.right, jump: s.ctl.jumpHeld };
  });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

  expect(mid.right, 'right zone engaged').toBe(true);
  expect(mid.jump, 'jump zone engaged').toBe(true);
  expect(mid.x, 'player moved right while jumping').toBeGreaterThan(x0 + 30);
  expect(mid.y !== y0 || mid.minY < y0, 'player left the ground').toBeTruthy();
});

test('router: pointer ownership, slide handoff, cancel, multi-press', async ({ page }) => {
  await startLevel(page);

  // pointer 1 → left zone
  await emitPtr(page, 'pointerdown', 11, 80, 500);
  let c = await readCtl(page);
  expect(c).toEqual({ left: true, right: false, jumpHeld: false });

  // pointer 2 → jump zone while left stays held (independent ownership)
  await emitPtr(page, 'pointerdown', 12, 800, 500);
  c = await readCtl(page);
  expect(c).toEqual({ left: true, right: false, jumpHeld: true });

  // pointer 1 slides from left zone across to right zone → handoff
  await emitPtr(page, 'pointermove', 11, 200, 500);
  c = await readCtl(page);
  expect(c).toEqual({ left: false, right: true, jumpHeld: true });

  // pointer 2 cancels (system gesture interrupt) — jump releases, right stays
  await emitPtr(page, 'pointercancel', 12, 800, 500, false);
  c = await readCtl(page);
  expect(c).toEqual({ left: false, right: true, jumpHeld: false });

  // second pointer also holds right — releasing pointer 1 keeps right active
  await emitPtr(page, 'pointerdown', 13, 220, 520);
  await emitPtr(page, 'pointerup', 11, 200, 500, false);
  c = await readCtl(page);
  expect(c).toEqual({ left: false, right: true, jumpHeld: false });
  await emitPtr(page, 'pointerup', 13, 220, 520, false);
  c = await readCtl(page);
  expect(c).toEqual({ left: false, right: false, jumpHeld: false });

  // dead middle zone → no control claimed
  await emitPtr(page, 'pointerdown', 14, 450, 500);
  c = await readCtl(page);
  expect(c).toEqual({ left: false, right: false, jumpHeld: false });
  await emitPtr(page, 'pointerup', 14, 450, 500, false);

  // missed pointerup recovered by an isDown=false move
  await emitPtr(page, 'pointerdown', 15, 800, 500);
  c = await readCtl(page);
  expect(c.jumpHeld).toBe(true);
  await emitPtr(page, 'pointermove', 15, 810, 500, false);
  c = await readCtl(page);
  expect(c.jumpHeld).toBe(false);
});
