import Phaser from 'phaser';
import { ChapterTheme, COLORS, TILE } from '../../core/config';
import { Rect } from '../../levels/types';

type G = Phaser.GameObjects.Graphics;

/** Deterministic hash so pebble/brick patterns never shuffle between runs. */
export function hash(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >> 13)) * 1274126177;
  return (h ^ (h >> 16)) >>> 0;
}

/** Which sides of a cell face open air (true = exposed). */
export interface Edges {
  top: boolean;
  bottom: boolean;
  left: boolean;
  right: boolean;
}

export const ALL_EXPOSED: Edges = { top: true, bottom: true, left: true, right: true };

/** High-contrast mode: hazards get a bold ink outline + stripes (set per scene). */
export const DRAW_OPTS = { highContrast: false };

const R = 7; // exposed-corner radius

/**
 * One 30×30 ground cell in the chapter's material. Edges decide where the
 * lip, outline and rounded corners go so runs of cells read as one mass.
 * `wx, wy` are world coords used only to seed the deterministic detail.
 */
export function drawCell(g: G, x: number, y: number, e: Edges, t: ChapterTheme, tell?: 'crack' | 'wobble' | 'none', wx = x, wy = y): void {
  const s = TILE;
  const h = hash(Math.round(wx / s), Math.round(wy / s));
  const rad = {
    tl: e.top && e.left ? R : 0,
    tr: e.top && e.right ? R : 0,
    bl: e.bottom && e.left ? R - 2 : 0,
    br: e.bottom && e.right ? R - 2 : 0,
  };
  // outline/shadow mass
  g.fillStyle(t.solidDark, 1);
  g.fillRoundedRect(x, y, s, s, rad);
  // body inset on exposed sides so the dark rim becomes an outline
  const il = e.left ? 2 : 0;
  const ir = e.right ? 2 : 0;
  const ib = e.bottom ? 4 : 0;
  g.fillStyle(t.solid, 1);
  g.fillRoundedRect(x + il, y, s - il - ir, s - ib, {
    tl: rad.tl ? R - 1 : 0, tr: rad.tr ? R - 1 : 0, bl: rad.bl ? R - 3 : 0, br: rad.br ? R - 3 : 0,
  });

  switch (t.material) {
    case 'turf': {
      // pebbles + speckle in the soil
      g.fillStyle(t.detail, 0.9);
      if (h % 3 === 0) g.fillEllipse(x + 6 + (h % 17), y + 14 + (h % 9), 5, 3.4);
      if (h % 4 === 1) g.fillEllipse(x + 18 - (h % 9), y + 22 - (h % 5), 3.6, 2.6);
      g.fillStyle(t.solidDark, 0.35);
      g.fillCircle(x + 4 + ((h >> 3) % 22), y + 9 + ((h >> 5) % 16), 1.2);
      if (e.top) {
        g.fillStyle(t.solidDark, 0.45);
        g.fillRect(x + il, y + 8, s - il - ir, 3);
        g.fillStyle(t.solidTop, 1);
        g.fillRoundedRect(x, y - 1, s, 9, { tl: rad.tl ? R : 0, tr: rad.tr ? R : 0, bl: 3, br: 3 });
        g.fillStyle(0xffffff, 0.28);
        g.fillRoundedRect(x + 2, y, s - 4, 2.4, 1.2);
        // blades poking up
        g.fillStyle(t.solidTop, 1);
        for (let i = 0; i < 3; i++) {
          const bx = x + 4 + ((h >> (i * 4)) % 22);
          g.fillTriangle(bx - 2, y + 1, bx, y - 3 - (i % 2), bx + 2, y + 1);
        }
        // tufts drooping over exposed edges
        if (e.left) g.fillEllipse(x + 1, y + 6, 5, 7);
        if (e.right) g.fillEllipse(x + s - 1, y + 6, 5, 7);
      }
      break;
    }
    case 'metal': {
      // big riveted plates spanning 2×2 cells, not a per-cell grid
      const pc = Math.round(wx / s) % 2 === 0;
      const pr = Math.round(wy / s) % 2 === 0;
      g.fillStyle(t.detail, 0.35);
      if (pc) g.fillRect(x, y, 1.5, s - ib);
      if (pr && !e.top) g.fillRect(x + il, y, s - il - ir, 1.5);
      g.fillStyle(t.detail, 1);
      if (pc && pr) g.fillCircle(x + 6, y + (e.top ? 11 : 6), 1.8);
      if (!pc && !pr) g.fillCircle(x + s - 6, y + s - 8, 1.8);
      if (h % 7 === 0) {
        // the odd bolted patch
        g.fillStyle(t.solidDark, 0.25).fillRoundedRect(x + 8, y + 12, 12, 9, 2);
      }
      if (e.top) {
        g.fillStyle(t.solidTop, 1);
        g.fillRoundedRect(x, y, s, 6, { tl: rad.tl ? R : 0, tr: rad.tr ? R : 0, bl: 0, br: 0 });
        g.fillStyle(t.solidDark, 0.85);
        for (let i = -1; i < 5; i++) {
          const sx = x + i * 8 + ((wx / s) % 2) * 4;
          g.fillTriangle(sx, y + 6, sx + 4, y, sx + 8, y);
          g.fillTriangle(sx, y + 6, sx + 4, y + 6, sx + 8, y);
        }
        g.fillStyle(0xffffff, 0.3);
        g.fillRect(x + 2, y, s - 4, 1.4);
      }
      break;
    }
    case 'crystal': {
      if (h % 3 !== 1) {
        // occasional embedded crystal, varied size — never a wallpaper
        const fx = x + 4 + (h % 13);
        const fh = 6 + ((h >> 4) % 9);
        const base = y + s - ib - 3 - ((h >> 7) % 8);
        g.fillStyle(t.detail, 0.85);
        g.fillTriangle(fx, base, fx + fh * 0.55, base - fh, fx + fh * 1.1, base);
        g.fillStyle(0xffffff, 0.12);
        g.fillTriangle(fx + 2, base - 1, fx + fh * 0.55, base - fh + 2, fx + fh * 0.6, base - 1);
      }
      g.fillStyle(t.solidDark, 0.25);
      g.fillCircle(x + 6 + ((h >> 9) % 18), y + 10 + ((h >> 11) % 12), 1.3);
      if (e.top) {
        g.fillStyle(t.solidTop, 0.35);
        g.fillRoundedRect(x, y - 2, s, 8, { tl: rad.tl ? R : 0, tr: rad.tr ? R : 0, bl: 2, br: 2 });
        g.fillStyle(t.solidTop, 1);
        g.fillRoundedRect(x + 1, y, s - 2, 4, { tl: rad.tl ? R - 1 : 0, tr: rad.tr ? R - 1 : 0, bl: 1, br: 1 });
        if (h % 3 === 0) {
          const cx = x + 8 + (h % 14);
          g.fillStyle(t.solidTop, 0.9);
          g.fillTriangle(cx - 3, y + 1, cx, y - 7, cx + 3, y + 1);
        }
      }
      break;
    }
    case 'brick': {
      g.fillStyle(t.detail, 0.9);
      const row = Math.round(wy / s);
      const off = row % 2 ? 0 : 15;
      g.fillRect(x + il, y + 14, s - il - ir, 2);
      g.fillRect(x + ((off + 7) % s), y + 4, 2, 10);
      g.fillRect(x + ((off + 22) % s), y + 16, 2, Math.max(0, s - ib - 18));
      g.fillStyle(0xffffff, 0.08);
      g.fillRect(x + il + 1, y + 1, s - il - ir - 2, 2);
      if (e.top) {
        g.fillStyle(t.solidDark, 1);
        g.fillRect(x, y + 6, s, 2);
        g.fillStyle(t.solidTop, 1);
        g.fillRoundedRect(x, y - 1, s, 7, { tl: rad.tl ? 4 : 0, tr: rad.tr ? 4 : 0, bl: 0, br: 0 });
        g.fillStyle(0xffffff, 0.35);
        g.fillRect(x + 1, y, s - 2, 1.6);
        g.fillStyle(t.solidDark, 0.5);
        g.fillCircle(x + 15, y + 2.6, 1.2);
      }
      break;
    }
    case 'slate': {
      g.fillStyle(t.detail, 0.7);
      g.fillRect(x + il, y + 11 + (h % 4), s - il - ir, 1.5);
      g.fillRect(x + il, y + 21 + (h % 3), s - il - ir, 1.2);
      if (h % 5 === 0) {
        g.lineStyle(1.4, t.solidTop, 0.75);
        g.beginPath();
        g.moveTo(x + 9, y + 9);
        g.lineTo(x + 14, y + 16);
        g.lineTo(x + 11, y + 24);
        g.strokePath();
      }
      if (e.top) {
        g.fillStyle(t.solidTop, 0.25);
        g.fillRoundedRect(x, y - 3, s, 7, { tl: rad.tl ? R : 0, tr: rad.tr ? R : 0, bl: 2, br: 2 });
        g.fillStyle(t.solidTop, 0.95);
        g.fillRect(x + (rad.tl ? 4 : 0), y, s - (rad.tl ? 4 : 0) - (rad.tr ? 4 : 0), 2.4);
        g.fillStyle(t.detail, 1);
        g.fillRect(x + il, y + 2.4, s - il - ir, 3);
      }
      break;
    }
  }

  // bottom lip shadow
  if (e.bottom) {
    g.fillStyle(0x000000, 0.12);
    g.fillRect(x + il + 2, y + s - ib - 3, s - il - ir - 4, 3);
  }

  if (tell === 'crack') drawCrack(g, x, y, h);
}

