import Phaser from 'phaser';
import { ChapterTheme, COLORS, TILE } from '../../core/config';
import { Rect } from '../../levels/types';

/** Solid tile block with a lighter top lip. */
export function drawTile(g: Phaser.GameObjects.Graphics, r: Rect, t: ChapterTheme, tell?: 'crack' | 'wobble' | 'none'): void {
  g.fillStyle(t.solid, 1);
  g.fillRoundedRect(r.x, r.y, r.w, r.h, 5);
  g.fillStyle(t.solidTop, 1);
  g.fillRoundedRect(r.x, r.y, r.w, Math.min(8, r.h), { tl: 5, tr: 5, bl: 0, br: 0 });
  if (tell === 'crack') {
    g.lineStyle(1.6, 0x000000, 0.25);
    g.beginPath();
    g.moveTo(r.x + r.w * 0.3, r.y + 4);
    g.lineTo(r.x + r.w * 0.45, r.y + r.h * 0.5);
    g.lineTo(r.x + r.w * 0.35, r.y + r.h - 3);
    g.strokePath();
  }
}

export function drawPlatformTile(g: Phaser.GameObjects.Graphics, r: Rect, t: ChapterTheme): void {
  g.fillStyle(t.platform, 1);
  g.fillRoundedRect(r.x, r.y, r.w, r.h, 6);
  g.fillStyle(0xffffff, 0.35);
  g.fillRoundedRect(r.x, r.y, r.w, 6, { tl: 6, tr: 6, bl: 0, br: 0 });
}

/** Upward spike strip along the top of a rect. */
export function drawSpikeStrip(g: Phaser.GameObjects.Graphics, r: Rect, w?: number): void {
  const width = w ?? r.w;
  const n = Math.max(2, Math.round(width / 15));
  const sw = width / n;
  g.fillStyle(COLORS.hazard, 1);
  for (let i = 0; i < n; i++) {
    const x = r.x + i * sw;
    g.fillTriangle(x, r.y + 14, x + sw / 2, r.y, x + sw, r.y + 14);
  }
  g.fillStyle(COLORS.hazardDark, 1);
  g.fillRect(r.x, r.y + 12, width, 3);
}

/** Cute exit door. */
export function drawGoal(g: Phaser.GameObjects.Graphics, r: Rect): void {
  const cx = r.x + r.w / 2;
  g.fillStyle(0x000000, 0.12);
  g.fillEllipse(cx, r.y + r.h, r.w * 0.9, 8);
  g.fillStyle(COLORS.goal, 1);
  g.fillRoundedRect(r.x + 4, r.y, r.w - 8, r.h, { tl: 14, tr: 14, bl: 3, br: 3 });
  g.fillStyle(COLORS.goalDark, 1);
  g.fillRoundedRect(r.x + 10, r.y + 8, r.w - 20, r.h - 12, { tl: 10, tr: 10, bl: 2, br: 2 });
  g.fillStyle(0xfffaf0, 1);
  g.fillCircle(cx + (r.w - 20) / 4, r.y + r.h * 0.55, 3);
  // tiny flag
  g.fillStyle(COLORS.goal, 1);
  g.fillRect(cx - 1, r.y - 16, 2, 16);
  g.fillTriangle(cx + 1, r.y - 16, cx + 12, r.y - 12, cx + 1, r.y - 8);
}

/** Pressure plate. */
export function drawPlate(g: Phaser.GameObjects.Graphics, r: Rect, pressed: boolean, t: ChapterTheme): void {
  g.fillStyle(t.solid, 0.9);
  g.fillRoundedRect(r.x + 1, r.y + r.h - 8, r.w - 2, 8, 3);
  g.fillStyle(pressed ? COLORS.hazard : t.accent, 1);
  const h = pressed ? 4 : 9;
  g.fillRoundedRect(r.x + 4, r.y + r.h - 9 - h, r.w - 8, h, 3);
}

/** Small chevron arrows on a conveyor surface. */
export function drawConveyorArrows(g: Phaser.GameObjects.Graphics, r: Rect, dir: 1 | -1, phase: number, t: ChapterTheme): void {
  g.fillStyle(t.solidTop, 1);
  const n = Math.max(2, Math.floor(r.w / 26));
  for (let i = 0; i < n; i++) {
    const cx = r.x + ((i * 26 + phase) % (r.w + 26)) - 13;
    const y = r.y + 5;
    if (dir === 1) g.fillTriangle(cx, y, cx + 10, y + 5, cx, y + 10);
    else g.fillTriangle(cx + 10, y, cx, y + 5, cx + 10, y + 10);
  }
}

/** Ghost/impostor floor — identical to a solid tile by default. */
export function drawGhost(g: Phaser.GameObjects.Graphics, r: Rect, t: ChapterTheme, tell?: 'crack' | 'wobble' | 'none'): void {
  drawTile(g, r, t, tell === 'wobble' ? 'none' : tell);
}
