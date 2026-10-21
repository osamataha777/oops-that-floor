import Phaser from 'phaser';
import { DeathCause } from '../traps/context';
import { TEX, VIEW } from '../core/view';
import { FONT } from '../ui/theme';

export const DEATH_QUIPS: Record<DeathCause | 'generic', string[]> = {
  spikes: ['It had teeth.', 'Pointy. Who knew.', 'The floor grew fangs.', 'You found the sharp part.'],
  crush: ['Flat-packed.', 'Gravity 1, you 0.', 'Pancake achieved.', 'It came from above. Obviously.'],
  fall: ['The floor filed for divorce.', 'Down was an option?', 'Air is not a floor.', 'You trusted that?'],
  void: ['The floor filed for divorce.', 'Down was an option?', 'Air is not a floor.', 'You trusted that?'],
  hazard: ['That spins. Apparently.', 'Fans of pain.', 'It waved hello.'],
  squash: ['Personal space: violated.', 'The ceiling is clingy.'],
  generic: ['Interesting decision.', 'That looked safe.', 'The floor disagrees.', 'Again?', 'Nice try!', 'Almost legendary.', 'Bold strategy.'],
};

let lastQuips: number[] = [];

/** Pick a quip avoiding the last 3 shown. */
export function pickQuip(cause: DeathCause | 'generic'): string {
  const pool = [...(DEATH_QUIPS[cause as DeathCause] ?? []), ...DEATH_QUIPS.generic];
  let i = Math.floor(Math.random() * pool.length);
  let guard = 0;
  while (lastQuips.includes(i) && guard++ < 8) i = Math.floor(Math.random() * pool.length);
  lastQuips.push(i);
  if (lastQuips.length > 3) lastQuips.shift();
  return pool[i];
}

export type DeathAnim = 'pancake' | 'pop' | 'fall' | 'zap';

/** Cause-aware gag selection — each way to fail gets a signature exit. */
export function deathAnimFor(cause: DeathCause): DeathAnim {
  switch (cause) {
    case 'crush':
    case 'squash':
      return 'pancake';
    case 'void':
    case 'fall':
      return 'fall';
    case 'spikes':
      return 'pop';
    default:
      return 'zap';
  }
}

const CONFETTI = [0xf2a541, 0x58c472, 0x5aa8f2, 0xf25a68, 0xfffaf0];

/**
 * Per-scene particle pool: a handful of long-lived emitters that `explode`
 * at a point. No emitter is ever created per jump/landing/death, so long
 * sessions don't churn GameObjects. Destroyed with the scene.
 */
export class Fx {
  private dustE: Phaser.GameObjects.Particles.ParticleEmitter;
  private confE: Phaser.GameObjects.Particles.ParticleEmitter;
  private puffE: Phaser.GameObjects.Particles.ParticleEmitter;
  private chipE: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(private scene: Phaser.Scene, private reduced: () => boolean) {
    const k = 1 / TEX;
    this.dustE = scene.add.particles(0, 0, 'dot', {
      speed: { min: 20, max: 90 },
      angle: { min: 200, max: 340 },
      gravityY: 300,
      lifespan: { min: 180, max: 340 },
      scale: { start: 0.9 * k, end: 0 },
      alpha: { start: 0.55, end: 0 },
      tint: 0xfffaf0,
      emitting: false,
    }).setDepth(9);
    this.confE = scene.add.particles(0, 0, 'squ', {
      speed: { min: 90, max: 280 },
      angle: { min: 200, max: 340 },
      gravityY: 520,
      rotate: { min: 0, max: 360 },
      lifespan: { min: 380, max: 760 },
      scale: { start: 0.8 * k, end: 0.2 * k },
      tint: CONFETTI,
      emitting: false,
    }).setDepth(30);
    this.puffE = scene.add.particles(0, 0, 'dot', {
      speed: { min: 40, max: 150 },
      angle: { min: 0, max: 360 },
      lifespan: { min: 220, max: 420 },
      scale: { start: 1.5 * k, end: 0 },
      alpha: { start: 0.75, end: 0 },
      tint: 0xfffaf0,
      emitting: false,
    }).setDepth(30);
    this.chipE = scene.add.particles(0, 0, 'squ', {
      speed: { min: 60, max: 170 },
      angle: { min: 220, max: 320 },
      gravityY: 900,
      rotate: { min: 0, max: 360 },
      lifespan: { min: 300, max: 600 },
      scale: { start: 0.55 * k, end: 0.3 * k },
      emitting: false,
    }).setDepth(9);
  }

  /** Feet dust; `dir` biases the spray (skids throw dust backwards). */
  dust(x: number, y: number, n: number, gSign: 1 | -1 = 1): void {
    if (this.reduced()) return;
    this.dustE.setConfig;
    this.dustE.gravityY = 300 * gSign;
    this.dustE.explode(n, x, y);
  }

  confetti(x: number, y: number, n = 18): void {
    if (this.reduced()) n = Math.min(n, 6);
    this.confE.explode(n, x, y);
  }

  puff(x: number, y: number, n = 10): void {
    this.puffE.explode(this.reduced() ? 4 : n, x, y);
  }

  /** Debris chips in a material colour (crumbling floors, spike pops). */
  chips(x: number, y: number, color: number, n = 6): void {
    if (this.reduced()) return;
    this.chipE.setParticleTint(color);
    this.chipE.explode(n, x, y);
  }

  victory(x: number, y: number, big: boolean): void {
    this.confetti(x, y - 30, big ? 30 : 16);
    if (big && !this.reduced()) {
      this.scene.time.delayedCall(140, () => this.confetti(x + 40, y - 50, 14));
      this.scene.time.delayedCall(280, () => this.confetti(x - 40, y - 40, 14));
    }
  }
}

/** Floating sarcastic text. Non-blocking, fades fast. Stays on screen. */
export function floatQuip(scene: Phaser.Scene, text: string, x: number, y: number): void {
  const t = scene.add
    .text(0, 0, text, {
      fontFamily: FONT,
      fontSize: '19px',
      fontStyle: '800',
      color: '#3f372f',
      align: 'center',
      stroke: '#fffaf0',
      strokeThickness: 5,
    })
    .setOrigin(0.5)
    .setDepth(50)
    .setScale(0.7);
  const half = t.width / 2 + 8;
  t.setPosition(Phaser.Math.Clamp(x, half - VIEW.ox, 960 + VIEW.ox - half), Phaser.Math.Clamp(y, 70, 500));
  scene.tweens.add({ targets: t, scale: 1, y: t.y - 14, duration: 180, ease: 'Back.easeOut' });
  scene.tweens.add({ targets: t, alpha: 0, delay: 950, duration: 260, onComplete: () => t.destroy() });
}
