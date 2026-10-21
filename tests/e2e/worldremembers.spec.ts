import { test, expect } from '@playwright/test';

/**
 * "World Remembers" contract, demonstrated on 5-4 (index 35):
 *   attempt 1 → spikes armed (first-try sting), collapse bridge dormant (safe)
 *   attempt 2+ → spikes dormant, collapse armed (bridge crumbles on touch)
 */
test('5-4 world changes across attempts', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('canvas');
  await page.waitForTimeout(1500);
  await page.evaluate(() => (window as any).__otf.scene.start('Game', { index: 35 }));
  await page.waitForTimeout(800);

  const states = () =>
    page.evaluate(() => {
      const s = (window as any).__otf.scene.getScene('Game') as any;
      const t = (id: string) => s.runtime.traps.find((x: any) => x.id === id)?.state;
      return { attempt: s.runtime.attempt, s1: t('s1'), c1: t('c1'), state: s.state };
    });

  let st = await states();
  expect(st.attempt).toBe(1);
  expect(st.s1).toBe('armed'); // first-try spikes exist
  expect(st.c1).toBe('dormant'); // bridge is safe on try 1

  // die once → respawn → attempt 2. setPosition (not .y=) syncs the body —
  // playerRect reads body coords, and the void check needs them.
  await page.evaluate(() => {
    const s = (window as any).__otf.scene.getScene('Game') as any;
    s.player.setPosition(s.player.x, s.runtime.parsed.height + 300);
  });
  await page.waitForFunction(
    () => {
      const s = (window as any).__otf.scene.getScene('Game') as any;
      return s.runtime.attempt === 2 && s.state === 'playing';
    },
    { timeout: 6000 },
  );

  st = await states();
  expect(st.attempt).toBe(2);
  expect(st.state).toBe('playing');
  expect(st.s1).toBe('dormant'); // spikes retired
  expect(st.c1).toBe('armed'); // bridge now betrays

  // walk onto the bridge → it must actually collapse (armed traps activate!)
  await page.evaluate(() => {
    const s = (window as any).__otf.scene.getScene('Game') as any;
    s.player.setPosition(360, 445); // on the 'ccccc' bridge cells
    s.player.body.setVelocity(0, 0);
  });
  await page.waitForFunction(
    () => {
      const s = (window as any).__otf.scene.getScene('Game') as any;
      return ['triggered', 'active', 'done'].includes(s.runtime.traps.find((x: any) => x.id === 'c1').state);
    },
    { timeout: 4000 },
  );
});