/** The deliberate tell: hairline crack + a missing chip. */
function drawCrack(g: G, x: number, y: number, h: number): void {
  const s = TILE;
  const flip = h % 2 ? 1 : -1;
  g.lineStyle(1.8, 0x1a1512, 0.55);
  g.beginPath();
  g.moveTo(x + s * 0.5 - 6 * flip, y + 3);
  g.lineTo(x + s * 0.5, y + s * 0.45);
  g.lineTo(x + s * 0.5 - 4 * flip, y + s - 6);
  g.moveTo(x + s * 0.5, y + s * 0.45);
  g.lineTo(x + s * 0.5 + 8 * flip, y + s * 0.6);
  g.strokePath();
  g.fillStyle(0x1a1512, 0.35);
  g.fillTriangle(x + s * 0.5 - 6 * flip, y + 2, x + s * 0.5 - 2 * flip, y + 2, x + s * 0.5 - 4 * flip, y + 6);
}

/**
 * A free-standing block of any size (dynamic traps), built from cells so it
 * matches the static ground exactly. `edgesAt` lets a disguised trap cell
 * blend into neighbouring floor; by default every side is exposed.
 */
export function drawTile(g: G, r: Rect, t: ChapterTheme, tell?: 'crack' | 'wobble' | 'none', edges?: Edges, world?: { x: number; y: number }): void {
  const cols = Math.max(1, Math.round(r.w / TILE));
  const rows = Math.max(1, Math.round(r.h / TILE));
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const e: Edges = {
        top: cy === 0 && (edges?.top ?? true),
        bottom: cy === rows - 1 && (edges?.bottom ?? true),
        left: cx === 0 && (edges?.left ?? true),
        right: cx === cols - 1 && (edges?.right ?? true),
      };
      const x = r.x + cx * TILE;
      const y = r.y + cy * TILE;
      drawCell(g, x, y, e, t, tell, (world?.x ?? r.x) + cx * TILE, (world?.y ?? r.y) + cy * TILE);
    }
  }
}

