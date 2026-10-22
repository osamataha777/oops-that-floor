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
    // optional extra sim frames (e.g. let a ribbon animate in), then an
    // optional scene action, then render exactly one real frame
    await page.evaluate(([after, action]) => {
      const s = window.__otf.scene.getScene('Game');
      s.ctl.scripted = { dir: 0, jumpDown: false, jumpHeld: false };
      if (action === 'pause') s.togglePause();
      if (action === 'settings') { s.togglePause(); s.openSettings?.call(s); }
      window.__otfSim.step(after || 0);
      window.__otf.step(performance.now(), 16.7);
    }, [opts.after ?? 0, opts.action ?? null]);
  }
  await page.screenshot({ path: `${outDir}/${name}.png` });
  await ctx.close();
  console.log('shot', name);
}
await b.close();
