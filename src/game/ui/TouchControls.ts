import Phaser from 'phaser';
import { GAME_HEIGHT } from '../core/config';
import { VIEW, logicalPointer } from '../core/view';
import { SettingsData } from '../../services/save';
import { safeAreaInsets } from '../../platform/native';

export interface InputState {
  dir: -1 | 0 | 1;
  jumpDown: boolean;
  jumpHeld: boolean;
}

/**
 * Merges touch (via TouchControls → press*) and keyboard into one InputState.
 * Held state always mirrors the physical controls; only the jump *edge* is
 * consumed by `poll()` or discarded by `clearEdges()`.
 */
export class InputManager {
  left = false;
  right = false;
  jumpHeld = false;
  private jumpEdge = false;
  private kbJumpWas = false;
  private keys: Record<'l1' | 'l2' | 'r1' | 'r2' | 'j1' | 'j2' | 'j3', Phaser.Input.Keyboard.Key> | null = null;
  /** Scripted override (deterministic replays). When set, devices are ignored. */
  scripted: InputState | null = null;

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard;
    if (kb) {
      const K = Phaser.Input.Keyboard.KeyCodes;
      this.keys = {
        l1: kb.addKey(K.LEFT), l2: kb.addKey(K.A),
        r1: kb.addKey(K.RIGHT), r2: kb.addKey(K.D),
        j1: kb.addKey(K.SPACE), j2: kb.addKey(K.UP), j3: kb.addKey(K.W),
      };
    }
  }

  pressLeft(v: boolean): void { this.left = v; }
  pressRight(v: boolean): void { this.right = v; }
  pressJump(v: boolean): void {
    if (v && !this.jumpHeld) this.jumpEdge = true;
    this.jumpHeld = v;
  }

  poll(): InputState {
    if (this.scripted) {
      const s = this.scripted;
      this.scripted = { ...s, jumpDown: false };
      return s;
    }
    const k = this.keys;
    const kbJump = !!k && (k.j1.isDown || k.j2.isDown || k.j3.isDown);
    const left = this.left || (!!k && (k.l1.isDown || k.l2.isDown));
    const right = this.right || (!!k && (k.r1.isDown || k.r2.isDown));
    if (kbJump && !this.kbJumpWas) this.jumpEdge = true;
    this.kbJumpWas = kbJump;
    const out: InputState = {
      dir: left && !right ? -1 : right && !left ? 1 : 0,
      jumpDown: this.jumpEdge,
      jumpHeld: this.jumpHeld || kbJump,
    };
    this.jumpEdge = false;
    return out;
  }

  /**
   * Drop pending edges (respawn, resume). Held directions survive on purpose:
   * a thumb still on ▶ after a death keeps running — no re-press needed.
   */
  clearEdges(): void {
    this.jumpEdge = false;
  }

  /** Forget everything (scene shutdown, controls disabled). */
  releaseAll(): void {
    this.left = this.right = this.jumpHeld = this.jumpEdge = false;
  }
}

type Control = 'L' | 'R' | 'J';
interface Area { control: Control; x0: number; y0: number; x1: number; y1: number }

/**
 * On-screen buttons over generous invisible thumb zones, in view space
 * (scroll-factor 0). Multi-pointer: each pointer owns exactly one control; a
 * second finger can jump while the first holds a direction, and sliding
 * between ◀/▶ hands the direction over. A pointer keeps its control when it
 * slides out of every zone and only releases on up / cancel / up-outside.
 */
export class TouchControls extends Phaser.GameObjects.Container {
  private im: InputManager;
  private held = new Map<number, Control>(); // pointerId → control
  private counts: Record<Control, number> = { L: 0, R: 0, J: 0 };
  private buttons: { control: Control; draw: (down: boolean) => void }[] = [];
  private areas: Area[] = [];
  private enabled = true;
  private opacity = 0.7;
  /** Button centres in view space (tests + layout preview read these). */
  readonly centers: Partial<Record<Control, { x: number; y: number; r: number }>> = {};

  constructor(scene: Phaser.Scene, im: InputManager, settings: SettingsData) {
    super(scene);
    this.im = im;
    this.opacity = settings.controlOpacity ?? 0.7;
    this.setDepth(40);
    this.build(settings);
    this.setScrollFactor(0, 0, true);
    scene.add.existing(this);
    const i = scene.input;
    i.on('pointerdown', this.onDown, this);
    i.on('pointermove', this.onMove, this);
    i.on('pointerup', this.onUp, this);
    i.on('pointerupoutside', this.onUp, this);
    i.on('pointercancel', this.onUp, this);
    scene.game.events.on(Phaser.Core.Events.BLUR, this.releaseAll, this);
    scene.game.events.on(Phaser.Core.Events.HIDDEN, this.releaseAll, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardownInput());
  }

  private teardownInput(): void {
    const i = this.scene.input;
    i.off('pointerdown', this.onDown, this);
    i.off('pointermove', this.onMove, this);
    i.off('pointerup', this.onUp, this);
    i.off('pointerupoutside', this.onUp, this);
    i.off('pointercancel', this.onUp, this);
    this.scene.game.events.off(Phaser.Core.Events.BLUR, this.releaseAll, this);
    this.scene.game.events.off(Phaser.Core.Events.HIDDEN, this.releaseAll, this);
    this.held.clear();
    this.im.releaseAll();
  }