/**
 * One-way platform — visibly thin (the top 12 px of its cell) so it reads
 * as "stand on top / jump through", never as a solid block.
 */
export function drawPlatformTile(g: G, r: Rect, t: ChapterTheme): void {
  const y = r.y;
  const hgt = 11;
  // supports under each end
  g.fillStyle(t.solidDark, 0.5);
  g.fillRect(r.x + 5, y + hgt - 1, 3, 7);
  g.fillRect(r.x + r.w - 8, y + hgt - 1, 3, 7);
  g.fillStyle(t.solidDark, 1);
  g.fillRoundedRect(r.x, y + 1, r.w, hgt, 4);
  g.fillStyle(t.platform, 1);
  g.fillRoundedRect(r.x, y, r.w, hgt - 2, 4);
  g.fillStyle(0xffffff, 0.38);
  g.fillRoundedRect(r.x + 3, y + 1, r.w - 6, 2.4, 1.2);
  g.fillStyle(t.solidDark, 0.35);
  const n = Math.max(1, Math.round(r.w / TILE));
  for (let i = 1; i < n; i++) g.fillRect(r.x + (r.w / n) * i - 1, y + 2, 2, hgt - 5);
  g.fillStyle(t.ink, 0.45);
  for (let i = 0; i < n; i++) {
    const cx = r.x + (r.w / n) * (i + 0.5);
    g.fillCircle(cx - 8, y + 5, 1.1);
    g.fillCircle(cx + 8, y + 5, 1.1);
  }
}

