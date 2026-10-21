// Dev tool: brute-force a replay template against the real game sim.
// usage: node scripts/search.mjs <levelId> "<template>" '{"a":[10,30,2],"b":[6,14,2]}' [maxHits]
// Placeholders {name} take values from [from, to, step]. Prints every
// combination that completes with 0 deaths (first maxHits), plus a count —
// the count is a rough measure of how forgiving the timing is.
import { chromium } from 'playwright';
const [id, template, rangesJson, maxHits = '5', targetJson] = process.argv.slice(2);
const target = targetJson ? JSON.parse(targetJson) : null; // {x:[a,b], y:[a,b]} reach alive instead of completing
const ranges = JSON.parse(rangesJson);
const names = Object.keys(ranges);
const values = names.map((n) => { const [a, b, s = 1] = ranges[n]; const v = []; for (let x = a; x <= b; x += s) v.push(x); return v; });
const combos = [];
const rec = (i, acc) => { if (i === names.length) return combos.push({ ...acc }); for (const v of values[i]) rec(i + 1, { ...acc, [names[i]]: v }); };
rec(0, {});
const index = (Number(id[0]) - 1) * 8 + Number(id[2]) - 1;
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 960, height: 540 } });
await page.goto('http://localhost:4173/');
await page.waitForFunction(() => window.__otfSim && window.__otf?.scene?.isActive('Menu'), null, { timeout: 15000 });
const progs = combos.map((c) => template.replace(/\{(\w+)\}/g, (_, k) => c[k]));
const t0 = Date.now();
const results = await page.evaluate(([i, ps, tg]) => ps.map((p) => {
  const r = window.__otfSim.run(i, p, { settle: false, tail: tg ? 0 : 60 });
  const inT = tg && r.deaths === 0 && r.final.x >= tg.x[0] && r.final.x <= tg.x[1] && (!tg.y || (r.final.y >= tg.y[0] && r.final.y <= tg.y[1]));
  return { p, ok: tg ? inT : r.completed && r.deaths === 0, f: r.frames, d: r.deaths, x: r.final.x, y: r.final.y };
}), [index, progs, target]);
const hits = results.filter((r) => r.ok).sort((a, b) => a.f - b.f);
console.log(`${id}: ${hits.length}/${results.length} combos succeed (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
for (const h of hits.slice(0, +maxHits)) console.log(`  ${h.f}f  ${h.p}`);
if (!hits.length) {
  const best = results.sort((a, b) => b.x - a.x).slice(0, 3);
  for (const r of best) console.log(`  best-x ${r.x} deaths=${r.d}  ${r.p}`);
}
await b.close();
