import Phaser from 'phaser';
import { ChapterTheme, COLORS } from '../../core/config';
import { Rect } from '../../levels/types';

/** Deterministic hash so brick/stain patterns never shuffle between runs. */
function hash(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >> 13)) * 1274126177;
  return (h ^ (h >> 16)) >>> 0;
}

/** Solid tile block — outlined, beveled top, subtle brick seams. */
export function drawTile(g: Phaser.GameObjects.Graphics, r: Rect, t: ChapterTheme, tell?: 'crack' | 'wobble' | 'none'): void {
  const h = hash(Math.round(r.x), Math.round(r.y));
  // shadow + outline
  g.fillStyle(t.solidDark, 1);
  g.fillRoundedRect(r.x, r.y + 1, r.w, r.h + 1, 6);
  // body
  g.fillStyle(t.solid, 1);
  g.fillRoundedRect(r.x, r.y, r.w, r.h - 2, 6);
  // beveled top lip
  g.fillStyle(t.solidTop, 1);
  g.fillRoundedRect(r.x, r.y, r.w, Math.min(9, r.h), { tl: 6, tr: 6, bl: 0, br: 0 });
  g.fillStyle(0xffffff, 0.18);
  g.fillRoundedRect(r.x + 2, r.y + 1, r.w - 4, 3, 2);
  // bottom inner shadow
  g.fillStyle(t.solidDark, 0.5);
  g.fillRoundedRect(r.x + 2, r.y + r.h - 6, r.w - 4, 3, 2);
  // deterministic brick seam hints (only on bigger blocks)
  if (r.h >= 24 && h % 3 === 0) {
    g.fillStyle(t.solidDark, 0.35);
    g.fillRect(r.x + r.w * 0.5 - 1, r.y + 10, 2, r.h - 18);
  }
  if (r.w >= 60 && h % 4 === 0) {
    g.fillStyle(t.solidDark, 0.3);
    g.fillRect(r.x + 4, r.y + r.h * 0.55, r.w - 8, 2);
  }
  // occasional speckle — gives the flat fill texture
  if (h % 5 === 0) {
    g.fillStyle(0xffffff, 0.1);
    g.fillCircle(r.x + 6 + (h % Math.max(1, r.w - 12)), r.y + r.h * 0.6, 1.4);
  }
  if (tell === 'crack') {
    g.lineStyle(1.6, 0x1a1512, 0.4);
    g.beginPath();
    g.moveTo(r.x + r.w * 0.3, r.y + 4);
    g.lineTo(r.x + r.w * 0.45, r.y + r.h * 0.5);
    g.lineTo(r.x + r.w * 0.35, r.y + r.h - 3);
    g.moveTo(r.x + r.w * 0.45, r.y + r.h * 0.5);
    g.lineTo(r.x + r.w * 0.62, r.y + r.h * 0.62);
    g.strokePath();
  }
}

/** One-way platform — plank look: lighter, thinner, visible edge. */
export function drawPlatformTile(g: Phaser.GameObjects.Graphics, r: Rect, t: ChapterTheme): void {
  g.fillStyle(t.solidDark, 0.55);
  g.fillRoundedRect(r.x, r.y + 2, r.w, r.h, 6);
  g.fillStyle(t.platform, 1);
  g.fillRoundedRect(r.x, r.y, r.w, r.h - 2, 6);
  g.fillStyle(0xffffff, 0.4);
  g.fillRoundedRect(r.x + 2, r.y + 1, r.w - 4, 4, 2);
  // plank notches
  g.fillStyle(t.solidDark, 0.3);
  const n = Math.max(2, Math.floor(r.w / 40));
  for (let i = 1; i < n; i++) {
    g.fillRect(r.x + (r.w / n) * i - 1, r.y + 2, 2, r.h - 5);
  }
}

