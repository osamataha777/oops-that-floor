// Runs every replay in tests/replays/levels.json against the built game and
// prints one line per level. Exit code 1 if any level fails its expectation.
// usage: node scripts/verify-levels.mjs [levelId ...]
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const all = JSON.parse(readFileSync('tests/replays/levels.json', 'utf8'));
const only = process.argv.slice(2);
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 960, height: 540 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto('http://localhost:4173/');
await page.waitForFunction(() => window.__otfSim && window.__otf?.scene?.isActive('Menu'), null, { timeout: 15000 });
const ids = await page.evaluate(() => window.__otf.scene.getScene('Game') ? [] : []);
let bad = 0;
for (const [id, rep] of Object.entries(all)) {
  if (only.length && !only.includes(id)) continue;
  const index = (Number(id[0]) - 1) * 8 + Number(id[2]) - 1;
  const r = await page.evaluate(([i, p]) => window.__otfSim.run(i, p, { settle: false }), [index, rep.program]);
  const okDeaths = rep.deaths === undefined ? true : r.deaths === rep.deaths;
  let naiveOk = true;
  let naiveNote = '';
  if (rep.naive) {
    const n = await page.evaluate(([i, p]) => window.__otfSim.run(i, p, { settle: false }), [index, rep.naive]);
    naiveOk = !(n.completed && n.deaths === 0);
    naiveNote = ` naive:${n.completed ? 'completed' : 'failed'}/${n.deaths}d`;
  }
  const ok = r.completed && okDeaths && r.illegalTransitions === 0 && naiveOk;
  if (!ok) bad++;
  const tr = r.trace.filter((_, k) => k % 5 === 0).map((p) => p.join(',')).join(' ');
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id} deaths=${r.deaths}${rep.deaths !== undefined ? `/${rep.deaths}` : ''} frames=${r.frames} ${(r.frames / 60).toFixed(1)}s${naiveNote}${ok ? '' : ` final=${JSON.stringify(r.final)} causes=${r.causes.join('|')}\n   trace: ${tr}`}`);
}
await b.close();
process.exit(bad ? 1 : 0);
