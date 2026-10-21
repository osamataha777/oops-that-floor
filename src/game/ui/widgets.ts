import Phaser from 'phaser';
import { FONT, TXT, hex } from './theme';
import { COLORS, GAME_HEIGHT } from '../core/config';
import { VIEW } from '../core/view';
import { MOTION } from '../anim/motion';
import { services } from '../core/services';

const R = 16; // corner radius for chips/panels
export const INK = 0x2c2622;

function shade(c: number, k: number): number {
  const r = Math.max(0, Math.min(255, Math.round(((c >> 16) & 255) * k)));
  const g = Math.max(0, Math.min(255, Math.round(((c >> 8) & 255) * k)));
  const b = Math.max(0, Math.min(255, Math.round((c & 255) * k)));
  return (r << 16) | (g << 8) | b;
}

type Labeled = Phaser.GameObjects.Container & { labelObj?: Phaser.GameObjects.Text };

/**
 * Tactile "sticker" button: ink outline, a solid lip underneath that the
 * face presses down into. Press feedback is instant (no waiting on a tween)
 * and the action fires on release inside the button.
 */
export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  opts: {
    fill?: number;
    textStyle?: Phaser.Types.GameObjects.Text.TextStyle;
    depth?: number;
    icon?: string;
    disabled?: boolean;
  } = {},
): Labeled {
  const c = scene.add.container(x, y) as Labeled;
  const fill = opts.disabled ? 0xb9b0a1 : opts.fill ?? 0x4a4038;
  const lip = 5;
  const base = scene.add.graphics();
  base.fillStyle(INK, 1).fillRoundedRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + lip + 4, R + 2);
  base.fillStyle(shade(fill, 0.68), 1).fillRoundedRect(-w / 2, -h / 2 + lip, w, h, R);
  const face = scene.add.container(0, 0);
  const fg = scene.add.graphics();
  fg.fillStyle(fill, 1).fillRoundedRect(-w / 2, -h / 2, w, h, R);
  fg.fillStyle(0xffffff, 0.16).fillRoundedRect(-w / 2 + 4, -h / 2 + 3, w - 8, h * 0.38, { tl: R - 4, tr: R - 4, bl: 6, br: 6 });
  const fontSize = h >= 58 ? '24px' : h > 44 ? '20px' : '16px';
  const t = scene.add
    .text(0, -1, `${opts.icon ? opts.icon + '  ' : ''}${label}`, { ...TXT.light, fontSize, ...opts.textStyle })
    .setOrigin(0.5);
  if (opts.disabled) t.setAlpha(0.55);
  face.add([fg, t]);
  c.add([base, face]);
  c.setSize(w + 4, h + lip + 4);
  if (opts.depth) c.setDepth(opts.depth);
  if (!opts.disabled) {
    c.setInteractive({ useHandCursor: true });
    const up = () => face.setY(0);
    c.on('pointerdown', () => {
      face.setY(lip - 1);
      services.feedback?.emit('ui.tap');
    });
    c.on('pointerup', up);
    c.on('pointerout', up);
  }
  c.labelObj = t;
  return c;
}

/** Round icon button (pause, close, back). Drawn glyphs — no font dependence. */
export function iconButton(scene: Phaser.Scene, x: number, y: number, icon: 'pause' | 'close' | 'back' | 'gear', onTap: () => void, size = 44): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  const r = size / 2;
  g.fillStyle(INK, 0.72).fillCircle(0, 0, r);
  g.lineStyle(2, 0xfffaf0, 0.25).strokeCircle(0, 0, r - 2);
  g.fillStyle(0xfffaf0, 1);
  if (icon === 'pause') {
    g.fillRoundedRect(-7, -8, 5, 16, 2);
    g.fillRoundedRect(2, -8, 5, 16, 2);
  } else if (icon === 'close') {
    g.lineStyle(3.4, 0xfffaf0, 1);
    g.beginPath(); g.moveTo(-6, -6); g.lineTo(6, 6); g.moveTo(6, -6); g.lineTo(-6, 6); g.strokePath();
  } else if (icon === 'back') {
    g.fillTriangle(-8, 0, 3, -8, 3, 8);
    g.fillRect(2, -3, 7, 6);
  } else {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.fillCircle(Math.cos(a) * 7, Math.sin(a) * 7, 2.6);
    }
    g.fillCircle(0, 0, 6);
    g.fillStyle(INK, 1).fillCircle(0, 0, 2.6);
  }
  c.add(g);
  // generous hit area: at least 56 logical px
  const hit = Math.max(56, size + 12);
  c.setSize(hit, hit).setInteractive({ useHandCursor: true });
  c.on('pointerdown', () => g.setScale(0.9));
  c.on('pointerout', () => g.setScale(1));
  c.on('pointerup', () => {
    g.setScale(1);
    services.feedback?.emit('ui.tap');
    onTap();
  });
  return c;
}

/** Pill-shaped HUD chip (level tag, death counter). */
export function makeChip(scene: Phaser.Scene, x: number, y: number, text: string, fill = 0x4a4038, alpha = 0.92): Labeled {
  const c = scene.add.container(x, y) as Labeled;
  const t = scene.add.text(0, 0, text, TXT.chip).setOrigin(0.5);
  const w = Math.max(56, t.width + 24);
  const g = scene.add.graphics();
  g.fillStyle(fill, alpha);
  g.fillRoundedRect(-w / 2, -15, w, 30, 15);
  c.add([g, t]);
  c.setSize(w, 30);
  c.labelObj = t;
  return c;
}