  /** Overlays/pauses disable the pads: everything held is released. */
  setEnabled(on: boolean): void {
    if (on === this.enabled) return;
    this.enabled = on;
    if (!on) this.releaseAll();
    this.setAlpha(on ? 1 : 0.35);
  }

  releaseAll(): void {
    this.held.clear();
    this.counts = { L: 0, R: 0, J: 0 };
    this.sync();
  }

  /** Route a pointer to whichever control rect contains it. */
  private route(p: Phaser.Input.Pointer): Control | null {
    const { x, y } = logicalPointer(p);
    for (const a of this.areas) {
      if (x >= a.x0 && x <= a.x1 && y >= a.y0 && y <= a.y1) return a.control;
    }
    return null;
  }

  private onDown(p: Phaser.Input.Pointer, over?: Phaser.GameObjects.GameObject[]): void {
    if (!this.enabled || this.held.has(p.id)) return;
    // A tap that lands on a real button (pause) belongs to that button.
    if (over && over.length > 0) return;
    const c = this.route(p);
    if (!c) return;
    this.held.set(p.id, c);
    this.counts[c]++;
    this.sync();
  }

  private onMove(p: Phaser.Input.Pointer): void {
    const owned = this.held.get(p.id);
    if (owned === undefined) return;
    if (!p.isDown) return this.onUp(p);
    const c = this.route(p);
    // Hand-off only between the two directions; jump never steals a
    // direction finger (and vice versa) — that caused accidental jumps.
    if (c && c !== owned && owned !== 'J' && c !== 'J') {
      this.counts[owned]--;
      this.held.set(p.id, c);
      this.counts[c]++;
      this.sync();
    }
  }

  private onUp(p: Phaser.Input.Pointer): void {
    const owned = this.held.get(p.id);
    if (owned === undefined) return;
    this.held.delete(p.id);
    this.counts[owned] = Math.max(0, this.counts[owned] - 1);
    this.sync();
  }

  private sync(): void {
    this.im.pressLeft(this.counts.L > 0);
    this.im.pressRight(this.counts.R > 0);
    this.im.pressJump(this.counts.J > 0);
    for (const b of this.buttons) b.draw(this.counts[b.control] > 0);
  }

  /** Diagnostics for tests. */
  get heldCount(): number {
    return this.held.size;
  }

  private build(settings: SettingsData): void {
    const s = settings.controlScale;
    const spread = settings.controlSpread;
    const insets = safeAreaInsets();
    // CSS px → logical px
    const cssPerLogical = window.innerHeight / GAME_HEIGHT;
    const toL = (css: number) => css / Math.max(0.5, cssPerLogical);
    const W = VIEW.w;
    const H = GAME_HEIGHT;
    const r = 44 * s;
    const padB = 30 + toL(insets.bottom);
    const padL = 26 + toL(insets.left);
    const padR = 26 + toL(insets.right);
    const gap = (spread ? 46 : 22) * s;

    const leftX = padL + r;
    const rightX = leftX + r * 2 + gap;
    const jumpR = r * 1.2;
    const jumpX = W - padR - jumpR;
    const btnY = H - padB - r;

    const split = (leftX + rightX) / 2;
    const top = H * 0.38;
    this.areas = [
      { control: 'L', x0: 0, y0: top, x1: split, y1: H },
      { control: 'R', x0: split, y0: top, x1: rightX + r * 1.7, y1: H },
      { control: 'J', x0: Math.max(W * 0.56, jumpX - jumpR * 2.4), y0: H * 0.3, x1: W, y1: H },
    ];

    this.addBtn(leftX, btnY, r, 'L');
    this.addBtn(rightX, btnY, r, 'R');
    this.addBtn(jumpX, btnY, jumpR, 'J');
  }

  private addBtn(x: number, y: number, r: number, control: Control): void {
    const g = this.scene.add.graphics();
    const a = this.opacity;
    const draw = (down: boolean) => {
      g.clear();
      // soft drop shadow + rim keep the pads readable on any background
      g.fillStyle(0x000000, 0.12 * a);
      g.fillCircle(0, 3, r);
      g.fillStyle(0xfffaf0, (down ? 0.55 : 0.28) * a);
      g.fillCircle(0, 0, r);
      g.lineStyle(3, 0x2c2622, (down ? 0.75 : 0.4) * a);
      g.strokeCircle(0, 0, r - 1.5);
      g.fillStyle(0x2c2622, (down ? 0.95 : 0.65) * a);
      const s = r * 0.42;
      g.beginPath();
      if (control === 'L') { g.moveTo(s * 0.55, -s); g.lineTo(-s * 0.75, 0); g.lineTo(s * 0.55, s); }
      else if (control === 'R') { g.moveTo(-s * 0.55, -s); g.lineTo(s * 0.75, 0); g.lineTo(-s * 0.55, s); }
      else { g.moveTo(-s, s * 0.5); g.lineTo(0, -s * 0.7); g.lineTo(s, s * 0.5); }
      g.closePath();
      g.fillPath();
      g.setScale(down ? 0.94 : 1);
    };
    draw(false);
    g.setPosition(x, y);
    this.add(g);
    this.buttons.push({ control, draw });
    this.centers[control] = { x, y, r };
  }

  static shouldShow(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  }
}
