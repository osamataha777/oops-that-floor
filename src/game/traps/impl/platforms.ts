import Phaser from 'phaser';
import { Trap } from '../TrapBase';
import { drawTile, drawConveyorArrows, drawMover } from './draw';
import { playerRect, cellsRect } from '../context';
import { spawnSolid } from './floors';
import { TILE } from '../../core/config';
import { Rect } from '../../levels/types';

/** True when the player's feet rest on top of `r` (respects gravity flips). */
function standingOn(ctx: import('../context').TrapContext, r: Rect): boolean {
  const pr = playerRect(ctx.player);
  if (!ctx.player.grounded) return false;
  const overX = pr.x + pr.w > r.x + 2 && pr.x < r.x + r.w - 2;
  if (!overX) return false;
  return ctx.player.gSign === 1 ? Math.abs(pr.y + pr.h - r.y) < 8 : Math.abs(pr.y - (r.y + r.h)) < 8;
}

/** Platform that slides toward a destination; optionally loops. Carries the player. */
export class MoverTrap extends Trap {
  private plat!: Phaser.Physics.Arcade.Sprite;
  private gfx!: Phaser.GameObjects.Graphics;
  private home!: { x: number; y: number };
  private dest!: { x: number; y: number };
  private pos = { x: 0, y: 0 };
  private moving = false;
  private forward = true;
  private pauseLeft = 0;
  private r!: Rect;

  protected arm(): void {
    this.r = cellsRect(this.cells);
    this.home = { x: this.r.x, y: this.r.y };
    const d = this.toCells.length ? cellsRect(this.toCells) : { x: this.r.x + TILE * 4, y: this.r.y };
    this.dest = { x: d.x, y: d.y };
    this.gfx = this.ctx.scene.add.graphics().setDepth(4);
    drawMover(this.gfx, this.r.w, this.r.h, this.ctx.theme);
    this.pos = { ...this.home };
    this.gfx.setPosition(this.r.x, this.r.y);
    this.plat = this.ctx.scene.physics.add.sprite(this.r.x + this.r.w / 2, this.r.y + this.r.h / 2, 'px');
    this.plat.setDisplaySize(this.r.w, this.r.h).setVisible(false);
    const body = this.plat.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
    this.ctx.dynamics.add(this.plat);
  }

  protected fire(): void {
    this.moving = true;
    this.ctx.feedback('trap.whoosh');
  }

  protected onUpdate(dtMs: number): void {
    if (!this.moving) return;
    if (this.pauseLeft > 0) {
      this.pauseLeft -= dtMs;
      return;
    }
    const speed = this.def.params?.speed ?? 90;
    const target = this.forward ? this.dest : this.home;
    const dx = target.x - this.pos.x;
    const dy = target.y - this.pos.y;
    const dist = Math.hypot(dx, dy);
    const wasOn = standingOn(this.ctx, { ...this.r, x: this.pos.x, y: this.pos.y });
    let mx = 0;
    let my = 0;
    if (dist < 0.5) {
      if (this.def.params?.cycle) {
        this.forward = !this.forward;
        this.pauseLeft = this.def.params?.hold ?? 250; // a beat at each end reads as intent
      } else {
        this.moving = false;
        this.complete();
      }
      return;
    }
    const step = Math.min(dist, (speed * dtMs) / 1000);
    mx = (dx / dist) * step;
    my = (dy / dist) * step;
    this.pos.x += mx;
    this.pos.y += my;
    this.gfx.setPosition(this.pos.x, this.pos.y);
    (this.plat.body as Phaser.Physics.Arcade.Body).reset(this.pos.x + this.r.w / 2, this.pos.y + this.r.h / 2);
    // Carry the rider by the exact platform delta (both axes) so descending
    // platforms don't make Pip hop/land every frame.
    if (wasOn) {
      this.ctx.player.x += mx;
      this.ctx.player.y += my;
      (this.ctx.player.body as Phaser.Physics.Arcade.Body).updateFromGameObject();
    }
  }

  protected restore(): void {
    this.moving = false;
    this.forward = true;
    this.pauseLeft = 0;
    this.pos = { ...this.home };
    this.gfx.setPosition(this.home.x, this.home.y);
    (this.plat.body as Phaser.Physics.Arcade.Body).reset(this.home.x + this.r.w / 2, this.home.y + this.r.h / 2);
  }

  protected teardown(): void {
    this.gfx.destroy();
    this.plat.destroy();
  }
}

/** Static floor with a carry force. */
export class ConveyorTrap extends Trap {
  private bodies: Phaser.Physics.Arcade.Sprite[] = [];
  private base!: Phaser.GameObjects.Graphics;
  private arrows!: Phaser.GameObjects.Graphics;
  private r!: Rect;
  private phase = 0;

  protected arm(): void {
    this.r = cellsRect(this.cells);
    this.base = this.ctx.scene.add.graphics().setDepth(3.4);
    drawTile(this.base, { x: 0, y: 0, w: this.r.w, h: this.r.h }, this.ctx.theme, 'none', this.ctx.edgesAt(this.r), this.r);
    this.base.setPosition(this.r.x, this.r.y);
    this.arrows = this.ctx.scene.add.graphics().setDepth(3.5).setPosition(this.r.x, this.r.y);
    this.bodies.push(spawnSolid(this.ctx, this.r));
    this.drawArrows();
  }

  private drawArrows(): void {
    this.arrows.clear();
    drawConveyorArrows(this.arrows, { x: 0, y: 0, w: this.r.w, h: 14 }, this.def.params?.dir ?? 1, this.phase, this.ctx.theme);
  }

  protected fire(): void {}

  protected onUpdate(dtMs: number): void {
    const dir = this.def.params?.dir ?? 1;
    const speed = this.def.params?.speed ?? 60;
    this.phase = (this.phase + dir * speed * (dtMs / 1000) + 26 * 1000) % 26;
    this.drawArrows();
    if (standingOn(this.ctx, this.r)) {
      this.ctx.player.x += dir * speed * (dtMs / 1000);
    }
  }

  protected restore(): void {
    this.phase = 0;
    this.drawArrows();
  }

  protected teardown(): void {
    this.base.destroy();
    this.arrows.destroy();
  }
}
