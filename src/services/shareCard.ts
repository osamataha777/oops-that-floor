/**
 * Funny Failure Card — rendered locally on an offscreen canvas.
 * Original Pip illustration + caption + level + attempts + branding.
 */

export interface CardInput {
  levelId: string;
  levelName: string;
  attempts: number;
  caption: string;
  code?: string;
}

export function renderShareCard(o: CardInput): string {
  const W = 1200;
  const H = 630;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d')!;

  // background
  ctx.fillStyle = '#f4efe6';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#e9e1d2';
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.ellipse(100 + i * 220, H + 60, 220, 170 + (i % 2) * 40, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Pip — squished under a floor tile
  const px = 200;
  const py = 360;
  ctx.fillStyle = '#6b5e52';
  roundRect(ctx, px - 90, py - 150, 180, 60, 14);
  ctx.fill();
  ctx.fillStyle = '#8a7b6c';
  roundRect(ctx, px - 90, py - 150, 180, 18, { tl: 14, tr: 14, bl: 0, br: 0 });
  ctx.fill();
  // pip body
  ctx.fillStyle = '#3d3a50';
  roundRect(ctx, px - 70, py - 60, 140, 70, 26);
  ctx.fill();
  // belly
  ctx.fillStyle = '#f6f1e7';
  roundRect(ctx, px - 46, py - 30, 92, 26, 12);
  ctx.fill();
  // shocked eyes
  ctx.fillStyle = '#fffaf0';
  ctx.beginPath();
  ctx.arc(px - 26, py - 42, 13, 0, Math.PI * 2);
  ctx.arc(px + 26, py - 42, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2a2740';
  ctx.beginPath();
  ctx.arc(px - 26, py - 42, 5, 0, Math.PI * 2);
  ctx.arc(px + 26, py - 42, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(px, py - 16, 9, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  // sweat drop
  ctx.fillStyle = '#5aa8f2';
  ctx.beginPath();
  ctx.ellipse(px + 62, py - 70, 8, 12, 0.4, 0, Math.PI * 2);
  ctx.fill();
  // confetti
  const conf = ['#f2a541', '#58c472', '#5aa8f2', '#f25a68'];
  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = conf[i % 4];
    ctx.save();
    ctx.translate(px - 140 + Math.random() * 280, py - 220 + Math.random() * 120);
    ctx.rotate(Math.random() * Math.PI);
    ctx.fillRect(0, 0, 14, 8);
    ctx.restore();
  }

  // text
  ctx.fillStyle = '#3f372f';
  ctx.font = '800 64px ui-rounded, "SF Pro Rounded", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Oops! That Floor!', 430, 140);
  ctx.fillStyle = '#7a6f62';
  ctx.font = '700 34px ui-rounded, "SF Pro Rounded", system-ui, sans-serif';
  ctx.fillText(`Level ${o.levelId} — ${o.levelName}`, 434, 200);
  ctx.fillStyle = '#3f372f';
  ctx.font = '800 46px ui-rounded, "SF Pro Rounded", system-ui, sans-serif';
  wrapText(ctx, `“${o.caption}”`, 434, 290, 700, 54);
  ctx.fillStyle = '#b8452f';
  ctx.font = '800 40px ui-rounded, "SF Pro Rounded", system-ui, sans-serif';
  ctx.fillText(o.attempts === 1 ? 'Cleared on attempt 1' : `${o.attempts} attempts to clear`, 434, 420);
  if (o.code) {
    ctx.fillStyle = '#4a72b0';
    ctx.font = '700 34px ui-monospace, monospace';
    ctx.fillText(`Challenge: ${o.code}`, 434, 480);
  }
  ctx.fillStyle = '#7a6f62';
  ctx.font = '600 26px ui-rounded, "SF Pro Rounded", system-ui, sans-serif';
  ctx.fillText('Can you do better?', 434, 540);

  return cv.toDataURL('image/png');
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number | { tl: number; tr: number; bl: number; br: number },
): void {
  const rr = typeof r === 'number' ? { tl: r, tr: r, bl: r, br: r } : r;
  ctx.beginPath();
  ctx.moveTo(x + rr.tl, y);
  ctx.lineTo(x + w - rr.tr, y);
  ctx.arcTo(x + w, y, x + w, y + rr.tr, rr.tr);
  ctx.lineTo(x + w, y + h - rr.br);
  ctx.arcTo(x + w, y + h, x + w - rr.br, y + h, rr.br);
  ctx.lineTo(x + rr.bl, y + h);
  ctx.arcTo(x, y + h, x, y + h - rr.bl, rr.bl);
  ctx.lineTo(x, y + rr.tl);
  ctx.arcTo(x, y, x + rr.tl, y, rr.tl);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number): void {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > maxW && line) {
      ctx.fillText(line, x, yy);
      line = w;
      yy += lh;
    } else {
      line = t;
    }
  }
  ctx.fillText(line, x, yy);
}
