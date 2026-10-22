import Phaser from 'phaser';
import { ChapterTheme, GAME_HEIGHT } from '../core/config';
import { VIEW, TEX } from '../core/view';
import { bakeImage } from '../core/bake';

type G = Phaser.GameObjects.Graphics;

function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
}

function sky(g: G, w: number, top: number, bottom: number): void {
  const bands = 28;
  for (let i = 0; i < bands; i++) {
    g.fillStyle(lerpColor(top, bottom, i / (bands - 1)), 1);
    g.fillRect(0, (i * GAME_HEIGHT) / bands, w, GAME_HEIGHT / bands + 1);
  }
}

/** Rolling silhouette band (hills/dunes) along the bottom. */
function hills(g: G, w: number, base: number, amp: number, period: number, color: number, alpha = 1, seed = 0): void {
  g.fillStyle(color, alpha);
  const pts: Phaser.Types.Math.Vector2Like[] = [{ x: 0, y: GAME_HEIGHT }];
  for (let x = 0; x <= w; x += 8) {
    const y = base - Math.sin((x + seed) / period) * amp - Math.sin((x + seed * 2) / (period * 0.43)) * amp * 0.35;
    pts.push({ x, y });
  }
  pts.push({ x: w, y: GAME_HEIGHT });
  g.fillPoints(pts, true);
}

function lollipopTree(g: G, x: number, y: number, s: number, trunk: number, crown: number): void {
  g.fillStyle(trunk, 1);
  g.fillRoundedRect(x - 2 * s, y - 22 * s, 4 * s, 22 * s, 2 * s);
  g.fillStyle(crown, 1);
  g.fillCircle(x, y - 28 * s, 13 * s);
  g.fillCircle(x - 8 * s, y - 22 * s, 8 * s);
  g.fillCircle(x + 8 * s, y - 23 * s, 9 * s);
}

function gear(g: G, x: number, y: number, r: number, teeth: number, color: number, hole: number): void {
  g.fillStyle(color, 1);
  g.fillCircle(x, y, r);
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    const tw = (Math.PI / teeth) * 0.9;
    g.fillTriangle(
      x + Math.cos(a - tw) * r, y + Math.sin(a - tw) * r,
      x + Math.cos(a + tw) * r, y + Math.sin(a + tw) * r,
      x + Math.cos(a) * (r + r * 0.22), y + Math.sin(a) * (r + r * 0.22),
    );
  }
  g.fillStyle(hole, 1);
  g.fillCircle(x, y, r * 0.38);
}

