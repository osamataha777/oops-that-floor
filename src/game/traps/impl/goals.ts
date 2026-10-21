import Phaser from 'phaser';
import { Trap } from '../TrapBase';
import { drawGoal } from './draw';
import { cellsRect } from '../context';
import { TILE } from '../../core/config';

const FAKE_QUIPS = [
  "That's not a door.",
  'Painted on. Classic.',
  'The door lied.',
  'Nope. Decorative.',
  'You believed in it though.',
];

const FLEE_QUIPS = ['Eep!', 'Nope nope nope', 'Not today!', 'Too close!'];

/** Looks exactly like the exit. It is not the exit. */
export class FakeGoalTrap extends Trap {
  private g!: Phaser.GameObjects.Graphics;
  private home = { x: 0, y: 0 };
  private quipN = 0;

  protected arm(): void {
    const r = cellsRect(this.cells);
    this.g = this.ctx.scene.add.graphics().setDepth(4);
    // Drawn around a bottom-centre pivot so the flop rotates like a falling plank.
    const w = TILE + 22;
    const h = TILE * 2 - 4;
    drawGoal(this.g, { x: -w / 2, y: -h, w, h }, this.ctx.theme);
    this.home = { x: r.x + 2 + w / 2, y: r.y + r.h - 2 };
    this.g.setPosition(this.home.x, this.home.y);
  }

  protected fire(): void {
    const scene = this.ctx.scene;
    this.ctx.feedback('trap.boing');
    this.ctx.quip(FAKE_QUIPS[this.quipN++ % FAKE_QUIPS.length], this.home.x, this.home.y - 80);
    const ms = this.ctx.reduceMotion ? 60 : 420;
    scene.tweens.killTweensOf(this.g);
    scene.tweens.add({ targets: this.g, angle: 96, duration: ms, ease: 'Bounce.easeOut' });
    // completion (which can chain other traps) runs on the sim clock
    this.after(ms, () => this.complete());
  }

  protected restore(): void {
    this.ctx.scene.tweens.killTweensOf(this.g);
    this.g.setPosition(this.home.x, this.home.y).setAngle(0).setAlpha(1);
  }

  protected teardown(): void {
    this.ctx.scene.tweens.killTweensOf(this.g);
    this.g.destroy();
  }
}

/**
 * The exit that runs away. Hops through the `to` cells (in reading order)
 * until it runs out of courage. Proximity is measured from where the door is
 * NOW, with a short cooldown after each hop, so the chase is a real chase
 * instead of two teleports in consecutive frames.
 */
export class ShyGoalTrap extends Trap {
  private hops = 0;
  private maxHops = 2;
  private cooldownUntil = 0;

  protected arm(): void {
    this.maxHops = Math.min(this.def.params?.hops ?? 3, this.toCells.length);
  }

  protected proximityAnchor(): { x: number; y: number } | null {
    const g = this.ctx.goalRect();
    return { x: g.x + g.w / 2, y: g.y + g.h / 2 };
  }

  protected fire(): void {
    if (this.elapsed < this.cooldownUntil) {
      this.rearm();
      return;
    }
    if (this.hops >= this.maxHops) {
      const g = this.ctx.goalRect();
      this.ctx.quip('Fine. Take it.', g.x + g.w / 2, g.y - 30);
      this.ctx.feedback('goal.caught');
      this.complete();
      return;
    }
    const target = this.toCells[this.hops++];
    const g = this.ctx.goalRect();
    this.ctx.feedback('goal.flee');
    this.ctx.quip(FLEE_QUIPS[(this.hops - 1) % FLEE_QUIPS.length], g.x + g.w / 2, g.y - 24);
    this.ctx.moveGoal(target.x + 2, target.y - TILE + 2);
    this.cooldownUntil = this.elapsed + 450;
    this.rearm(); // the next approach can scare it again
  }

  protected onUpdate(): void {
    // Hold the trigger closed during the cooldown so a player standing on the
    // landing spot doesn't make the door teleport twice in one breath.
    if (this.state === 'triggered' && this.elapsed < this.cooldownUntil) this.rearm();
  }

  get hopsTaken(): number {
    return this.hops;
  }

  protected restore(): void {
    this.hops = 0;
    this.cooldownUntil = 0;
    const g = this.parsed.goal;
    this.ctx.moveGoal(g.x, g.y, true);
  }
}
