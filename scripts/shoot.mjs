// Dev tool: deterministic screenshots. Each shot replays `program` on a level
// (frozen sim), then renders one frame. usage:
//   node scripts/shoot.mjs outDir WxH@dpr '[["name", index, "R40", {"touch":true}], ["menu", -1]]'
import { chromium } from 'playwright';
const [outDir, vp, json] = process.argv.slice(2);
const [, w, h, dpr] = /^(\d+)x(\d+)@?([\d.]*)$/.exec(vp);
const shots = JSON.parse(json);
const b = await chromium.launch();
for (const [name, idx, prog, opts = {}] of shots) {
  const ctx = await b.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: +(dpr || 1), hasTouch: !!opts.touch });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await page.goto('http://localhost:4173/');
  await page.waitForFunction(() => window.__otfSim && window.__otf?.scene?.isActive('Menu'), null, { timeout: 15000 });
  if (idx === -1) {
    await page.waitForTimeout(opts.wait ?? 1600);
  } else if (idx === -2) {
    await page.evaluate(() => window.__otf.scene.start('Select'));
    await page.waitForTimeout(opts.wait ?? 900);
  } else {
    await page.evaluate(([i, p]) => window.__otfSim.run(i, p || '_1', { settle: false, tail: 0 }), [idx, prog]);
    // render a few real frames without advancing gameplay
    await page.evaluate(() => { const s = window.__otf.scene.getScene('Game'); s.ctl.scripted = { dir: 0, jumpDown: false, jumpHeld: false }; });
    await page.evaluate(() => { for (let i = 0; i < (window.__shotFrames ?? 1); i++) window.__otf.loop.step(performance.now()); });
  }
  await page.screenshot({ path: `${outDir}/${name}.png` });
  await ctx.close();
  console.log('shot', name);
}
await b.close();
