import Phaser from 'phaser';
import { TEX } from '../core/view';
import { PIP } from './pipArt';
import { MOTION } from '../anim/motion';

export type Expression =
  | 'neutral' | 'run' | 'jump' | 'fall' | 'shock' | 'suspicious' | 'curious'
  | 'happy' | 'dizzy' | 'nervous' | 'determined' | 'defeated' | 'smug';

interface Face {
  eye: 'pip-eye' | 'pip-eye-happy' | 'pip-eye-x';
  eyeScale: number;
  eyeSquint: number; // 1 open … 0.4 squint
  pupilScale: number;
  pupilY: number;
  mouth: string;
  brows: 'none' | 'angry' | 'worried' | 'raise' | 'skeptic';
  sweat: boolean;
}

const FACES: Record<Expression, Face> = {
  neutral: { eye: 'pip-eye', eyeScale: 1, eyeSquint: 1, pupilScale: 1, pupilY: 0.4, mouth: 'pip-m-smile', brows: 'none', sweat: false },
  run: { eye: 'pip-eye', eyeScale: 1, eyeSquint: 0.92, pupilScale: 1, pupilY: 0.2, mouth: 'pip-m-open', brows: 'none', sweat: false },
  jump: { eye: 'pip-eye', eyeScale: 1.06, eyeSquint: 1, pupilScale: 1, pupilY: -1.4, mouth: 'pip-m-o', brows: 'raise', sweat: false },
  fall: { eye: 'pip-eye', eyeScale: 1.14, eyeSquint: 1, pupilScale: 0.9, pupilY: 1.2, mouth: 'pip-m-o', brows: 'worried', sweat: false },
  shock: { eye: 'pip-eye', eyeScale: 1.3, eyeSquint: 1, pupilScale: 0.62, pupilY: 0, mouth: 'pip-m-big', brows: 'worried', sweat: true },
  suspicious: { eye: 'pip-eye', eyeScale: 1, eyeSquint: 0.48, pupilScale: 1.05, pupilY: 0.6, mouth: 'pip-m-flat', brows: 'skeptic', sweat: false },
  curious: { eye: 'pip-eye', eyeScale: 1.1, eyeSquint: 1, pupilScale: 1.1, pupilY: 0, mouth: 'pip-m-o', brows: 'raise', sweat: false },
  happy: { eye: 'pip-eye-happy', eyeScale: 1, eyeSquint: 1, pupilScale: 0, pupilY: 0, mouth: 'pip-m-grin', brows: 'none', sweat: false },
  dizzy: { eye: 'pip-eye-x', eyeScale: 1, eyeSquint: 1, pupilScale: 0, pupilY: 0, mouth: 'pip-m-wobble', brows: 'none', sweat: false },
  nervous: { eye: 'pip-eye', eyeScale: 1.05, eyeSquint: 0.9, pupilScale: 0.8, pupilY: 0.6, mouth: 'pip-m-wobble', brows: 'worried', sweat: true },
  determined: { eye: 'pip-eye', eyeScale: 1, eyeSquint: 0.7, pupilScale: 1, pupilY: 0.2, mouth: 'pip-m-flat', brows: 'angry', sweat: false },
  defeated: { eye: 'pip-eye-happy', eyeScale: 1, eyeSquint: 1, pupilScale: 0, pupilY: 0, mouth: 'pip-m-frown', brows: 'worried', sweat: false },
  smug: { eye: 'pip-eye', eyeScale: 1, eyeSquint: 0.6, pupilScale: 1, pupilY: 0.4, mouth: 'pip-m-grin', brows: 'raise', sweat: false },
};

/** Per-frame physical state the view animates from. */
export interface PipSim {
  /** Feet point in world space (gravity-relative "down" edge of the hitbox). */
  x: number;
  y: number;
  vx: number;
  vy: number;
  grounded: boolean;
  gSign: 1 | -1;
  facing: 1 | -1;
  inputDir: -1 | 0 | 1;
  maxSpeed: number;
}

/** Critically-damped-ish spring used for all secondary motion. */
class Spring {
  v = 0;
  constructor(public x: number, private k: number, private d: number) {}
  step(target: number, dt: number): number {
    const a = (target - this.x) * this.k - this.v * this.d;
    this.v += a * dt;
    this.x += this.v * dt;
    return this.x;
  }
  kick(v: number): void {
    this.v += v;
  }
  set(x: number): void {
    this.x = x;
    this.v = 0;
  }
}

type Mode = 'alive' | 'dead' | 'celebrate' | 'puppet';

