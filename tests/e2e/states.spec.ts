import { test, expect } from '@playwright/test';

const game = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const s = (window as any).__otf.scene.getScene('Game') as any;
    return {
      state: s.state,
      attempt: s.runtime?.attempt,
      overlay: !!s.overlay,
      paused: s.scene?.isPaused?.('Game'),
    };
  });

test.describe('gameplay state machine', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas');
    await page.waitForTimeout(1400);
    await page.evaluate(() => (window as any).__otf.scene.start('Game', { index: 0 }));
    await page.waitForTimeout(700);
  });

  test('pause is ignored while dying (no respawn-behind-overlay)', async ({ page }) => {
    // kill via void, then hammer ESC during the death animation
    await page.evaluate(() => {
      const s = (window as any).__otf.scene.getScene('Game') as any;
      s.player.y = s.runtime.parsed.height + 300;
    });
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(80);
    }
    const st = await page.waitForFunction(
      () => (window as any).__otf.scene.getScene('Game').state === 'playing',
      { timeout: 3000 },
    );
    await st;
    const g = await game(page);
    expect(g.state).toBe('playing');
    expect(g.overlay).toBe(false); // no pause menu leaked over the respawn
    expect(g.attempt).toBe(2);
  });

  test('manual restart during death animation resolves cleanly', async ({ page }) => {
    await page.evaluate(() => {
      const s = (window as any).__otf.scene.getScene('Game') as any;
      s.player.y = s.runtime.parsed.height + 300;
    });
    await page.waitForTimeout(150); // mid-anim
    await page.keyboard.press('r');
    await page.waitForTimeout(400);
    const g = await game(page);
    expect(g.state).toBe('playing');
    expect(g.attempt).toBe(2);
  });

  test('pause → resume restores playing', async ({ page }) => {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    expect((await game(page)).state).toBe('paused');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    expect((await game(page)).state).toBe('playing');
  });

  test('challenge payload reaches the game scene', async ({ page }) => {
    await page.evaluate(() => (window as any).__otf.scene.start('Game', { index: 10, challengeDeaths: 3 }));
    await page.waitForTimeout(700);
    const d = await page.evaluate(() => (window as any).__otf.scene.getScene('Game').challengeDeaths);
    expect(d).toBe(3);
  });
});