/** Static painted layers per chapter (baked once per chapter and reused). */
function paint(g: G, ch: number, t: ChapterTheme, w: number): void {
  sky(g, w, t.skyTop, t.skyBottom);
  const H = GAME_HEIGHT;
  switch (ch) {
    case 1: {
      // sun with soft halo
      g.fillStyle(0xffffff, 0.22).fillCircle(w - 190, 92, 64);
      g.fillStyle(0xfff6d8, 0.9).fillCircle(w - 190, 92, 36);
      hills(g, w, H - 150, 26, 160, t.bgFar, 1, 40);
      for (let x = 60; x < w; x += 170) lollipopTree(g, x + ((x * 13) % 50), H - 140 + ((x * 7) % 18), 0.8, t.bgMid, t.bgMid);
      hills(g, w, H - 95, 20, 120, t.bgMid, 1, 300);
      for (let x = 30; x < w; x += 230) lollipopTree(g, x + ((x * 11) % 60), H - 86, 1.15, 0x8e6a4f, t.bgNear);
      hills(g, w, H - 46, 14, 90, t.bgNear, 1, 90);
      // little flowers on the near hill
      for (let x = 10; x < w; x += 37) {
        const y = H - 40 - ((x * 17) % 26);
        g.fillStyle([0xffffff, 0xffd166, 0xff9fb2][x % 3], 0.9).fillCircle(x, y, 2.2);
      }
      break;
    }
    case 2: {
      // (the big gears are live objects — see paintBackdrop)
      // factory skyline
      g.fillStyle(t.bgMid, 1);
      for (let x = 0; x < w; x += 120) {
        const bh = 120 + ((x * 31) % 90);
        g.fillRect(x, H - bh, 90, bh);
        g.fillRect(x + 60, H - bh - 50, 14, 50); // chimney
        g.fillStyle(t.bgNear, 0.6);
        for (let wy = H - bh + 18; wy < H - 30; wy += 26) {
          g.fillRect(x + 14, wy, 18, 10);
          g.fillRect(x + 50, wy, 18, 10);
        }
        g.fillStyle(t.bgMid, 1);
      }
      // pipes
      g.fillStyle(t.bgNear, 1);
      g.fillRect(0, H - 70, w, 12);
      for (let x = 40; x < w; x += 180) g.fillRect(x, H - 70, 12, 70);
      g.fillStyle(0xffffff, 0.15).fillRect(0, H - 69, w, 3);
      break;
    }
    case 3: {
      g.fillStyle(0xffffff, 0.35).fillCircle(w * 0.72, 130, 70);
      g.fillStyle(t.skyTop, 1).fillCircle(w * 0.72 + 22, 118, 58); // crescent
      // upside-down islands hanging from the top
      for (let i = 0; i < 4; i++) {
        const cx = (i + 0.5) * (w / 4) + ((i * 53) % 40);
        const cy = 40 + (i % 2) * 40;
        g.fillStyle(t.bgFar, 1);
        g.fillTriangle(cx - 60, cy, cx + 60, cy, cx + 5, cy + 70 + (i % 3) * 20);
        g.fillStyle(t.bgMid, 1).fillRoundedRect(cx - 64, cy - 10, 128, 16, 8);
        // upside-down tree
        g.fillStyle(t.bgMid, 1).fillRect(cx + 20, cy - 34, 4, 26);
        g.fillCircle(cx + 22, cy - 40, 12);
      }
      hills(g, w, H - 120, 30, 140, t.bgMid, 0.8, 120);
      // crystal spires
      for (let x = 20; x < w; x += 95) {
        const hgt = 60 + ((x * 29) % 70);
        g.fillStyle(t.bgNear, 1).fillTriangle(x, H, x + 18, H - hgt, x + 36, H);
        g.fillStyle(0xffffff, 0.14).fillTriangle(x + 18, H - hgt, x + 26, H - hgt * 0.4, x + 22, H);
      }
      break;
    }
    case 4: {
      // academy towers
      g.fillStyle(t.bgFar, 1);
      for (let x = 50; x < w; x += 210) {
        const th = 170 + ((x * 13) % 80);
        g.fillRect(x, H - th, 70, th);
        g.fillTriangle(x - 8, H - th, x + 35, H - th - 60, x + 78, H - th);
        g.fillStyle(t.skyBottom, 1).fillRoundedRect(x + 25, H - th + 30, 20, 30, { tl: 10, tr: 10, bl: 0, br: 0 });
        g.fillStyle(t.bgFar, 1);
      }
      hills(g, w, H - 70, 10, 100, t.bgMid, 1, 10);
      // bunting across the top
      g.lineStyle(2, t.ink, 0.35);
      g.beginPath();
      for (let x = 0; x <= w; x += 10) g.lineTo(x, 26 + Math.sin(x / 90) * 10);
      g.strokePath();
      const flags = [0xf2c14e, 0xe0604a, 0x5aa8f2, 0x7cc46a];
      for (let x = 20, i = 0; x < w; x += 44, i++) {
        const y = 26 + Math.sin(x / 90) * 10;
        g.fillStyle(flags[i % 4], 0.9).fillTriangle(x - 9, y, x + 9, y, x, y + 16);
      }
      // stage curtains framing the screen edges
      for (const side of [0, 1]) {
        const cw = Math.max(16, VIEW.ox + 8);
        const x0 = side ? w - cw : 0;
        g.fillStyle(0x8f2f2a, 1).fillRect(x0, 0, cw, H);
        g.fillStyle(0x6e2220, 1);
        for (let f = 0; f < cw; f += 18) g.fillRect(x0 + f + 6, 0, 6, H);
        g.fillStyle(0xc9443b, 0.35);
        for (let f = 0; f < cw; f += 18) g.fillRect(x0 + f, 0, 3, H);
        g.fillStyle(0xf2c14e, 1).fillRect(side ? x0 : x0 + cw - 5, 0, 5, H);
      }
      g.fillStyle(0x8f2f2a, 1).fillRect(0, 0, w, 16);
      break;
    }
    case 5: {
      // stars
      for (let i = 0; i < 70; i++) {
        const x = (i * 137.5) % w;
        const y = (i * 61.7) % (H * 0.55);
        g.fillStyle(0xffffff, 0.25 + ((i * 7) % 5) / 10).fillCircle(x, y, (i % 3) * 0.5 + 0.7);
      }
      g.fillStyle(0xfff1d6, 0.12).fillCircle(w * 0.25, 120, 80);
      g.fillStyle(0xfff1d6, 0.95).fillCircle(w * 0.25, 120, 44);
      g.fillStyle(0xe8d9b8, 0.6).fillCircle(w * 0.25 - 12, 110, 8).fillCircle(w * 0.25 + 14, 132, 5);
      // castle on a hill — the floor's final form
      hills(g, w, H - 140, 40, 200, t.bgFar, 1, 60);
      const cx = w * 0.7;
      g.fillStyle(t.bgFar, 1);
      g.fillRect(cx - 70, H - 260, 140, 120);
      for (const tx of [-80, -10, 60]) {
        g.fillRect(cx + tx, H - 300 - (tx === -10 ? 30 : 0), 22, 160);
        g.fillTriangle(cx + tx - 6, H - 300 - (tx === -10 ? 30 : 0), cx + tx + 11, H - 340 - (tx === -10 ? 30 : 0), cx + tx + 28, H - 300 - (tx === -10 ? 30 : 0));
      }
      g.fillStyle(0xffb35c, 0.85);
      for (const [wx, wy] of [[-40, -220], [0, -230], [36, -205], [-4, -300]]) g.fillRoundedRect(cx + wx, H + wy, 7, 11, { tl: 3, tr: 3, bl: 0, br: 0 });
      hills(g, w, H - 70, 18, 80, t.bgMid, 1, 200);
      hills(g, w, H - 30, 10, 60, t.bgNear, 1, 20);
      break;
    }
  }
}

