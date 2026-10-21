import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 960, height: 540 }, recordVideo: { dir: 'docs/shots', size: { width: 960, height: 540 } } });
await p.goto('http://localhost:5173');
await p.waitForTimeout(2500);
await p.screenshot({ path: 'docs/shots/menu-v2.png' });
// level select
await p.evaluate(() => window.__otf.scene.start('Select'));
await p.waitForTimeout(700);
await p.screenshot({ path: 'docs/shots/select-v2.png' });
// ch1 gameplay: walk right on 1-1, die on the spike (confetti gag)
await p.evaluate(() => window.__otf.scene.start('Game', { index: 0 }));
await p.waitForTimeout(900);
await p.keyboard.down('ArrowRight');
await p.waitForTimeout(1200);
await p.keyboard.up('ArrowRight');
await p.waitForTimeout(300);
await p.screenshot({ path: 'docs/shots/1-1-v2.png' });
// 1-4 shy door
await p.evaluate(() => window.__otf.scene.start('Game', { index: 3 }));
await p.waitForTimeout(900);
await p.screenshot({ path: 'docs/shots/1-4-v2.png' });
// ch3 gravflip level for palette variety
await p.evaluate(() => window.__otf.scene.start('Game', { index: 16 }));
await p.waitForTimeout(900);
await p.screenshot({ path: 'docs/shots/3-1-v2.png' });
// ch5 dusk palette
await p.evaluate(() => window.__otf.scene.start('Game', { index: 33 }));
await p.waitForTimeout(900);
await p.screenshot({ path: 'docs/shots/5-2-v2.png' });
await p.waitForTimeout(400);
await p.close();
await b.close();
console.log('done');
