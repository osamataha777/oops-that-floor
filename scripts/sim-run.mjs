// Dev tool: run deterministic replays against the built game.
// usage: node scripts/sim-run.mjs '[[0,"R60 RJ20 R80"]]'   (index, program)
//        node scripts/sim-run.mjs --shot out.png '[[0,"R60"]]'
import { chromium } from 'playwright';
const args = process.argv.slice(2);
let shot = null;
if (args[0] === '--shot') { shot = args[1]; args.splice(0, 2); }
const runs = JSON.parse(args[0] ?? '[]');
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 960, height: 540 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto('http://localhost:4173/');
await page.waitForFunction(() => window.__otfSim && window.__otf?.scene?.isActive('Menu'), null, { timeout: 15000 });
for (const [idx, prog, opts] of runs) {
  const r = await page.evaluate(([i, p, o]) => window.__otfSim.run(i, p, { ...(o ?? {}), settle: false }), [idx, prog, opts]);
  const { trace, ...rest } = r;
  console.log(JSON.stringify(rest), 'trace:', trace.filter((_, k) => k % 3 === 0).map((p) => p.join(',')).join(' '));
}
if (shot) {
  await page.evaluate(() => window.__otf.loop.wake());
  await page.waitForTimeout(400);
  await page.screenshot({ path: shot });
}
await b.close();