/** Upward spike strip whose BASE sits at r.y + 14 (spike tips at r.y). */
export function drawSpikeStrip(g: G, r: Rect, w?: number, down = false): void {
  const width = w ?? r.w;
  const n = Math.max(2, Math.round(width / 15));
  const sw = width / n;
  const hc = DRAW_OPTS.highContrast;
  if (down) {
    // teeth pointing down (crusher underside / ceiling spikes)
    for (let i = 0; i < n; i++) {
      const x = r.x + i * sw;
      g.fillStyle(COLORS.hazardDark, 1);
      g.fillTriangle(x, r.y, x + sw / 2, r.y + 13, x + sw, r.y);
      g.fillStyle(COLORS.hazard, 1);
      g.fillTriangle(x + 1.5, r.y, x + sw / 2, r.y + 11, x + sw - 1.5, r.y);
      if (hc) {
        g.lineStyle(1.6, 0x111111, 1);
        g.strokeTriangle(x, r.y, x + sw / 2, r.y + 13, x + sw, r.y);
      }
    }
    return;
  }
  g.fillStyle(COLORS.hazardDark, 1);
  g.fillRoundedRect(r.x - 1, r.y + 11, width + 2, 4, 2);
  for (let i = 0; i < n; i++) {
    const x = r.x + i * sw;
    g.fillStyle(COLORS.hazardDark, 1);
    g.fillTriangle(x, r.y + 13, x + sw / 2, r.y - 1, x + sw, r.y + 13);
    g.fillStyle(COLORS.hazard, 1);
    g.fillTriangle(x + 1.5, r.y + 13, x + sw / 2, r.y + 1, x + sw - 1.5, r.y + 13);
    g.fillStyle(0xffffff, 0.55);
    g.fillTriangle(x + sw / 2, r.y + 1, x + sw / 2 + 1.6, r.y + 7, x + sw / 2 - 0.6, r.y + 7);
    if (hc) {
      g.lineStyle(1.6, 0x111111, 1);
      g.strokeTriangle(x, r.y + 13, x + sw / 2, r.y - 1, x + sw, r.y + 13);
    }
  }
}

/**
 * The exit: a cheerful round-topped door with a lit window and a little
 * flag. Its friendliness is the joke when it runs away.
 */
export function drawGoal(g: G, r: Rect, _t?: ChapterTheme): void {
  const cx = r.x + r.w / 2;
  const dw = r.w - 14;
  const dx = cx - dw / 2;
  g.fillStyle(0x000000, 0.16);
  g.fillEllipse(cx, r.y + r.h, r.w * 0.9, 8);
  // frame
  g.fillStyle(COLORS.goalDark, 1);
  g.fillRoundedRect(dx - 4, r.y - 2, dw + 8, r.h + 2, { tl: dw / 2 + 4, tr: dw / 2 + 4, bl: 3, br: 3 });
  g.fillStyle(COLORS.goal, 1);
  g.fillRoundedRect(dx, r.y + 2, dw, r.h - 4, { tl: dw / 2, tr: dw / 2, bl: 2, br: 2 });
  // planks
  g.fillStyle(COLORS.goalDark, 0.35);
  g.fillRect(cx - 1, r.y + 14, 2, r.h - 18);
  // window glow
  g.fillStyle(0xfff3b0, 1);
  g.fillCircle(cx, r.y + 14, 5.5);
  g.fillStyle(0xffffff, 0.8);
  g.fillCircle(cx - 1.6, r.y + 12.4, 1.6);
  g.lineStyle(1.4, COLORS.goalDark, 1);
  g.strokeCircle(cx, r.y + 14, 5.5);
  // knob
  g.fillStyle(0xfff3b0, 1);
  g.fillCircle(cx + dw / 2 - 6, r.y + r.h * 0.6, 2.6);
  // step
  g.fillStyle(COLORS.goalDark, 1);
  g.fillRoundedRect(dx - 6, r.y + r.h - 4, dw + 12, 4, 2);
  // flag
  g.fillStyle(COLORS.goalDark, 1);
  g.fillRect(cx - 1.2, r.y - 20, 2.4, 20);
  g.fillStyle(0xfff3b0, 1);
  g.fillTriangle(cx + 1.2, r.y - 20, cx + 14, r.y - 15.5, cx + 1.2, r.y - 11);
}

