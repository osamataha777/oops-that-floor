// Dev tool: compose screenshots into one contact sheet.
// usage: node scripts/sheet.mjs out.png cols a.png b.png ...
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const [out, cols, ...files] = process.argv.slice(2);
const imgs = files.map((f) => `<figure><img src="data:image/png;base64,${readFileSync(f).toString('base64')}"><figcaption>${f.split('/').pop()}</figcaption></figure>`).join('');
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: 1600, height: 900 } });
await page.setContent(`<style>body{margin:0;background:#222;display:grid;grid-template-columns:repeat(${cols},1fr);gap:4px}figure{margin:0;position:relative}img{width:100%;display:block}figcaption{position:absolute;bottom:2px;right:6px;color:#fff;font:12px sans-serif;text-shadow:0 0 3px #000}</style>${imgs}`);
await page.waitForTimeout(200);
await page.screenshot({ path: out, fullPage: true });
await b.close();