export function panel(scene: Phaser.Scene, w: number, h: number, fill = 0xfffaf0, alpha = 1): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.2);
  g.fillRoundedRect(-w / 2, -h / 2 + 8, w, h, 24);
  g.fillStyle(INK, 1);
  g.fillRoundedRect(-w / 2 - 3, -h / 2 - 3, w + 6, h + 6, 26);
  g.fillStyle(fill, alpha);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, 24);
  return g;
}

/** Toggle switch row. */
export function makeToggle(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  initial: boolean,
  onChange: (v: boolean) => void,
  width = 340,
): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const t = scene.add.text(-width / 2, 0, label, TXT.body).setOrigin(0, 0.5);
  const track = scene.add.graphics();
  const tx = width / 2 - 58;
  const knob = scene.add.circle(0, 0, 12, 0xfffaf0).setStrokeStyle(2, INK, 0.25);
  const draw = (on: boolean) => {
    track.clear();
    track.fillStyle(INK, 1).fillRoundedRect(tx - 2, -16, 60, 32, 16);
    track.fillStyle(on ? 0x3f9d57 : 0xb9b0a1, 1).fillRoundedRect(tx, -14, 56, 28, 14);
    knob.setX(on ? tx + 42 : tx + 14);
  };
  let on = initial;
  draw(on);
  // whole row is the hit target — easier with thumbs
  const zone = scene.add.zone(0, 0, width + 16, 44).setInteractive({ useHandCursor: true });
  zone.on('pointerup', () => {
    on = !on;
    draw(on);
    services.feedback?.emit('ui.toggle');
    onChange(on);
  });
  c.add([t, track, knob, zone]);
  return c;
}

/**
 * Slider row. Hit-testing uses the track's world transform, so it works at
 * any nesting depth, camera zoom or container position.
 */
export function makeSlider(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  initial01: number,
  onChange: (v01: number) => void,
  width = 340,
  steps = 10,
): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const t = scene.add.text(-width / 2, 0, label, TXT.body).setOrigin(0, 0.5);
  const bw = 150;
  const bx = width / 2 - bw / 2 - 4;
  const track = scene.add.graphics();
  track.fillStyle(INK, 1).fillRoundedRect(bx - bw / 2 - 2, -7, bw + 4, 14, 7);
  track.fillStyle(0xe4dccb, 1).fillRoundedRect(bx - bw / 2, -5, bw, 10, 5);
  const fillG = scene.add.graphics();
  const knob = scene.add.circle(bx, 0, 12, 0xfffaf0).setStrokeStyle(3, INK);
  const set = (v01: number) => {
    v01 = Phaser.Math.Clamp(Math.round(v01 * steps) / steps, 0, 1);
    fillG.clear().fillStyle(0x3f9d57, 1).fillRoundedRect(bx - bw / 2, -5, Math.max(10, bw * v01), 10, 5);
    knob.setX(bx - bw / 2 + bw * v01);
    return v01;
  };
  let v = set(initial01);
  const zone = scene.add.zone(bx, 0, bw + 44, 44).setInteractive({ useHandCursor: true });
  const drag = (p: Phaser.Input.Pointer) => {
    const m = track.getWorldTransformMatrix();
    const local = m.applyInverse(p.worldX, p.worldY);
    const nv = set((local.x - (bx - bw / 2)) / bw);
    if (nv !== v) {
      v = nv;
      services.feedback?.emit('ui.toggle');
      onChange(v);
    }
  };
  zone.on('pointerdown', drag);
  zone.on('pointermove', (p: Phaser.Input.Pointer) => p.isDown && drag(p));
  c.add([t, track, fillG, knob, zone]);
  return c;
}

/** Dim the whole view; tap-to-dismiss via callback if provided. Blocks input below. */
export function dim(scene: Phaser.Scene, onTap?: () => void): Phaser.GameObjects.Rectangle {
  const r = scene.add.rectangle(0, 0, VIEW.w * 2, GAME_HEIGHT * 2, 0x1f1a16, 0.5).setInteractive();
  if (onTap) r.on('pointerup', onTap);
  return r;
}

export function tinyText(scene: Phaser.Scene, x: number, y: number, s: string, style = TXT.small): Phaser.GameObjects.Text {
  return scene.add.text(x, y, s, { ...style, fontFamily: FONT }).setOrigin(0.5);
}

/** Small non-blocking pill message in view space. */
export function toast(
  scene: Phaser.Scene,
  text: string,
  o: { y?: number; hold?: number; fill?: number; depth?: number } = {},
): void {
  const y = o.y ?? 64;
  const c = scene.add.container(VIEW.w / 2, y).setDepth(o.depth ?? 85).setScrollFactor(0, 0, true);
  const t = scene.add.text(0, 0, text, { ...TXT.chip, fontSize: '15px', wordWrap: { width: Math.min(640, VIEW.w - 80) }, align: 'center' }).setOrigin(0.5);
  const g = scene.add.graphics();
  g.fillStyle(o.fill ?? INK, 0.9).fillRoundedRect(-t.width / 2 - 18, -t.height / 2 - 9, t.width + 36, t.height + 18, 16);
  c.add([g, t]);
  const rm = services.settings.reducedMotion;
  c.setAlpha(0).setY(y + (y > GAME_HEIGHT / 2 ? 14 : -14));
  scene.tweens.add({ targets: c, alpha: 1, y, duration: rm ? 1 : MOTION.ui.toast.inMs, ease: 'Back.easeOut' });
  scene.tweens.add({ targets: c, alpha: 0, delay: (o.hold ?? MOTION.ui.toast.holdMs) + MOTION.ui.toast.inMs, duration: MOTION.ui.toast.outMs, onComplete: () => c.destroy() });
}

export { hex, COLORS };
