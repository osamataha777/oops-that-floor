import { test, expect } from '@playwright/test';

/**
 * Real UI flows through actual pointer clicks (960×540 viewport → the view is
 * exactly 960 wide, so logical == CSS coordinates).
 */
const waitMenu = (page: import('@playwright/test').Page) =>
  page.waitForFunction(() => (window as any).__otf?.scene?.isActive('Menu'), null, { timeout: 15000 });
const active = (page: import('@playwright/test').Page, key: string) =>
  page.waitForFunction((k) => (window as any).__otf.scene.isActive(k), key, { timeout: 5000 });

test('boot → menu → Play starts 1-1 and the game runs without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/');
  await waitMenu(page);
  await page.waitForTimeout(400);
  await page.mouse.click(288, 300); // Play
  await active(page, 'Game');
  await page.waitForFunction(() => (window as any).__otf.scene.getScene('Game').state === 'playing');
  expect(await page.evaluate(() => (window as any).__otf.scene.getScene('Game').def.id)).toBe('1-1');
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(300);
  await page.keyboard.press('Space');
  await page.waitForTimeout(400);
  await page.keyboard.up('ArrowRight');
  expect(errors.filter((e) => !e.includes('AudioContext'))).toEqual([]);
});

test('Levels → tap 1-1 tile → game starts; back button returns to menu', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/');
  await waitMenu(page);
  await page.waitForTimeout(400);
  await page.mouse.click(146, 400); // Levels
  await active(page, 'Select');
  await page.waitForTimeout(300);
  await page.mouse.click(40, 40); // back
  await waitMenu(page);
  await page.mouse.click(146, 400);
  await active(page, 'Select');
  await page.waitForTimeout(300);
  await page.mouse.click(159, 207); // first tile (1-1)
  await active(page, 'Game');
  expect(errors).toEqual([]);
});

test('pause button opens the pause menu; Resume continues play', async ({ page }) => {
  await page.goto('/');
  await waitMenu(page);
  await page.waitForTimeout(400);
  await page.mouse.click(288, 300);
  await page.waitForFunction(() => (window as any).__otf.scene.getScene('Game')?.state === 'playing');
  await page.mouse.click(926, 30); // HUD pause
  await page.waitForFunction(() => (window as any).__otf.scene.getScene('Game').state === 'paused');
  await page.mouse.click(480, 228); // Resume
  await page.waitForFunction(() => (window as any).__otf.scene.getScene('Game').state === 'playing');
});

test('settings panel opens from the menu and closes', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/');
  await waitMenu(page);
  await page.waitForTimeout(400);
  await page.mouse.click(430, 400); // Settings
  await page.waitForTimeout(300);
  const open = await page.evaluate(() => !!(window as any).__otf.scene.getScene('Menu').overlay);
  expect(open).toBe(true);
  // toggle Screen shake (left column) and verify it persisted
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('otf.settings.v1') ?? '{}').shake ?? true);
  await page.mouse.click(284, 289); // "Screen shake" row (panel centre 270, row y +19)
  await page.waitForTimeout(150);
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('otf.settings.v1') ?? '{}').shake);
  expect(after).toBe(!before);
  expect(errors).toEqual([]);
});
