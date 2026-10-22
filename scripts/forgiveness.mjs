// Timing-tolerance probe: replay each level's solution N times with every
// timed segment jittered by ±J frames (≈ human timing noise) and report the
// success rate. usage: node scripts/forgiveness.mjs [N=60] [J=3] [ids...]
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
const [N = '60', J = '3', ...only] = process.argv.slice(2);
const all = JSON.parse(readFileSync('tests/replays/levels.json', 'utf8'));
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 960, height: 540 } });
await page.goto('http://localhost:4173/');
await page.waitForFunction(() => window.__otfSim && window.__otf?.scene?.isActive('Menu'), null, { timeout: 15000 });
let seed = 12345;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const out = {};
for (const [id, rep] of Object.entries(all)) {
  if (only.length && !only.includes(id)) continue;
  const index = (Number(id[0]) - 1) * 8 + Number(id[2]) - 1;
  const progs = [];
  for (let k = 0; k < +N; k++) {
    progs.push(rep.program.split(' ').map((t) => {
      const m = /^([LRJ_]+)(\d+)$/.exec(t);
      if (!m) return t;
      const n = Math.max(0, +m[2] + Math.round((rnd() * 2 - 1) * +J));
      return m[1] + n;
    }).join(' '));
  }
  const ok = await page.evaluate(([i, ps, d]) => ps.filter((p) => { const r = window.__otfSim.run(i, p, { settle: false }); return r.completed && r.deaths === (d ?? 0); }).length, [index, progs, rep.deaths]);
  out[id] = Math.round((100 * ok) / +N);
  console.log(id, `${out[id]}%`);
}
writeFileSync('docs/forgiveness.json', JSON.stringify({ N: +N, jitterFrames: +J, successPct: out }, null, 1));
await b.close();
