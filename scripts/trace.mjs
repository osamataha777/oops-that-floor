// Dev tool: print a frame-stamped trace for one replay.
// usage: node scripts/trace.mjs <levelId> "<program>" [every=5]
import { chromium } from 'playwright';
const [id, prog, every = '5'] = process.argv.slice(2);
const index = (Number(id[0]) - 1) * 8 + Number(id[2]) - 1;
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 960, height: 540 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto('http://localhost:4173/');
await page.waitForFunction(() => window.__otfSim && window.__otf?.scene?.isActive('Menu'), null, { timeout: 15000 });
const t0 = Date.now();
const r = await page.evaluate(([i, p, e]) => window.__otfSim.run(i, p, { settle: false, every: +e }), [index, prog, every]);
console.log(`${r.level} completed=${r.completed} deaths=${r.deaths} frames=${r.frames} causes=${r.causes.join('|')} (${Date.now() - t0}ms)`);
console.log('events:', r.events.join(' '));
console.log(r.trace.map((p, k) => `${(k + 1) * +every}:${p[0]},${p[1]}`).join(' '));
await b.close();