/** Pressure plate. */
export function drawPlate(g: G, r: Rect, pressed: boolean, t: ChapterTheme): void {
  g.fillStyle(t.solidDark, 0.9);
  g.fillRoundedRect(r.x + 1, r.y + r.h - 8, r.w - 2, 8, 3);
  g.fillStyle(pressed ? COLORS.hazard : t.accent, 1);
  const h = pressed ? 4 : 9;
  g.fillRoundedRect(r.x + 4, r.y + r.h - 9 - h, r.w - 8, h, 3);
  g.fillStyle(0xffffff, pressed ? 0.15 : 0.4);
  g.fillRoundedRect(r.x + 6, r.y + r.h - 8 - h, r.w - 12, 2, 1);
  if (!pressed) {
    g.fillStyle(t.ink, 0.5);
    g.fillCircle(r.x + r.w / 2, r.y + r.h - 9 - h / 2, 1.6);
  }
}

/** Small chevron arrows on a conveyor surface. */
export function drawConveyorArrows(g: G, r: Rect, dir: 1 | -1, phase: number, t: ChapterTheme): void {
  g.fillStyle(t.ink, 0.55);
  g.fillRoundedRect(r.x + 1, r.y + 1, r.w - 2, 10, 4);
  g.fillStyle(0xffffff, 0.75);
  const n = Math.floor(r.w / 26) + 1;
  for (let i = 0; i < n; i++) {
    const cx = r.x + 4 + ((i * 26 + phase) % (n * 26)) - 4;
    if (cx < r.x + 2 || cx > r.x + r.w - 10) continue;
    const y = r.y + 2;
    if (dir === 1) g.fillTriangle(cx, y, cx + 7, y + 4, cx, y + 8);
    else g.fillTriangle(cx + 7, y, cx, y + 4, cx + 7, y + 8);
  }
}

/** Ghost/impostor floor — identical to a solid tile by default. */
export function drawGhost(g: G, r: Rect, t: ChapterTheme, tell?: 'crack' | 'wobble' | 'none', edges?: Edges, world?: { x: number; y: number }): void {
  drawTile(g, r, t, tell === 'wobble' ? 'none' : tell, edges, world);
}

/** Ceiling crusher: heavy riveted block with a toothed underside. */
export function drawCrusher(g: G, w: number, h: number, _y: number, t: ChapterTheme): void {
  g.fillStyle(0x000000, 0.18);
  g.fillRoundedRect(2, 4, w, h, 5);
  g.fillStyle(COLORS.hazardDark, 1);
  g.fillRoundedRect(0, 0, w, h, 5);
  g.fillStyle(t.ink, 0.25);
  g.fillRect(4, h * 0.35, w - 8, 3);
  g.fillStyle(0xffffff, 0.14);
  g.fillRoundedRect(3, 2, w - 6, 5, 3);
  // angry eyes — it WANTS this
  g.fillStyle(0xfffaf0, 1);
  g.fillEllipse(w / 2 - 7, h * 0.62, 7, 5);
  g.fillEllipse(w / 2 + 7, h * 0.62, 7, 5);
  g.fillStyle(t.ink, 1);
  g.fillCircle(w / 2 - 6, h * 0.64, 1.8);
  g.fillCircle(w / 2 + 6, h * 0.64, 1.8);
  g.lineStyle(2, t.ink, 1);
  g.beginPath();
  g.moveTo(w / 2 - 12, h * 0.42); g.lineTo(w / 2 - 3, h * 0.52);
  g.moveTo(w / 2 + 12, h * 0.42); g.lineTo(w / 2 + 3, h * 0.52);
  g.strokePath();
  drawSpikeStrip(g, { x: 0, y: h - 2, w, h: 12 }, undefined, true);
}

