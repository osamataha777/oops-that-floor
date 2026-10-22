// Dev tool: record real-time gameplay video of a replay (headed Chromium).
// usage: node scripts/record.mjs out.webm <levelId> "<program>" [extraMs]
import { chromium } from 'playwright';
import { renameSync, mkdirSync } from 'node:fs';
const [out, id, prog, extra = '1500'] = process.argv.slice(2);
const index = (Number(id[0]) - 1) * 8 + Number(id[2]) - 1;
const dir = '/tmp/otf-rec-' + Date.now();
mkdirSync(dir, { recursive: true });
const b = await chromium.launch({ headless: false });
const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir, size: { width: 1280, height: 720 } } });
const page = await ctx.newPage();
await page.goto('http://localhost:4173/');
await page.waitForFunction(() => window.__otfSim && window.__otf?.scene?.isActive('Menu'));
await page.waitForTimeout(1800);
const done = await page.evaluate(([i, p]) => new Promise((resolve) => {
  const g = window.__otf;
  // expand the DSL into per-frame inputs (same semantics as src/dev/sim.ts, minus G/W tokens resolved live)
  const segs = p.trim().split(/\s+/).map((tok) => {
    if (tok === 'W') return { wait: true };
    const m = /^([LRJ_]+)(\d+|G)$/.exec(tok);
    const k = m[1];
    return { dir: k.includes('L') && !k.includes('R') ? -1 : k.includes('R') && !k.includes('L') ? 1 : 0, jump: k.includes('J'), frames: m[2] === 'G' ? 90 : +m[2], untilGround: m[2] === 'G' };
  });
  g.scene.start('Game', { index: i });
  let seg = 0, f = 0, prevJump = false, started = false;
  const onStep = () => {
    const s = g.scene.getScene('Game');
    if (!s || !s.ctl) return;
    if (!started) { if (s.state !== 'playing') return; started = true; }
    if (s.state === 'complete' || seg >= segs.length) { g.events.off('prestep', onStep); setTimeout(() => resolve(s.state), 0); return; }
    const sg = segs[seg];
    if (sg.wait) { if (s.state === 'playing' && f > 2) { seg++; f = 0; } else { s.ctl.scripted = { dir: 0, jumpDown: false, jumpHeld: false }; f++; } return; }
    if (sg.untilGround && f > 1 && s.player.grounded && s.state === 'playing') { seg++; f = 0; return onStep(); }
    s.ctl.scripted = { dir: sg.dir, jumpDown: sg.jump && !prevJump, jumpHeld: sg.jump };
    prevJump = sg.jump;
    if (++f >= sg.frames) { seg++; f = 0; }
  };
  g.events.on('prestep', onStep);
}), [index, prog]);
await page.waitForTimeout(+extra);
const v = page.video();
await ctx.close();
renameSync(await v.path(), out);
console.log(id, 'ended in state', done, '→', out);
await b.close();
