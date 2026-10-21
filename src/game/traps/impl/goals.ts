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

/** Looks exactly like the exit. It is not the exit. */
export class FakeGoalTrap extends Trap {
  private g!: Phaser.GameObjects.Graphics;

  protected arm(): void {
    const r = cellsRect(this.cells);
    this.g = this.ctx.scene.add.graphics().setDepth(4);
    drawGoal(this.g, { x: 0, y: -r.h + TILE, w: r.w + 22, h: r.h * 2 - 4 });
    this.g.setPosition(r.x - 9, r.y);
  }

  protected fire(): void {
    const scene = this.ctx.scene;
    this.ctx.sfx('boing');
    this.ctx.quip(FAKE_QUIPS[Math.floor(Math.random() * FAKE_QUIPS.length)], this.g.x + 26, this.g.y - 60);
    scene.tweens.add({
      targets: this.g,
      angle: 96,
      y: this.g.y + 16,
      duration: this.ctx.reduceMotion ? 60 : 380,
      ease: 'Bounce.easeOut',
      onComplete: () => this.complete(),
    });
  }

  protected restore(): void {
    const r = cellsRect(this.cells);
    this.ctx.scene.tweens.killTweensOf(this.g);
    this.g.setPosition(r.x - 9, r.y).setAngle(0).setAlpha(1);
  }

  protected teardown(): void {
    this.g.destroy();
  }
}

/** The exit that runs away. Hops through 'to' cells until it gives up. */
export class ShyGoalTrap extends Trap {
  private hops = 0;
  private maxHops = 2;
  private fleeing = false;

  protected arm(): void {
    this.maxHops = this.def.params?.hops ?? Math.min(3, this.toCells.length);
  }

  protected fire(): void {
    this.fleeing = true;
    this.hop();
  }

  private hop(): void {
    if (this.hops >= this.maxHops || this.hops >= this.toCells.length) {
      this.fleeing = false;
      this.ctx.quip('Fine. Take it.', this.parsed.goal.x + 20, this.parsed.goal.y - 30);
      this.complete();
      return;
    }
    const target = this.toCells[this.hops++];
    this.ctx.sfx('whoosh');
    this.ctx.moveGoal(target.x - 2, target.y - TILE + 2);
    this.state = 'armed'; // re-arm for the next approach
    this.pendingRearm();
  }

  private pendingRearm(): void {
    // proximity trigger re-evaluates next frame automatically
  }

  protected restore(): void {
    this.hops = 0;
    this.fleeing = false;
    const g = this.parsed.goal;
    this.ctx.moveGoal(g.x, g.y);
  }
}