/** Moving platform: plank on a little rail cart. */
export function drawMover(g: G, w: number, h: number, t: ChapterTheme): void {
  g.fillStyle(t.solidDark, 1);
  g.fillRoundedRect(0, 2, w, h - 8, 7);
  g.fillStyle(t.accent, 1);
  g.fillRoundedRect(0, 0, w, h - 10, 7);
  g.fillStyle(0xffffff, 0.3);
  g.fillRoundedRect(3, 2, w - 6, 4, 2);
  g.fillStyle(t.ink, 0.35);
  for (let x = 10; x < w - 6; x += 18) g.fillCircle(x, (h - 10) * 0.55, 2);
  g.fillStyle(t.ink, 0.85);
  g.fillCircle(9, h - 6, 4.5);
  g.fillCircle(w - 9, h - 6, 4.5);
  g.fillStyle(0xffffff, 0.35);
  g.fillCircle(9, h - 6, 1.5);
  g.fillCircle(w - 9, h - 6, 1.5);
}

/** Spinner arm drawn pointing along +x from the hub at (0,0). */
export function drawSpinner(g: G, len: number, t: ChapterTheme): void {
  g.lineStyle(7, t.ink, 0.9);
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(len, 0);
  g.strokePath();
  for (const k of [0.4, 0.7, 1]) {
    const ox = len * k;
    g.fillStyle(COLORS.hazardDark, 1);
    for (let a = 0; a < 6; a++) {
      const r = (a / 6) * Math.PI * 2;
      g.fillTriangle(ox + Math.cos(r - 0.3) * 7, Math.sin(r - 0.3) * 7, ox + Math.cos(r + 0.3) * 7, Math.sin(r + 0.3) * 7, ox + Math.cos(r) * 13, Math.sin(r) * 13);
    }
    g.fillStyle(COLORS.hazard, 1);
    g.fillCircle(ox, 0, 8);
    g.fillStyle(0xffffff, 0.45);
    g.fillCircle(ox - 2.5, -2.5, 2.4);
    if (DRAW_OPTS.highContrast) {
      g.lineStyle(1.6, 0x111111, 1);
      g.strokeCircle(ox, 0, 8);
    }
  }
}

/** Spring pad; `coil` 0..1 = how stretched the spring is right after a launch. */
export function drawSpring(g: G, w: number, h: number, coil: number, t: ChapterTheme): void {
  const base = h;
  const ext = 9 + coil * 10;
  g.fillStyle(t.solidDark, 1);
  g.fillRoundedRect(3, base - 6, w - 6, 6, 2);
  g.lineStyle(3, t.ink, 0.85);
  g.beginPath();
  g.moveTo(w * 0.5, base - 6);
  for (let i = 1; i <= 4; i++) g.lineTo(i % 2 ? w * 0.74 : w * 0.26, base - 6 - (ext * i) / 4);
  g.strokePath();
  const top = base - 6 - ext;
  g.fillStyle(t.accent, 1);
  g.fillRoundedRect(1, top - 6, w - 2, 7, 3);
  g.fillStyle(0xffffff, 0.45);
  g.fillRoundedRect(4, top - 5, w - 8, 2, 1);
}

/** Gravity zone: soft field (static) or drifting chevrons (animated layer). */
export function drawGravZone(g: G, r: Rect, t: ChapterTheme, phase: number, chevronsOnly = false, dir: 1 | -1 = -1): void {
  if (!chevronsOnly) {
    g.fillStyle(t.accent, 0.13);
    g.fillRoundedRect(r.x, r.y, r.w, r.h, 8);
    g.lineStyle(2, t.accent, 0.5);
    g.strokeRoundedRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2, 8);
    return;
  }
  const cx = r.x + r.w / 2;
  const span = r.h - 12;
  for (let i = 0; i < 3; i++) {
    const k = (i / 3 + phase) % 1;
    const y = dir === -1 ? r.y + r.h - 6 - k * span : r.y + 6 + k * span;
    const a = Math.sin(k * Math.PI) * 0.75;
    g.fillStyle(t.accent, a);
    if (dir === -1) g.fillTriangle(cx - 8, y + 4, cx, y - 4, cx + 8, y + 4);
    else g.fillTriangle(cx - 8, y - 4, cx, y + 4, cx + 8, y - 4);
  }
}
