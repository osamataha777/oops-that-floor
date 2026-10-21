import Phaser from 'phaser';
import { FONT, TXT, hex } from './theme';
import { COLORS } from '../core/config';

const R = 14; // corner radius for chips/panels

/** Flat rounded button with squash feedback. */
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
): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  const fill = opts.fill ?? 0x4a4038;
  g.fillStyle(fill, 1);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, R);
  g.fillStyle(0xffffff, opts.disabled ? 0.3 : 0.12);
  g.fillRoundedRect(-w / 2, -h / 2, w, h / 2, { tl: R, tr: R, bl: 0, br: 0 });
  const t = scene.add
    .text(0, 0, `${opts.icon ? opts.icon + '  ' : ''}${label}`, { ...TXT.light, fontSize: h > 44 ? '20px' : '16px' })
    .setOrigin(0.5);
  if (opts.disabled) t.setAlpha(0.45);
  c.add([g, t]);
  c.setSize(w, h);
  if (opts.depth) c.setDepth(opts.depth);
  if (!opts.disabled) {
    c.setInteractive({ useHandCursor: true });
    c.on('pointerdown', () => scene.tweens.add({ targets: c, scaleX: 0.94, scaleY: 0.94, duration: 60 }));
    c.on('pointerup', () => scene.tweens.add({ targets: c, scaleX: 1, scaleY: 1, duration: 90, ease: 'Back.easeOut' }));
    c.on('pointerout', () => c.setScale(1));
  }
  (c as Phaser.GameObjects.Container & { labelObj?: Phaser.GameObjects.Text }).labelObj = t;
  return c;
}

/** Pill-shaped HUD chip (level tag, death counter). */
export function makeChip(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  fill = 0x4a4038,
): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const t = scene.add.text(0, 0, text, TXT.chip).setOrigin(0.5);
  const w = Math.max(64, t.width + 26);
  const g = scene.add.graphics();
  g.fillStyle(fill, 0.92);
  g.fillRoundedRect(-w / 2, -15, w, 30, 15);
  c.add([g, t]);
  c.setSize(w, 30);
  (c as Phaser.GameObjects.Container & { labelObj?: Phaser.GameObjects.Text }).labelObj = t;
  return c;
}

export function panel(
  scene: Phaser.Scene,
  w: number,
  h: number,
  fill = 0xfffaf0,
  alpha = 1,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.16);
  g.fillRoundedRect(-w / 2 + 4, -h / 2 + 6, w, h, 22);
  g.fillStyle(fill, alpha);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, 22);
  return g;
}

/** Toggle switch row; returns container + setter. */
export function makeToggle(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  initial: boolean,
  onChange: (v: boolean) => void,
): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const t = scene.add.text(-170, 0, label, TXT.body).setOrigin(0, 0.5);
  const track = scene.add.graphics();
  const knob = scene.add.circle(0, 0, 13, 0xfffaf0).setStrokeStyle(2, 0x000000, 0.1);
  const draw = (on: boolean) => {
    track.clear();
    track.fillStyle(on ? 0x58c472 : 0xb9b0a1, 1);
    track.fillRoundedRect(96, -16, 64, 32, 16);
    knob.setX(on ? 146 : 110);
  };
  let on = initial;
  draw(on);
  const zone = scene.add.zone(128, 0, 80, 40).setInteractive({ useHandCursor: true });
  zone.on('pointerup', () => {
    on = !on;
    draw(on);
    onChange(on);
  });
  c.add([t, track, knob, zone]);
  return c;
}

/** Horizontal slider row; returns container. */
export function makeSlider(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  initial01: number,
  onChange: (v01: number) => void,
): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const t = scene.add.text(-170, 0, label, TXT.body).setOrigin(0, 0.5);
  const bx = 128;
  const bw = 130;
  const track = scene.add.graphics();
  track.fillStyle(0xd9d0c0, 1).fillRoundedRect(bx - bw / 2, -5, bw, 10, 5);
  const fillG = scene.add.graphics();
  const knob = scene.add.circle(bx, 0, 12, 0xfffaf0).setStrokeStyle(3, 0x4a4038);
  const set = (v01: number) => {
    v01 = Phaser.Math.Clamp(v01, 0, 1);
    fillG.clear().fillStyle(0x4a4038, 1).fillRoundedRect(bx - bw / 2, -5, bw * v01, 10, 5);
    knob.setX(bx - bw / 2 + bw * v01);
    return v01;
  };
  let v = set(initial01);
  const zone = scene.add.zone(bx, 0, bw + 40, 44).setInteractive({ useHandCursor: true });
  const drag = (p: Phaser.Input.Pointer) => {
    v = set((p.x - (c.x + bx - bw / 2) * c.scale) / (bw * c.scale));
    onChange(v);
  };
  zone.on('pointerdown', drag);
  zone.on('pointermove', (p: Phaser.Input.Pointer) => p.isDown && drag(p));
  c.add([t, track, fillG, knob, zone]);
  return c;
}

/** Dim the whole scene; tap-to-dismiss via callback if provided. */
export function dim(scene: Phaser.Scene, onTap?: () => void): Phaser.GameObjects.Rectangle {
  const { width, height } = scene.scale;
  const r = scene.add.rectangle(0, 0, width * 2, height * 2, 0x2b2418, 0.45).setOrigin(0);
  if (onTap) r.setInteractive().on('pointerup', onTap);
  return r;
}

export function tinyText(scene: Phaser.Scene, x: number, y: number, s: string, style = TXT.small): Phaser.GameObjects.Text {
  return scene.add.text(x, y, s, { ...style, fontFamily: FONT }).setOrigin(0.5);
}

export { hex, COLORS };
