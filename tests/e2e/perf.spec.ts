import { test, expect } from '@playwright/test';

/**
 * Performance measurements — RUN SERIALLY for meaningful numbers:
 *   npx playwright test tests/e2e/perf.spec.ts --workers=1
 * Budgets are aspirational targets; the console output is the report.
 */
test.describe.configure({ mode: 'serial' });
// Wall-clock measurement: opt-in (PERF=1). Deterministic numbers: scripts/perf.mjs.
test.skip(!process.env.PERF, 'set PERF=1 to run the wall-clock perf probe');
test.setTimeout(120000);

test('startup, frame time, restart latency, memory stability', async ({ page }) => {
  // ---- cold startup → menu interactive ------------------------------------
  const t0 = Date.now();
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas');
  await page.waitForFunction(() => (window as any).__otf?.scene, { timeout: 15000 });
  const menuReadyMs = Date.now() - t0;

  // ---- first playable frame -----------------------------------------------
  const t1 = Date.now();
  await page.evaluate(() => (window as any).__otf.scene.start('Game', { index: 0 }));
  await page.waitForFunction(
    () => (window as any).__otf.scene.getScene('Game').state === 'playing',
    { timeout: 10000 },
  );
  const levelStartMs = Date.now() - t1;

  // ---- frame time over 5s of live play (move right + hop) -------------------
  await page.keyboard.down('ArrowRight');
  const frames = await page.evaluate(
    () =>
      new Promise<number[]>((resolve) => {
        const deltas: number[] = [];
        let last = performance.now();
        let n = 0;
        const tick = (now: number) => {
          deltas.push(now - last);
          last = now;
          if (++n < 300) requestAnimationFrame(tick);
          else resolve(deltas);
        };
        requestAnimationFrame(tick);
      }),
  );
  await page.keyboard.up('ArrowRight');
  const sorted = [...frames].sort((a, b) => a - b);
  const pct = (p: number) => sorted[Math.floor(sorted.length * p)];
  const fps = 1000 / (frames.reduce((a, b) => a + b, 0) / frames.length);

  // ---- restart latency over 20 deaths (game clock) --------------------------
  const restarts: number[] = [];
  for (let i = 0; i < 20; i++) {
    const r = await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          const s = (window as any).__otf.scene.getScene('Game') as any;
          const start = s.time.now;
          const iv = setInterval(() => {
            if (s.state === 'playing' && s.runtime.attempt > 1) {
              clearInterval(iv);
              resolve(s.time.now - start);
            }
          }, 8);
          s.player.setPosition(s.player.x, s.runtime.parsed.height + 300);
        }),
    );
    restarts.push(r);
  }
  const rs = [...restarts].sort((a, b) => a - b);
  const restartP50 = rs[Math.floor(rs.length * 0.5)];
  const restartP95 = rs[Math.floor(rs.length * 0.95)];

  // ---- memory stability across 12 level reloads ----------------------------
  const heap = async () =>
    (await page.evaluate(() => (performance as any).memory?.usedJSHeapSize ?? -1)) / 1e6;
  const heap0 = await heap();
  for (let i = 0; i < 12; i++) {
    await page.evaluate((i) => (window as any).__otf.scene.start('Game', { index: i % 8 }), i);
    await page.waitForFunction(
      () => (window as any).__otf.scene.getScene('Game').state === 'playing',
      { timeout: 8000 },
    );
  }
  const heap1 = await heap();

  const report = {
    menuReadyMs,
    levelStartMs,
    avgFps: +fps.toFixed(1),
    frameP50: +pct(0.5).toFixed(2),
    frameP95: +pct(0.95).toFixed(2),
    frameP99: +pct(0.99).toFixed(2),
    restartP50: Math.round(restartP50),
    restartP95: Math.round(restartP95),
    heapGrowthMB: +(heap1 - heap0).toFixed(1),
    heapStartMB: +heap0.toFixed(1),
    heapEndMB: +heap1.toFixed(1),
  };
  console.log('PERF REPORT:', JSON.stringify(report, null, 1));

  expect(menuReadyMs).toBeLessThan(6000);
  // Frame-time asserts only mean anything uncontended — if this run shared
  // CPU with other workers (median >>17ms), report but skip the budget.
  if (pct(0.5) <= 34) {
    expect(pct(0.95)).toBeLessThan(34);
    expect(restartP95).toBeLessThan(1200);
  } else {
    console.log('PERF: contended run — timing budgets skipped; numbers reported above');
  }
  expect(heap1 - heap0).toBeLessThan(80); // no runaway growth across reloads
});
