import { chromium } from 'playwright';
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 960, height: 540 } });
for (const [name, idx] of [['ch2-motif', 9], ['ch3-motif', 21], ['ch4-motif', 29], ['ch5-motif', 36], ['new-3-4', 19], ['new-4-4', 27], ['new-5-6', 37]]) {
  await page.goto('http://localhost:4173/');
  await page.waitForFunction(() => (window).__otf?.scene, { timeout: 15000 });
  await page.evaluate((i) => (window).__otf.scene.start('Game', { index: i }), idx);
  await page.waitForFunction(() => (window).__otf.scene.getScene('Game').state === 'playing', { timeout: 15000 });
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `docs/shots/v21-${name}.png` });
  console.log('shot', name);
}
await b.close();