/**
 * Paints the chapter world behind the level: baked parallax layers plus a
 * few owned ambient animations. Returns nothing to manage — every object is
 * scene-owned and dies with the scene.
 */
export function paintBackdrop(scene: Phaser.Scene, ch: number, t: ChapterTheme, reduced: boolean, left = -VIEW.ox): void {
  const w = VIEW.w;
  bakeImage(scene, `backdrop-${ch}-${w}`, left, 0, w, GAME_HEIGHT, (g) => paint(g, ch, t, w), { reuse: true }).setDepth(-10);
  const L = left;
  if (ch === 2) {
    // machinery in the haze (static under reduced motion)
    for (const [gx, gy, r, dir] of [[w * 0.18, 150, 70, 1], [w * 0.78, 110, 52, -1]] as const) {
      const gg = scene.add.graphics().setDepth(-9).setPosition(L + gx, gy);
      gear(gg, 0, 0, r, r > 60 ? 12 : 10, t.bgFar, t.skyTop);
      if (!reduced) scene.tweens.add({ targets: gg, angle: 360 * dir, duration: 26000, repeat: -1 });
    }
  }
  if (reduced) return;
  switch (ch) {
    case 1: {
      for (let i = 0; i < 3; i++) {
        const c = scene.add.container(L - 140 + i * 360, 50 + i * 46).setDepth(-6).setAlpha(0.85);
        c.add(scene.add.ellipse(0, 0, 120, 30, 0xffffff, 0.75));
        c.add(scene.add.ellipse(-26, -12, 58, 26, 0xffffff, 0.75));
        c.add(scene.add.ellipse(24, -10, 48, 22, 0xffffff, 0.75));
        scene.tweens.add({ targets: c, x: L + w + 140, duration: 42000 + i * 9000, repeat: -1, onRepeat: () => c.setX(L - 160) });
      }
      // butterflies — the world is innocent, honest
      for (let i = 0; i < 2; i++) {
        const b = scene.add.container(L + 200 + i * 400, 300 - i * 60).setDepth(-5);
        const wl = scene.add.ellipse(-3, 0, 6, 9, i ? 0xffd166 : 0xff9fb2);
        const wr = scene.add.ellipse(3, 0, 6, 9, i ? 0xffd166 : 0xff9fb2);
        b.add([wl, wr]);
        scene.tweens.add({ targets: [wl, wr], scaleX: 0.2, duration: 140, yoyo: true, repeat: -1 });
        scene.tweens.add({ targets: b, x: `+=${160 + i * 60}`, y: `-=${50}`, duration: 5200 + i * 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
      break;
    }
    case 2: {
      // steam puffs from chimneys
      const steam = scene.add.particles(0, 0, 'dot', {
        x: { min: L, max: L + w }, y: GAME_HEIGHT - 220,
        speedY: { min: -26, max: -12 }, speedX: { min: -6, max: 6 },
        lifespan: 3800, frequency: 900, quantity: 1,
        scale: { start: 1.6 / TEX, end: 4 / TEX }, alpha: { start: 0.28, end: 0 }, tint: 0xffffff,
      });
      steam.setDepth(-7);
      break;
    }
    case 3: {
      for (let i = 0; i < 14; i++) {
        const s = scene.add.image(L + ((i * 97) % w), 40 + ((i * 53) % 260), 'star').setScale((0.5 + (i % 3) * 0.2) / TEX).setTint(t.mote).setAlpha(0.2).setDepth(-8);
        scene.tweens.add({ targets: s, alpha: 0.85, duration: 900 + (i % 5) * 300, yoyo: true, repeat: -1, delay: i * 170, ease: 'Sine.easeInOut' });
      }
      break;
    }
    case 4: {
      // sweeping spotlights
      for (const [x0, dir] of [[w * 0.3, 1], [w * 0.7, -1]] as const) {
        const cone = scene.add.graphics().setDepth(-7).setPosition(L + x0, -10).setAlpha(0.14);
        cone.fillStyle(0xfff3c4, 1).fillTriangle(0, 0, -70, GAME_HEIGHT + 40, 70, GAME_HEIGHT + 40);
        cone.setAngle(-14 * dir);
        scene.tweens.add({ targets: cone, angle: 14 * dir, duration: 4200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
      break;
    }
    case 5: {
      const embers = scene.add.particles(0, 0, 'dot', {
        x: { min: L, max: L + w }, y: GAME_HEIGHT + 6,
        speedY: { min: -60, max: -28 }, speedX: { min: -14, max: 14 },
        lifespan: 6000, frequency: 260, quantity: 1,
        scale: { start: 0.55 / TEX, end: 0 }, alpha: { start: 0.9, end: 0 }, tint: [0xffb27a, 0xff8a4c, 0xffd29a],
      });
      embers.setDepth(-5);
      break;
    }
  }
}
