// Performance & long-session stability probe. usage:
//   node scripts/perf.mjs [--headed] [--out docs/perf-results.json]
// Numbers from a desktop browser are NOT device numbers; they bound CPU cost
// of the game logic and catch leaks. Real-device FPS must be measured on
// hardware (see docs/TEST_REPORT.md).
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
const headed = process.argv.includes('--headed');
const outIdx = process.argv.indexOf('--out');
const out = outIdx > 0 ? process.argv[outIdx + 1] : null;
const b = await chromium.launch({ headless: !headed, args: ['--js-flags=--expose-gc'] });
const page = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const t0 = Date.now();
await page.goto('http://localhost:4173/');
await page.waitForFunction(() => window.__otf?.scene?.isActive('Menu'), null, { timeout: 20000 });
const menuReadyMs = Date.now() - t0;

const res = await page.evaluate(async () => {
  const g = window.__otf;
  const sim = window.__otfSim;
  const heap = () => { window.gc?.(); window.gc?.(); return performance.memory ? +(performance.memory.usedJSHeapSize / 1048576).toFixed(2) : null; };
  const game = () => g.scene.getScene('Game');
  const counts = () => { const s = game(); return { children: s.children.list.length, tweens: s.tweens.getTweens().length, bodies: s.physics.world.bodies.size + s.physics.world.staticBodies.size, timers: s.time._active?.length ?? null }; };
  const r = { resolution: window.__otfView.res, viewW: window.__otfView.w };

  // logic-only cost per frame on the busiest levels (no rendering)
  r.logicMsPerFrame = {};
  for (const [id, idx] of [['4-3', 26], ['5-5', 36], ['2-8', 15]]) {
    sim.run(idx, '_1', { settle: false, tail: 0 });
    const s = game();
    const t = performance.now();
    for (let i = 0; i < 600; i++) { s.ctl.scripted = { dir: i % 240 < 120 ? 1 : 0, jumpDown: i % 50 === 0, jumpHeld: i % 50 < 10 }; sim.step(); }
    r.logicMsPerFrame[id] = +((performance.now() - t) / 600).toFixed(3);
  }

  // full frame incl. WebGL render (software GL when headless)
  sim.run(36, '_1', { settle: false, tail: 0 });
  const renderTimes = [];
  let now = performance.now();
  for (let i = 0; i < 240; i++) { const t = performance.now(); now += 16.67; g.loop.delta = 16.67; g.step(now, 16.67); renderTimes.push(performance.now() - t); }
  renderTimes.sort((a, b) => a - b);
  r.fullFrameMs = { p50: +renderTimes[120].toFixed(2), p95: +renderTimes[228].toFixed(2), p99: +renderTimes[237].toFixed(2) };

  // death → control (frames on the 60 Hz sim clock), 30 deaths on 1-3
  sim.run(2, '_1', { settle: false, tail: 0 });
  let s = game();
  const d2c = [];
  let deadAt = -1;
  for (let f = 0; f < 6000 && d2c.length < 30; f++) {
    s.ctl.scripted = { dir: 1, jumpDown: false, jumpHeld: false };
    sim.step();
    if (s.state === 'dying' && deadAt < 0) deadAt = f;
    if (deadAt >= 0 && s.state === 'playing') { d2c.push(f - deadAt); deadAt = -1; }
  }
  d2c.sort((a, b) => a - b);
  r.deathToControlMs = { p50: Math.round((d2c[15] * 1000) / 60), p95: Math.round((d2c[28] * 1000) / 60) };

  // 200 deaths in one visit: heap + object counts must stay flat
  sim.run(26, '_1', { settle: false, tail: 0 }); // 4-3: periodic spikes, crusher (timers + tweens)
  s = game();
  for (let i = 0; i < 200; i++) sim.step(1);
  r.before200 = { heapMB: heap(), ...counts() };
  let deaths = 0;
  for (let f = 0; f < 60000 && deaths < 200; f++) {
    s.ctl.scripted = { dir: 1, jumpDown: false, jumpHeld: false };
    const was = s.deathsThisVisit;
    sim.step();
    if (s.deathsThisVisit !== was) deaths++;
  }
  for (let i = 0; i < 60; i++) sim.step();
  r.after200 = { deaths, heapMB: heap(), ...counts() };

  // 40 level loads back to back
  r.levelLoads = { before: heap() };
  const loadMs = [];
  for (let i = 0; i < 40; i++) { const t = performance.now(); sim.run(i, '_30', { settle: false, tail: 0 }); loadMs.push(performance.now() - t); }
  r.levelLoads.after = heap();
  loadMs.sort((a, b) => a - b);
  r.levelLoads.loadPlus30FramesMs = { p50: +loadMs[20].toFixed(1), max: +loadMs[39].toFixed(1) };
  g.loop.wake();
  return r;
});

// real-time rAF cadence on a live level (headed = representative of this machine)
await page.evaluate(() => window.__otf.scene.start('Game', { index: 36 }));
await page.waitForFunction(() => window.__otf.scene.getScene('Game')?.state === 'playing');
await page.keyboard.down('ArrowRight');
const deltas = await page.evaluate(() => new Promise((resolve) => { const d = []; let last = performance.now(); let n = 0; const tick = (t) => { d.push(t - last); last = t; if (++n < 300) requestAnimationFrame(tick); else resolve(d); }; requestAnimationFrame(tick); }));
await page.keyboard.up('ArrowRight');
deltas.sort((a, b) => a - b);
res.rafLive = { mode: headed ? 'headed' : 'headless (software GL — not representative)', fps: +(1000 / (deltas.reduce((a, b) => a + b, 0) / deltas.length)).toFixed(1), p95: +deltas[284].toFixed(1) };
res.menuReadyMs = menuReadyMs;
res.errors = errors;
res.when = new Date().toISOString();
console.log(JSON.stringify(res, null, 1));
if (out) writeFileSync(out, JSON.stringify(res, null, 1));
await b.close();
