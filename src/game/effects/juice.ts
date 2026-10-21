import Phaser from 'phaser';
import { COLORS } from '../core/config';
import { DeathCause } from '../traps/context';
import { Player } from '../entities/Player';

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

export type DeathAnim = 'pancake' | 'confetti' | 'shrink' | 'freeze' | 'poof';

export function playDeathAnim(
  scene: Phaser.Scene,
  player: Player,
  anim: DeathAnim,
  reduceMotion: boolean,
  onDone: () => void,
): number {
  const dur = reduceMotion ? 90 : 300;
  switch (anim) {
    case 'pancake':
      player.shocked();
      scene.tweens.add({
        targets: player,
        scaleY: 0.08,
        scaleX: 1.7,
        duration: dur,
        ease: 'Quad.easeIn',
        onComplete: () => onDone(),
      });
      break;
    case 'confetti': {
      player.setVisible(false);
      burst(scene, player.x, player.y, 16);
      scene.time.delayedCall(dur, onDone);
      break;
    }
    case 'shrink':
      player.shocked();
      scene.tweens.add({
        targets: player,
        scale: 0,
        angle: 260,
        duration: dur,
        ease: 'Back.easeIn',
        onComplete: () => onDone(),
      });
      break;
    case 'freeze':
      player.shocked();
      player.setTintFill(0xbfd4e6);
      scene.tweens.add({
        targets: player,
        alpha: 0,
        duration: dur + 80,
        onComplete: () => {
          player.clearTint();
          onDone();
        },
      });
      break;
    case 'poof':
    default: {
      player.setVisible(false);
      puff(scene, player.x, player.y);
      scene.time.delayedCall(dur, onDone);
      break;
    }
  }
  return dur;
}

export function randomDeathAnim(): DeathAnim {
  const all: DeathAnim[] = ['pancake', 'confetti', 'shrink', 'freeze', 'poof'];
  return all[Math.floor(Math.random() * all.length)];
}

/** Cause-aware gag selection — each way to fail gets a signature exit. */
export function deathAnimFor(cause: DeathCause): DeathAnim {
  switch (cause) {
    case 'crush':
    case 'squash':
      return 'pancake';
    case 'void':
    case 'fall':
      return 'poof';
    case 'spikes':
      return 'confetti';
    case 'hazard':
      return 'shrink';
    default:
      return 'freeze';
  }
}

/** Geometric confetti burst — pooled particles, zero texture memory. */
export function burst(scene: Phaser.Scene, x: number, y: number, n = 12): void {
  const colors = [0xf2a541, 0x58c472, 0x5aa8f2, 0xf25a68, 0xfffaf0];
  const p = scene.add.particles(x, y, 'squ', {
    speed: { min: 90, max: 260 },
    angle: { min: 0, max: 360 },
    gravityY: 500,
    lifespan: { min: 280, max: 520 },
    scale: { start: 1, end: 0 },
    tint: colors,
    emitting: false,
  });
  p.setDepth(30);
  p.explode(n);
  scene.time.delayedCall(650, () => p.destroy());
}

export function puff(scene: Phaser.Scene, x: number, y: number): void {
  const p = scene.add.particles(x, y, 'dot', {
    speed: { min: 40, max: 140 },
    angle: { min: 0, max: 360 },
    lifespan: { min: 220, max: 420 },
    scale: { start: 1.4, end: 0 },
    alpha: { start: 0.7, end: 0 },
    tint: 0xfffaf0,
    emitting: false,
  });
  p.setDepth(30);
  p.explode(10);
  scene.time.delayedCall(500, () => p.destroy());
}

export function victoryConfetti(scene: Phaser.Scene, x: number, y: number): void {
  burst(scene, x, y - 30, 24);
  scene.time.delayedCall(160, () => burst(scene, x + 40, y - 50, 12));
  scene.time.delayedCall(320, () => burst(scene, x - 40, y - 40, 12));
}

/** Floating sarcastic text. Non-blocking, fades fast. */
export function floatQuip(scene: Phaser.Scene, text: string, x: number, y: number): void {
  const t = scene.add
    .text(0, 0, text, {
      fontFamily: "ui-rounded, 'SF Pro Rounded', system-ui, sans-serif",
      fontSize: '19px',
      fontStyle: '800',
      color: '#3f372f',
      align: 'center',
      stroke: '#fffaf0',
      strokeThickness: 5,
    })
    .setOrigin(0.5)
    .setPosition(Phaser.Math.Clamp(x, 120, scene.scale.width - 120), Math.max(60, y))
    .setDepth(50)
    .setScale(0.7);
  scene.tweens.add({
    targets: t,
    scale: 1,
    y: t.y - 14,
    duration: 180,
    ease: 'Back.easeOut',
  });
  scene.tweens.add({
    targets: t,
    alpha: 0,
    delay: 900,
    duration: 260,
    onComplete: () => t.destroy(),
  });
}
