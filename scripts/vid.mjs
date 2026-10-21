import { chromium } from 'playwright';
const browser = await chromium.launch(); const ctx = await browser.newContext({ viewport: { width: 960, height: 540 }, recordVideo: { dir: 'docs/shots/video', size: { width: 960, height: 540 } } });
const page = await ctx.newPage();
await page.goto('http://localhost:4173/');
await page.waitForFunction(() => (window).__otf?.scene, { timeout: 15000 });

// 4-4: press → door sinks → bridge erupts → cross it
await page.evaluate(() => (window).__otf.scene.start('Game', { index: 27 }));
await page.waitForFunction(() => (window).__otf.scene.getScene('Game').state === 'playing', { timeout: 15000 });
await page.waitForTimeout(600);
const place = (x, y) => page.evaluate(([x, y]) => { const s = (window).__otf.scene.getScene('Game'); s.player.setPosition(x, y); s.player.body.setVelocity(0, 0); }, [x, y]);
await place(140, 452); await page.waitForTimeout(350);
await page.keyboard.down('ArrowRight'); await page.waitForTimeout(500); await page.keyboard.up('ArrowRight');
await page.waitForTimeout(900); // door sinking + bridge erupting
await place(400, 452);
await page.keyboard.down('ArrowRight');
await page.waitForTimeout(900);
await page.keyboard.press('Space');
await page.waitForTimeout(800);
await page.keyboard.press('Space');
await page.waitForTimeout(1200);
await page.keyboard.up('ArrowRight');

// 3-7 attempt 1 → bridge; die; attempt 2 → collapse + landing spikes
await page.evaluate(() => (window).__otf.scene.start('Game', { index: 22 }));
await page.waitForFunction(() => (window).__otf.scene.getScene('Game').state === 'playing', { timeout: 15000 });
await page.waitForTimeout(500);
await page.keyboard.down('ArrowRight');
await page.waitForTimeout(1600); // walk onto bridge, get stung
await page.keyboard.up('ArrowRight');
await page.waitForTimeout(900);
// attempt 2: take planks, hop the landing sting
await place(380, 430);
await page.waitForTimeout(400);
await page.keyboard.down('ArrowRight'); await page.keyboard.press('Space');
await page.waitForTimeout(500); await page.keyboard.press('Space');
await page.waitForTimeout(700); await page.keyboard.press('Space');
await page.waitForTimeout(1400);
await page.keyboard.up('ArrowRight');
await ctx.close();
console.log('video saved');
