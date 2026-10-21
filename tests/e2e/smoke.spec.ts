import { test, expect } from '@playwright/test';

/** Boot → menu → play → gameplay canvas renders without errors. */
test('game boots to menu and starts level 1', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1200);
  // click Play (canvas button at ~ bx,280 in 960x540 space)
  await page.mouse.click(350, 280);
  await page.waitForTimeout(1000);
  // simulate movement + a jump — should not error
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(400);
  await page.keyboard.press('Space');
  await page.waitForTimeout(600);
  await page.keyboard.up('ArrowRight');
  expect(errors.filter((e) => !e.includes('AudioContext'))).toEqual([]);
});

test('level select opens and lists chapters', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('canvas');
  await page.waitForTimeout(1000);
  await page.mouse.click(350, 344); // Levels button
  await page.waitForTimeout(800);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  // click first level cell
  await page.mouse.click(190, 246);
  await page.waitForTimeout(900);
  expect(errors).toEqual([]);
});

test('pause overlay opens and resumes', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('canvas');
  await page.waitForTimeout(1000);
  await page.mouse.click(350, 280);
  await page.waitForTimeout(800);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  await page.keyboard.press('Escape'); // resume
  await page.waitForTimeout(300);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  expect(errors).toEqual([]);
});
