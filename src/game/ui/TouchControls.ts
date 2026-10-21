import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../core/config';
import { SettingsData } from '../../services/save';
import { safeAreaInsets } from '../../platform/native';

export interface InputState {
  dir: -1 | 0 | 1;
  jumpDown: boolean;
  jumpHeld: boolean;
}

/**
 * Three-zone multitouch controls: ◀ ▶ on the left, JUMP on the right.
 * Keyboard (arrows/WASD/space) merges into the same InputState.
 * Hidden entirely when no touch capability exists.
 */
export class InputManager {
  left = false;
  right = false;
  jumpHeld = false;
  private jumpEdge = false;
  private leftKeys!: { l1: Phaser.Input.Keyboard.Key; l2: Phaser.Input.Keyboard.Key; r1: Phaser.Input.Keyboard.Key; r2: Phaser.Input.Keyboard.Key; j1: Phaser.Input.Keyboard.Key; j2: Phaser.Input.Keyboard.Key; j3: Phaser.Input.Keyboard.Key };

  constructor(private scene: Phaser.Scene) {
    const kb = scene.input.keyboard!;
    this.leftKeys = {
      l1: kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      l2: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      r1: kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      r2: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      j1: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      j2: kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      j3: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
    };
    kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE); // prevent scroll default handled by browser
  }

  pressLeft(v: boolean): void { this.left = v; }
  pressRight(v: boolean): void { this.right = v; }
  pressJump(v: boolean): void {
    if (v && !this.jumpHeld) this.jumpEdge = true;
    this.jumpHeld = v;
  }

  poll(): InputState {
    const k = this.leftKeys;
    const left = this.left || k.l1.isDown || k.l2.isDown;
    const right = this.right || k.r1.isDown || k.r2.isDown;
    const held = this.jumpHeld || k.j1.isDown || k.j2.isDown || k.j3.isDown;
    if ((k.j1.isDown || k.j2.isDown || k.j3.isDown) && !this._kbJumpWas) this.jumpEdge = true;
    this._kbJumpWas = k.j1.isDown || k.j2.isDown || k.j3.isDown;
    const out: InputState = {
      dir: left && !right ? -1 : right && !left ? 1 : 0,
      jumpDown: this.jumpEdge,
      jumpHeld: held,
    };
    this.jumpEdge = false;
    return out;
  }

  private _kbJumpWas = false;

  clear(): void {
    this.left = this.right = this.jumpHeld = this.jumpEdge = false;
  }
}

/** On-screen buttons. Created only on touch-capable devices. */
export class TouchControls extends Phaser.GameObjects.Container {
  private im: InputManager;
  private zones: Phaser.GameObjects.Zone[] = [];
  private circles: Phaser.GameObjects.Graphics[] = [];

  constructor(scene: Phaser.Scene, im: InputManager, settings: SettingsData) {
    super(scene);
    this.im = im;
    this.setDepth(40);
    this.setScrollFactor(0);
    this.build(settings);
    scene.add.existing(this);
  }

  private build(settings: SettingsData): void {
    const s = settings.controlScale;
    const spread = settings.controlSpread;
    const insets = safeAreaInsets();
    const scaleRatio = this.scene.scale.height / GAME_HEIGHT;
    const padB = 66 + insets.bottom / Math.max(0.5, scaleRatio);
    const padL = 64 + insets.left / Math.max(0.5, scaleRatio);
    const padR = 64 + insets.right / Math.max(0.5, scaleRatio);
    const r = 46 * s;
    const gap = spread ? 120 * s : 84 * s;

    // Visual buttons sit inside generous invisible thumb zones — missing the
    // circle by 40px should never drop your input mid-jump.
    const leftX = padL + r;
    const rightX = padL + r * 2 + gap;
    const jumpX = GAME_WIDTH - padR - r * 1.2;
    const btnY = GAME_HEIGHT - padB;

    this.addZoneBtn(leftX, btnY, r, '◀', { x: 0, y: btnY - r * 2.2, w: leftX + gap * 0.55, h: GAME_HEIGHT }, (v) => this.im.pressLeft(v));
    this.addZoneBtn(rightX, btnY, r, '▶', { x: leftX + gap * 0.55, y: btnY - r * 2.2, w: rightX + gap * 0.8, h: GAME_HEIGHT }, (v) => this.im.pressRight(v));
    this.addZoneBtn(jumpX, btnY, r * 1.18, '▲', { x: GAME_WIDTH * 0.55, y: btnY - r * 2.6, w: GAME_WIDTH, h: GAME_HEIGHT }, (v) => this.im.pressJump(v));
  }

  private addZoneBtn(x: number, y: number, r: number, glyph: string, zone: { x: number; y: number; w: number; h: number }, on: (v: boolean) => void): void {
    const g = this.scene.add.graphics();
    const draw = (down: boolean) => {
      g.clear();
      g.fillStyle(0x3f372f, down ? 0.38 : 0.16);
      g.fillCircle(0, 0, r);
      g.lineStyle(3, 0x3f372f, down ? 0.7 : 0.35);
      g.strokeCircle(0, 0, r - 1.5);
      g.fillStyle(0x3f372f, down ? 0.9 : 0.55);
      const s = r * 0.5;
      g.beginPath();
      if (glyph === '◀') { g.moveTo(-s * 0.4, -s); g.lineTo(s * 0.6, 0); g.lineTo(-s * 0.4, s); }
      else if (glyph === '▶') { g.moveTo(s * 0.4, -s); g.lineTo(-s * 0.6, 0); g.lineTo(s * 0.4, s); }
      else { g.moveTo(-s, s * 0.45); g.lineTo(0, -s * 0.6); g.lineTo(s, s * 0.45); }
      g.closePath();
      g.fillPath();
    };
    draw(false);
    g.setPosition(x, y);
    const z = this.scene.add.zone((zone.x + zone.w) / 2, (zone.y + zone.h) / 2, zone.w - zone.x, zone.h - zone.y).setInteractive();
    z.setScrollFactor(0);
    z.on('pointerdown', () => { on(true); draw(true); });
    const off = () => { on(false); draw(false); };
    z.on('pointerup', off);
    z.on('pointerout', off);
    z.on('pointercancel', off);
    this.add([g, z]);
    this.zones.push(z);
    this.circles.push(g);
  }

  private addBtn(x: number, y: number, r: number, glyph: string, on: (v: boolean) => void): void {
    this.addZoneBtn(x, y, r, glyph, { x: x - r * 1.25, y: y - r * 1.25, w: x + r * 1.25, h: y + r * 1.25 }, on);
  }

  static shouldShow(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }
}