/**
 * Pip's visual rig — completely decoupled from the physics hitbox.
 * All locomotion animation is procedural (springs + phase clocks evaluated
 * in `update`), so nothing can fight a tween. Tweens are used only in the
 * one-shot modes (death, celebration), and `revive()` kills them all.
 */
export class PipView {
  readonly root: Phaser.GameObjects.Container;
  private rig: Phaser.GameObjects.Container;
  private face: Phaser.GameObjects.Container;
  private parts: Record<string, Phaser.GameObjects.Image> = {};
  private shadow: Phaser.GameObjects.Image;
  private scene: Phaser.Scene;
  private mode: Mode = 'alive';

  private squash = new Spring(1, 520, 22);
  private lean = new Spring(0, 260, 20);
  private faceX = new Spring(0, 420, 26);
  private sproutA = new Spring(0, 180, 9);
  private handLift = new Spring(0, 300, 18);
  private gazeX = new Spring(0, 200, 20);
  private gazeY = new Spring(0, 200, 20);
  private runPhase = 0;
  private breathe = 0;
  private idleMs = 0;
  private blinkIn = 2400;
  private blinkLeft = 0;
  private exprOverride: { e: Expression; until: number } | null = null;
  private current: Expression = 'neutral';
  private lookTarget: { x: number; y: number } | null = null;
  private lastVx = 0;
  private reduceMotion = false;
  private clock = 0;
  private stars: Phaser.GameObjects.Image[] = [];
  /** Tweens on proxy objects (not killable via killTweensOf on our parts). */
  private owned: Phaser.Tweens.Tween[] = [];
  private pendingDone: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene, depth = 10) {
    this.scene = scene;
    this.shadow = scene.add.image(0, 0, 'shadow').setTint(0x000000).setAlpha(0.18).setScale(0.9 / TEX, 1 / TEX).setDepth(depth - 1);
    this.root = scene.add.container(0, 0).setDepth(depth);
    this.rig = scene.add.container(0, 0);
    this.face = scene.add.container(0, 0);
    this.root.add(this.rig);

    const L = PIP.layout;
    const img = (key: string, tex: string, at: { x: number; y: number }, parent: Phaser.GameObjects.Container) => {
      const part = PIP.parts[tex];
      const im = scene.add.image(at.x, at.y, tex).setScale(1 / TEX).setOrigin(part.ox / part.w, part.oy / part.h);
      parent.add(im);
      this.parts[key] = im;
      return im;
    };
    // back-to-front
    img('sprout', 'pip-sprout', L.sprout, this.rig);
    img('handL', 'pip-hand', L.handL, this.rig);
    img('handR', 'pip-hand', L.handR, this.rig);
    img('body', 'pip-body', L.body, this.rig);
    img('belly', 'pip-belly', L.belly, this.rig);
    this.rig.add(this.face);
    img('cheekL', 'pip-cheek', L.cheekL, this.face);
    img('cheekR', 'pip-cheek', L.cheekR, this.face);
    img('eyeL', 'pip-eye', L.eyeL, this.face);
    img('eyeR', 'pip-eye', L.eyeR, this.face);
    img('pupilL', 'pip-pupil', L.eyeL, this.face);
    img('pupilR', 'pip-pupil', L.eyeR, this.face);
    img('browL', 'pip-brow', L.browL, this.face);
    img('browR', 'pip-brow', L.browR, this.face);
    img('mouth', 'pip-m-smile', L.mouth, this.face);
    img('sweat', 'pip-sweat', L.sweat, this.face).setVisible(false);
    // feet in front of the body so they read during the run cycle
    img('footL', 'pip-foot', L.footL, this.rig);
    img('footR', 'pip-foot', L.footR, this.rig);
    this.applyFace('neutral');
  }

  setReduceMotion(v: boolean): void {
    this.reduceMotion = v;
  }

  setDepth(d: number): this {
    this.root.setDepth(d);
    this.shadow.setDepth(d - 1);
    return this;
  }

  setVisible(v: boolean): this {
    this.root.setVisible(v);
    this.shadow.setVisible(v);
    return this;
  }

  get x(): number {
    return this.root.x;
  }
  get y(): number {
    return this.root.y;
  }

  /** Show a temporary expression (ms). Later calls replace earlier ones. */
  express(e: Expression, ms = 700): void {
    this.exprOverride = { e, until: this.clock + ms };
  }

  /** Point of interest Pip's eyes track (null = look where you're going). */
  lookAt(p: { x: number; y: number } | null): void {
    this.lookTarget = p;
  }

  // ---- one-shot reactions (called by Player events) -------------------------

  onJump(): void {
    if (this.reduceMotion) return;
    this.squash.set(0.78);
    this.squash.kick(4);
    this.sproutA.kick(140);
    this.handLift.kick(14);
  }

  /** `impact` 0..1 — how hard the landing was. */
  onLand(impact: number): void {
    if (this.reduceMotion) return;
    this.squash.set(1 + 0.32 * impact);
    this.squash.kick(-2);
    this.sproutA.kick(-120 * impact);
    this.handLift.kick(-10 * impact);
  }

  onTurn(): void {
    if (this.reduceMotion) return;
    this.sproutA.kick(90);
  }

  onSkid(): void {
    if (this.reduceMotion) return;
    this.lean.kick(-30);
  }

  // ---- per-frame -------------------------------------------------------------

  update(dtMs: number, s: PipSim): void {
    const dt = Math.min(0.05, dtMs / 1000);
    this.clock += dtMs;
    // Shadow sits on the ground under Pip (only meaningful while grounded / low).
    this.shadow.setPosition(s.x, s.y + (s.gSign === 1 ? 0 : 0)).setVisible(this.root.visible && s.grounded);
    if (this.mode === 'dead' || this.mode === 'puppet') return;
    this.root.setPosition(s.x, s.y);
    this.root.setScale(1, s.gSign);
    if (this.mode === 'celebrate') return;

    const speed01 = Math.min(1, Math.abs(s.vx) / s.maxSpeed);
    const rising = s.vy * s.gSign < -40;
    const falling = s.vy * s.gSign > 140;

    // --- expression selection
    let e: Expression = 'neutral';
    if (!s.grounded) e = rising ? 'jump' : falling ? 'fall' : 'jump';
    else if (speed01 > 0.25) e = 'run';
    if (this.exprOverride && this.clock < this.exprOverride.until) e = this.exprOverride.e;
    else this.exprOverride = null;
    if (e !== this.current) this.applyFace(e);

    // --- squash & stretch: airborne stretch follows vertical speed
    const airStretch = s.grounded ? 1 : 1 + Phaser.Math.Clamp(-s.vy * s.gSign / 2600, -0.1, 0.18);
    const breath = s.grounded && speed01 < 0.1 && !this.reduceMotion ? Math.sin((this.breathe += dt * 2.6)) * 0.022 : 0;
    const sq = this.squash.step(airStretch + breath, dt);
    this.rig.setScale(1 + (1 - sq) * 0.85, sq);

    // --- lean into motion; skid leans back when reversing at speed
    const accel = (s.vx - this.lastVx) / Math.max(0.001, dt);
    this.lastVx = s.vx;
    const leanTarget = this.reduceMotion ? 0 : Phaser.Math.Clamp(s.vx / s.maxSpeed, -1, 1) * 9 + (s.grounded ? 0 : s.facing * 3);
    const lean = this.lean.step(leanTarget, dt);
    this.rig.setAngle(lean * s.gSign);

    // --- face slides toward facing (cheap 3/4 turn)
    const fx = this.faceX.step(s.facing * 2.2, dt);
    this.face.x = fx;

    // --- run cycle: feet stride + body bob, phase advances with distance
    const L = PIP.layout;
    const fl = this.parts.footL;
    const fr = this.parts.footR;
    if (s.grounded && speed01 > 0.05) {
      this.runPhase += Math.abs(s.vx) * dt * 0.075;
      const a = Math.sin(this.runPhase) * 4.2 * Math.min(1, speed01 * 1.6);
      fl.setPosition(L.footL.x + a * s.facing, L.footL.y - Math.max(0, Math.cos(this.runPhase)) * 2.4);
      fr.setPosition(L.footR.x - a * s.facing, L.footR.y - Math.max(0, -Math.cos(this.runPhase)) * 2.4);
      this.rig.y = -Math.abs(Math.sin(this.runPhase)) * 1.6 * speed01;
      this.idleMs = 0;
    } else if (!s.grounded) {
      // tuck when rising, flail-dangle when falling
      const flail = falling && !this.reduceMotion ? Math.sin(this.clock * 0.04) * 1.6 : 0;
      fl.setPosition(L.footL.x + 1.5, L.footL.y - (rising ? 3.2 : 0.5) + flail);
      fr.setPosition(L.footR.x - 1.5, L.footR.y - (rising ? 2.2 : 0.5) - flail);
      this.rig.y = 0;
      this.idleMs = 0;
    } else {
      fl.setPosition(L.footL.x, L.footL.y);
      fr.setPosition(L.footR.x, L.footR.y);
      this.rig.y = 0;
      this.idleMs += dtMs;
    }

    // --- hands: swing opposite to feet while running, up when airborne
    const hl = this.parts.handL;
    const hr = this.parts.handR;
    const lift = this.handLift.step(!s.grounded ? (falling ? 9 : 5) : 0, dt);
    const swing = s.grounded && speed01 > 0.05 ? Math.sin(this.runPhase) * 2.4 : 0;
    hl.setPosition(L.handL.x - swing * s.facing * 0.4, L.handL.y - lift - swing * 0.3);
    hr.setPosition(L.handR.x + swing * s.facing * 0.4, L.handR.y - lift + swing * 0.3);

    // --- sprout: lags behind acceleration and vertical motion
    const sproutTarget = this.reduceMotion ? 0 : Phaser.Math.Clamp(-accel / 120, -28, 28) + Phaser.Math.Clamp(s.vy * s.gSign / 30, -22, 22) * 0.6;
    this.parts.sprout.setAngle(this.sproutA.step(sproutTarget, dt));

    // --- eyes: blink + gaze
    this.blinkIn -= dtMs;
    if (this.blinkIn <= 0 && this.blinkLeft <= 0) {
      this.blinkLeft = 110;
      this.blinkIn = 1800 + ((this.clock * 7919) % 2600);
    }
    let blink = 1;
    if (this.blinkLeft > 0) {
      this.blinkLeft -= dtMs;
      blink = 0.12;
    }
    const face = FACES[this.current];
    // idle personality: after a while Pip glances around
    let gx = s.facing * 1;
    let gy = 0;
    if (this.lookTarget) {
      const dx = this.lookTarget.x - s.x;
      const dy = (this.lookTarget.y - (s.y - 22 * s.gSign)) * s.gSign;
      const d = Math.max(1, Math.hypot(dx, dy));
      gx = (dx / d) * 1.7 - fx * 0.3;
      gy = (dy / d) * 1.5;
    } else if (this.idleMs > 2600 && !this.reduceMotion) {
      const t = (this.idleMs - 2600) / 1000;
      gx = Math.sin(t * 1.3) > 0.2 ? 1.8 : Math.sin(t * 1.3) < -0.2 ? -1.8 : 0;
      gy = Math.sin(t * 0.7) * 0.6;
    }
    const pgx = this.gazeX.step(gx, dt);
    const pgy = this.gazeY.step(gy, dt);
    for (const side of ['L', 'R'] as const) {
      const eye = this.parts[`eye${side}`];
      const pupil = this.parts[`pupil${side}`];
      eye.setScale((face.eyeScale) / TEX, (face.eyeScale * face.eyeSquint * (face.eye === 'pip-eye' ? blink : 1)) / TEX);
      const base = L[`eye${side}`];
      pupil.setPosition(base.x + pgx, base.y + face.pupilY + pgy * face.eyeSquint);
      pupil.setVisible(face.pupilScale > 0 && blink > 0.5);
      pupil.setScale((face.pupilScale) / TEX, (face.pupilScale * Math.min(1, face.eyeSquint + 0.3)) / TEX);
    }
  }

  private applyFace(e: Expression): void {
    this.current = e;
    const f = FACES[e];
    const p = this.parts;
    p.eyeL.setTexture(f.eye);
    p.eyeR.setTexture(f.eye);
    const eyePart = PIP.parts[f.eye];
    p.eyeL.setOrigin(eyePart.ox / eyePart.w, eyePart.oy / eyePart.h);
    p.eyeR.setOrigin(eyePart.ox / eyePart.w, eyePart.oy / eyePart.h);
    p.mouth.setTexture(f.mouth);
    p.sweat.setVisible(f.sweat);
    const L = PIP.layout;
    const brows = f.brows;
    p.browL.setVisible(brows !== 'none');
    p.browR.setVisible(brows !== 'none');
    const set = (b: Phaser.GameObjects.Image, base: { x: number; y: number }, angle: number, dy: number) =>
      b.setPosition(base.x, base.y + dy).setAngle(angle);
    switch (brows) {
      case 'angry': set(p.browL, L.browL, 18, 1.4); set(p.browR, L.browR, -18, 1.4); break;
      case 'worried': set(p.browL, L.browL, -16, 0); set(p.browR, L.browR, 16, 0); break;
      case 'raise': set(p.browL, L.browL, -6, -1.6); set(p.browR, L.browR, 6, -1.6); break;
      case 'skeptic': set(p.browL, L.browL, 14, 1.6); set(p.browR, L.browR, 4, -2); break;
      default: break;
    }
  }

  // ---- one-shot modes ----------------------------------------------------------

  private killTweens(): void {
    for (const t of this.owned) t.stop();
    this.owned = [];
    this.pendingDone?.remove(false);
    this.pendingDone = null;
    this.scene.tweens.killTweensOf([this.root, this.rig, ...Object.values(this.parts), ...this.stars]);
  }

  /** Cause-specific death gag. Calls `onDone` when it's safe to respawn. */
  playDeath(kind: 'pancake' | 'pop' | 'fall' | 'zap', onDone: () => void): number {
    this.killTweens();
    this.mode = 'dead';
    this.applyFace('shock');
    const rm = this.reduceMotion;
    const dur = rm ? 90 : MOTION.death.ms;
    const done = () => {
      this.pendingDone = null;
      onDone();
    };
    const later = (ms: number) => (this.pendingDone = this.scene.time.delayedCall(ms, done));
    switch (kind) {
      case 'pancake':
        this.scene.tweens.add({ targets: this.rig, scaleY: 0.12, scaleX: 1.8, duration: dur * 0.5, ease: 'Quad.easeIn' });
        later(dur);
        break;
      case 'pop':
        // a beat of comic "uh-oh" hang, then poof
        this.scene.tweens.add({ targets: this.rig, scaleX: 1.25, scaleY: 1.25, duration: dur * 0.45, ease: 'Back.easeOut', onComplete: () => this.root.setVisible(false) });
        later(dur);
        break;
      case 'fall':
        this.scene.tweens.add({ targets: this.root, angle: 200, alpha: 0, duration: dur, ease: 'Quad.easeIn' });
        later(dur);
        break;
      case 'zap':
      default:
        this.scene.tweens.add({ targets: this.rig, scale: 0, angle: 260, duration: dur, ease: 'Back.easeIn' });
        later(dur);
        break;
    }
    return dur;
  }

  /** Back to life at the current position: pop-in + a dizzy beat. */
  revive(dizzy = true): void {
    this.killTweens();
    for (const s of this.stars) s.destroy();
    this.stars = [];
    this.mode = 'alive';
    this.root.setVisible(true).setAlpha(1).setAngle(0);
    this.rig.setScale(1).setAngle(0).setPosition(0, 0);
    this.squash.set(1);
    this.lean.set(0);
    this.sproutA.set(0);
    this.handLift.set(0);
    this.exprOverride = null;
    this.idleMs = 0;
    this.applyFace('neutral');
    if (this.reduceMotion) return;
    this.rig.setScale(0.3, 1.6);
    this.squash.set(1.4);
    this.scene.tweens.add({ targets: this.rig, scaleX: 1, duration: MOTION.respawn.ms, ease: MOTION.respawn.ease });
    if (dizzy) {
      this.express('dizzy', 520);
      for (let i = 0; i < 3; i++) {
        const st = this.scene.add.image(0, -40, 'star').setScale(0.7 / TEX).setTint(0xffd166);
        this.root.add(st);
        this.stars.push(st);
        const a0 = (i / 3) * Math.PI * 2;
        const o = { a: a0 };
        this.owned.push(this.scene.tweens.add({
          targets: o,
          a: a0 + Math.PI * 2,
          duration: 520,
          onUpdate: () => st.setPosition(Math.cos(o.a) * 11, -38 + Math.sin(o.a) * 3),
          onComplete: () => st.destroy(),
        }));
        this.scene.tweens.add({ targets: st, alpha: 0, delay: 360, duration: 160 });
      }
    }
  }

  /** Victory pose. `big` for hard-won clears (more deaths → bigger celebration). */
  celebrate(big: boolean): void {
    this.killTweens();
    this.mode = 'celebrate';
    this.applyFace(big ? 'happy' : 'smug');
    if (this.reduceMotion) return;
    const hop = big ? 22 : 12;
    this.scene.tweens.add({ targets: this.rig, y: -hop, duration: 200, ease: 'Quad.easeOut', yoyo: true, repeat: big ? 2 : 0, hold: 40 });
    this.scene.tweens.add({ targets: [this.parts.handL, this.parts.handR], y: '-=12', duration: 140, ease: 'Back.easeOut' });
    if (big) this.scene.tweens.add({ targets: this.rig, angle: { from: -8, to: 8 }, duration: 160, yoyo: true, repeat: 3 });
  }

  /** Free-posed use (menu mascot). The caller drives root position. */
  puppet(e: Expression = 'neutral'): void {
    this.mode = 'puppet';
    this.applyFace(e);
  }

  get rigContainer(): Phaser.GameObjects.Container {
    return this.rig;
  }

  setFace(e: Expression): void {
    this.applyFace(e);
  }

  destroy(): void {
    this.killTweens();
    this.root.destroy();
    this.shadow.destroy();
  }
}
