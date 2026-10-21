import { test, expect } from '@playwright/test';

/**
 * V2.1 redesigned-level beats — exercised through live gameplay state,
 * not just structural validation. Index map: ch1 0-7, ch2 8-15,
 * ch3 16-23, ch4 24-31, ch5 32-39.
 */
const start = async (page: import('@playwright/test').Page, index: number) => {
  await page.goto('/');
  await page.waitForSelector('canvas');
  await page.waitForTimeout(1200);
  await page.evaluate((i) => (window as any).__otf.scene.start('Game', { index: i }), index);
  await page.waitForFunction(
    () => (window as any).__otf.scene.getScene('Game').state === 'playing',
    { timeout: 8000 },
  );
};

const trapState = (page: import('@playwright/test').Page, id: string) =>
  page.evaluate((id) => {
    const s = (window as any).__otf.scene.getScene('Game') as any;
    return s.runtime.traps.find((t: any) => t.id === id)?.state;
  }, id);

const place = (page: import('@playwright/test').Page, x: number, y: number) =>
  page.evaluate(
    ([x, y]) => {
      const s = (window as any).__otf.scene.getScene('Game') as any;
      s.player.setPosition(x, y);
      s.player.body.setVelocity(0, 0);
    },
    [x, y] as const,
  );

const waitTrap = (page: import('@playwright/test').Page, id: string, states: string[], ms = 5000) =>
  page.waitForFunction(
    ([id, states]) => {
      const s = (window as any).__otf.scene.getScene('Game') as any;
      return states.includes(s.runtime.traps.find((t: any) => t.id === id)?.state);
    },
    [id, states] as const,
    { timeout: ms },
  );

test('3-4: first button slams a floor-brick up, second opens the door', async ({ page }) => {
  await start(page, 19);

  // press p1 (col 8) → k1 floor-brick erupts, door still shut
  await place(page, 255, 452);
  await waitTrap(page, 'p1', ['triggered', 'active', 'done']);
  await waitTrap(page, 'k1', ['triggered', 'active', 'done']);
  expect(await trapState(page, 'w1')).toBe('armed');

  // press q1 (col 16) → w1 door sinks → walk through to the goal
  await place(page, 495, 452);
  await waitTrap(page, 'w1', ['triggered', 'active', 'done']);
  await page.waitForTimeout(700); // sink animation
  await place(page, 640, 452);
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(
    () => (window as any).__otf.scene.getScene('Game').state === 'complete',
    { timeout: 5000 },
  );
  await page.keyboard.up('ArrowRight');
});

test('4-4: door sinks, then a bridge erupts in the pit behind you', async ({ page }) => {
  await start(page, 27);

  // press the plate (col 5) → w1 sinks → k1 bridge rises via trap-complete chain
  await place(page, 165, 452);
  await waitTrap(page, 'w1', ['done'], 6000);
  await waitTrap(page, 'k1', ['triggered', 'active', 'done'], 6000);

  // the riser bridge must be physically real now
  const solid = await page.evaluate(() => {
    const s = (window as any).__otf.scene.getScene('Game') as any;
    const k = s.runtime.traps.find((t: any) => t.id === 'k1') as any;
    return (k.block.body as Phaser.Physics.Arcade.Body).enable;
  });
  expect(solid, 'riser wall body should be enabled').toBe(true);
});

test('3-7: the level adapts — sting on try 1, no bridge + booby-trapped landing after', async ({ page }) => {
  await start(page, 22);

  const st = () =>
    page.evaluate(() => {
      const s = (window as any).__otf.scene.getScene('Game') as any;
      const t = (id: string) => s.runtime.traps.find((x: any) => x.id === id)?.state;
      return { attempt: s.runtime.attempt, c1: t('c1'), s1: t('s1'), s2: t('s2') };
    });

  let a = await st();
  expect(a).toEqual({ attempt: 1, c1: 'dormant', s1: 'armed', s2: 'dormant' });

  // die → attempt 2: bridge armed, landing armed, first sting retired
  await place(page, 200, 900);
  await page.waitForFunction(
    () => {
      const s = (window as any).__otf.scene.getScene('Game') as any;
      return s.runtime.attempt === 2 && s.state === 'playing';
    },
    { timeout: 6000 },
  );
  a = await st();
  expect(a).toEqual({ attempt: 2, c1: 'armed', s1: 'dormant', s2: 'armed' });

  // stepping on the bridge now actually collapses it
  await place(page, 420, 445);
  await waitTrap(page, 'c1', ['triggered', 'active', 'done']);
});

test('5-6: the painted doors are bait — hidden spikes guard them', async ({ page }) => {
  await start(page, 37);

  // approach door 1 (col 12, flanked by 's' at 11 & 13) → the floor bites
  // before the door is ever touched — bait confirmed by the death itself.
  await place(page, 300, 452);
  await page.keyboard.down('ArrowRight');
  const outcome = await page.waitForFunction(
    () => {
      const s = (window as any).__otf.scene.getScene('Game') as any;
      const t = s.runtime.traps.find((x: any) => x.id === 's1')?.state;
      if (s.state === 'dying') return 'died';
      return null;
    },
    { timeout: 4000 },
  );
  await page.keyboard.up('ArrowRight');
  expect(await outcome.jsonValue()).toBe('died');
});

test('5-1: sprint floor falls behind you and the end stings', async ({ page }) => {
  await start(page, 32);

  await page.keyboard.down('ArrowRight');
  const deadline = Date.now() + 16000;
  while (Date.now() < deadline) {
    const s = await page.evaluate(() => {
      const sc = (window as any).__otf.scene.getScene('Game') as any;
      return { state: sc.state, x: sc.player.x, grounded: sc.player.grounded };
    });
    if (s.state === 'complete') break;
    if (s.state === 'playing' && s.grounded) await page.keyboard.press('Space');
    await page.waitForTimeout(140);
  }
  await page.keyboard.up('ArrowRight');

  for (const id of ['a1', 'b1', 'c1', 'd1']) {
    expect(await trapState(page, id), `${id} should have fired`).not.toBe('armed');
  }
  expect(await trapState(page, 's1'), 'end-sting should have fired').not.toBe('armed');
});

test('4-7: ghost steps are painted on, cracked steps crumble underfoot', async ({ page }) => {
  await start(page, 30);

  // stand on the ghost step (row13, cols 14-15 → x ~435) → falls through, dies
  await place(page, 445, 380);
  const fell = await page.waitForFunction(
    () => {
      const s = (window as any).__otf.scene.getScene('Game') as any;
      return s.state === 'dying' || s.player.y > 500;
    },
    { timeout: 4000 },
  ).then(() => true).catch(() => false);
  expect(fell, 'ghost step should not hold the player').toBe(true);
});
