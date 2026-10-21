import { test, expect } from '@playwright/test';
import { toCss, padCenter, startLevel } from './helpers';

// iPhone-14-ish landscape viewport with touch events
test.use({ hasTouch: true, viewport: { width: 844, height: 390 } });

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
  const rc = await padCenter(page, 'R');
  const jc = await padCenter(page, 'J');
  const right = await toCss(page, rc.x, rc.y); // R thumb pad
  const jump = await toCss(page, jc.x, jc.y); // J thumb pad
  const x0 = await page.evaluate(() => (window as any).__otf.scene.getScene('Game').player.x);

  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [
      { x: right.x, y: right.y, id: 1 },
      { x: jump.x, y: jump.y, id: 2 },
    ],
  });
  // poll until the player has moved+risen — resilient under parallel workers
  const result = await page.waitForFunction(
    (x0) => {
      const s = (window as any).__otf.scene.getScene('Game') as any;
      if (s.player.x > x0 + 30 && s.ctl.right && s.ctl.jumpHeld) return { x: s.player.x };
      return null;
    },
    x0,
    { timeout: 5000 },
  ).then(() => true).catch(() => false);
  const mid = await page.evaluate(() => {
    const s = (window as any).__otf.scene.getScene('Game') as any;
    return { x: s.player.x, y: s.player.y, right: s.ctl.right, jump: s.ctl.jumpHeld };
  });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });

  expect(result, 'right+jump held simultaneously while moving right').toBe(true);
  expect(mid.right, 'right zone still engaged').toBe(true);
  expect(mid.jump, 'jump zone still engaged').toBe(true);
});

test('router: pointer ownership, slide handoff, cancel, multi-press', async ({ page }) => {
  await startLevel(page);
  const L = await padCenter(page, 'L');
  const R = await padCenter(page, 'R');
  const J = await padCenter(page, 'J');
  const mid = await page.evaluate(() => (window as any).__otfView.w / 2);

  // pointer 1 → left zone
  await emitPtr(page, 'pointerdown', 11, L.x, L.y);
  let c = await readCtl(page);
  expect(c).toEqual({ left: true, right: false, jumpHeld: false });

  // pointer 2 → jump zone while left stays held (independent ownership)
  await emitPtr(page, 'pointerdown', 12, J.x, J.y);
  c = await readCtl(page);
  expect(c).toEqual({ left: true, right: false, jumpHeld: true });

  // pointer 1 slides from left zone across to right zone → handoff
  await emitPtr(page, 'pointermove', 11, R.x, R.y);
  c = await readCtl(page);
  expect(c).toEqual({ left: false, right: true, jumpHeld: true });

  // pointer 2 cancels (system gesture interrupt) — jump releases, right stays
  await emitPtr(page, 'pointercancel', 12, J.x, J.y, false);
  c = await readCtl(page);
  expect(c).toEqual({ left: false, right: true, jumpHeld: false });

  // second pointer also holds right — releasing pointer 1 keeps right active
  await emitPtr(page, 'pointerdown', 13, R.x + 6, R.y + 10);
  await emitPtr(page, 'pointerup', 11, R.x, R.y, false);
  c = await readCtl(page);
  expect(c).toEqual({ left: false, right: true, jumpHeld: false });
  await emitPtr(page, 'pointerup', 13, R.x + 6, R.y + 10, false);
  c = await readCtl(page);
  expect(c).toEqual({ left: false, right: false, jumpHeld: false });

  // dead middle zone → no control claimed
  await emitPtr(page, 'pointerdown', 14, mid, J.y);
  c = await readCtl(page);
  expect(c).toEqual({ left: false, right: false, jumpHeld: false });
  await emitPtr(page, 'pointerup', 14, mid, J.y, false);

  // missed pointerup recovered by an isDown=false move
  await emitPtr(page, 'pointerdown', 15, J.x, J.y);
  c = await readCtl(page);
  expect(c.jumpHeld).toBe(true);
  await emitPtr(page, 'pointermove', 15, J.x + 10, J.y, false);
  c = await readCtl(page);
  expect(c.jumpHeld).toBe(false);

  // a finger lifted outside the canvas still releases its control
  await emitPtr(page, 'pointerdown', 16, R.x, R.y);
  expect((await readCtl(page)).right).toBe(true);
  await page.evaluate(([x, y]) => (window as any).__otf.scene.getScene('Game').input.emit('pointerupoutside', { id: 16, x, y, isDown: false }), [R.x, R.y] as const);
  expect((await readCtl(page)).right).toBe(false);

  // a direction finger sliding into the jump zone does NOT jump
  await emitPtr(page, 'pointerdown', 17, R.x, R.y);
  await emitPtr(page, 'pointermove', 17, J.x, J.y);
  c = await readCtl(page);
  expect(c).toEqual({ left: false, right: true, jumpHeld: false });
  await emitPtr(page, 'pointerup', 17, J.x, J.y, false);
});

test('held direction survives death + respawn (no re-press needed)', async ({ page }) => {
  await startLevel(page);
  const R = await padCenter(page, 'R');
  await emitPtr(page, 'pointerdown', 21, R.x, R.y);
  // kill the player through the real death path
  await page.evaluate(() => (window as any).__otf.scene.getScene('Game').kill('spikes'));
  await page.waitForFunction(() => (window as any).__otf.scene.getScene('Game').state === 'playing', null, { timeout: 4000 });
  const c = await readCtl(page);
  expect(c.right, 'right still held after respawn').toBe(true);
  const x0 = await page.evaluate(() => (window as any).__otf.scene.getScene('Game').player.x);
  await page.waitForFunction((x0) => (window as any).__otf.scene.getScene('Game').player.x > x0 + 20, x0, { timeout: 4000 });
  await emitPtr(page, 'pointerup', 21, R.x, R.y, false);
});

test('pausing releases held controls; overlay taps never reach the pads', async ({ page }) => {
  await startLevel(page);
  const J = await padCenter(page, 'J');
  await emitPtr(page, 'pointerdown', 31, J.x, J.y);
  expect((await readCtl(page)).jumpHeld).toBe(true);
  await page.evaluate(() => (window as any).__otf.scene.getScene('Game').togglePause());
  expect((await readCtl(page)).jumpHeld).toBe(false);
  await emitPtr(page, 'pointerdown', 32, J.x, J.y);
  expect((await readCtl(page)).jumpHeld, 'pads ignore input while paused').toBe(false);
  await emitPtr(page, 'pointerup', 31, J.x, J.y, false);
  await emitPtr(page, 'pointerup', 32, J.x, J.y, false);
});