/** Upward spike strip along the top of a rect — metallic, shaded, dangerous. */
export function drawSpikeStrip(g: Phaser.GameObjects.Graphics, r: Rect, w?: number): void {
  const width = w ?? r.w;
  const n = Math.max(2, Math.round(width / 15));
  const sw = width / n;
  // base plate
  g.fillStyle(COLORS.hazardDark, 1);
  g.fillRoundedRect(r.x - 1, r.y + 11, width + 2, 4, 2);
  for (let i = 0; i < n; i++) {
    const x = r.x + i * sw;
    // dark edge
    g.fillStyle(COLORS.hazardDark, 1);
    g.fillTriangle(x, r.y + 13, x + sw / 2, r.y - 1, x + sw, r.y + 13);
    // shiny face
    g.fillStyle(COLORS.hazard, 1);
    g.fillTriangle(x + 1.5, r.y + 13, x + sw / 2, r.y + 1, x + sw - 1.5, r.y + 13);
    // glint
    g.fillStyle(0xffffff, 0.5);
    g.fillTriangle(x + sw / 2, r.y + 1, x + sw / 2 + 1.6, r.y + 7, x + sw / 2 - 0.6, r.y + 7);
  }
}

/** Cute exit door — frame, glow, pennant. */
export function drawGoal(g: Phaser.GameObjects.Graphics, r: Rect): void {
  const cx = r.x + r.w / 2;
  g.fillStyle(0x000000, 0.14);
  g.fillEllipse(cx, r.y + r.h, r.w * 0.95, 9);
  // outer frame
  g.fillStyle(COLORS.goalDark, 1);
  g.fillRoundedRect(r.x + 2, r.y - 2, r.w - 4, r.h + 2, { tl: 16, tr: 16, bl: 4, br: 4 });
  // door body
  g.fillStyle(COLORS.goal, 1);
  g.fillRoundedRect(r.x + 6, r.y + 2, r.w - 12, r.h - 4, { tl: 12, tr: 12, bl: 3, br: 3 });
  // inner glow
  g.fillStyle(0xeafff0, 0.9);
  g.fillRoundedRect(r.x + 11, r.y + 7, r.w - 22, r.h - 12, { tl: 9, tr: 9, bl: 2, br: 2 });
  // dark doorway center
  g.fillStyle(COLORS.goalDark, 1);
  g.fillRoundedRect(r.x + 14, r.y + 10, r.w - 28, r.h - 15, { tl: 8, tr: 8, bl: 2, br: 2 });
  // knob
  g.fillStyle(0xfffaf0, 1);
  g.fillCircle(cx + (r.w - 20) / 4, r.y + r.h * 0.58, 3);
  // pennant
  g.fillStyle(COLORS.goalDark, 1);
  g.fillRect(cx - 1.5, r.y - 20, 3, 20);
  g.fillStyle(COLORS.goal, 1);
  g.fillTriangle(cx + 1.5, r.y - 20, cx + 14, r.y - 15.5, cx + 1.5, r.y - 11);
  g.fillStyle(0xffffff, 0.4);
  g.fillTriangle(cx + 1.5, r.y - 20, cx + 8, r.y - 17.6, cx + 1.5, r.y - 15.3);
}

/** Pressure plate. */
export function drawPlate(g: Phaser.GameObjects.Graphics, r: Rect, pressed: boolean, t: ChapterTheme): void {
  g.fillStyle(t.solidDark, 0.9);
  g.fillRoundedRect(r.x + 1, r.y + r.h - 8, r.w - 2, 8, 3);
  g.fillStyle(pressed ? COLORS.hazard : t.accent, 1);
  const h = pressed ? 4 : 9;
  g.fillRoundedRect(r.x + 4, r.y + r.h - 9 - h, r.w - 8, h, 3);
  g.fillStyle(0xffffff, pressed ? 0.15 : 0.35);
  g.fillRoundedRect(r.x + 6, r.y + r.h - 8 - h, r.w - 12, 2, 1);
}

/** Small chevron arrows on a conveyor surface. */
export function drawConveyorArrows(g: Phaser.GameObjects.Graphics, r: Rect, dir: 1 | -1, phase: number, t: ChapterTheme): void {
  g.fillStyle(0xffffff, 0.55);
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
