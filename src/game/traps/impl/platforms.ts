import Phaser from 'phaser';
import { Trap } from '../TrapBase';
import { drawTile, drawConveyorArrows } from './draw';
import { playerRect, overlap, cellsRect } from '../context';
import { TILE } from '../../core/config';
import { Rect } from '../../levels/types';

function spawnSolid(ctx: import('../context').TrapContext, r: Rect): Phaser.Physics.Arcade.Sprite {
  const b = ctx.solids.create(r.x + r.w / 2, r.y + r.h / 2, 'px') as Phaser.Physics.Arcade.Sprite;
  b.setDisplaySize(r.w, r.h);
  b.refreshBody();
  b.setVisible(false);
  return b;
}

/** Platform that slides toward a destination; optionally loops. Carries the player. */
export class MoverTrap extends Trap {
  private plat!: Phaser.Physics.Arcade.Sprite;
  private gfx!: Phaser.GameObjects.Graphics;
  private home!: { x: number; y: number };
  private dest!: { x: number; y: number };
  private moving = false;
  private forward = true;
  private lastX = 0;
  private lastY = 0;
  private r!: Rect;

  protected arm(): void {
    this.r = cellsRect(this.cells);
    this.home = { x: this.r.x, y: this.r.y };
    const d = this.toCells.length ? cellsRect(this.toCells) : { x: this.r.x + TILE * 4, y: this.r.y };
    this.dest = { x: d.x, y: d.y };
    this.gfx = this.ctx.scene.add.graphics().setDepth(4);
    drawTile(this.gfx, { x: 0, y: 0, w: this.r.w, h: this.r.h }, this.ctx.theme, this.def.params?.tell ?? 'none');
    // little "it moves" rivets
    this.gfx.fillStyle(0x000000, 0.18);
    this.gfx.fillCircle(this.r.w / 2 - 8, this.r.h / 2, 2);
    this.gfx.fillCircle(this.r.w / 2 + 8, this.r.h / 2, 2);
    this.gfx.setPosition(this.r.x, this.r.y);
    this.plat = this.ctx.scene.physics.add.sprite(this.r.x + this.r.w / 2, this.r.y + this.r.h / 2, 'px');
    this.plat.setDisplaySize(this.r.w, this.r.h).setVisible(false);
    const body = this.plat.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
    this.ctx.dynamics.add(this.plat);
    this.lastX = this.r.x;
    this.lastY = this.r.y;
  }

  protected fire(): void {
    this.moving = true;
  }

  protected onUpdate(dtMs: number): void {
    if (!this.moving) return;
    const body = this.plat.body as Phaser.Physics.Arcade.Body;
    const speed = this.def.params?.speed ?? 90;
    const target = this.forward ? this.dest : this.home;
    const dx = target.x - this.gfx.x;
    const dy = target.y - this.gfx.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 2) {
      if (this.def.params?.cycle) {
        this.forward = !this.forward;
      } else {
        this.moving = false;
        this.complete();
        return;
      }
    } else {
      const step = Math.min(dist, (speed * dtMs) / 1000);
      this.gfx.x += (dx / dist) * step;
      this.gfx.y += (dy / dist) * step;
    }
    body.reset(this.gfx.x + this.r.w / 2, this.gfx.y + this.r.h / 2);

    // carry the player
    const ddx = this.gfx.x - this.lastX;
    const ddy = this.gfx.y - this.lastY;
    this.lastX = this.gfx.x;
    this.lastY = this.gfx.y;
    const pr = playerRect(this.ctx.player);
    const standing =
      Math.abs(pr.y + pr.h - this.gfx.y) < 8 &&
      pr.x + pr.w > this.gfx.x + 2 &&
      pr.x < this.gfx.x + this.r.w - 2 &&
      this.ctx.player.grounded;
    if (standing) {
      this.ctx.player.x += ddx;
      if (ddy < 0) this.ctx.player.y += ddy;
    }
  }

  protected restore(): void {
    this.moving = false;
    this.forward = true;
    this.gfx.setPosition(this.home.x, this.home.y);
    (this.plat.body as Phaser.Physics.Arcade.Body).reset(this.home.x + this.r.w / 2, this.home.y + this.r.h / 2);
    this.lastX = this.home.x;
    this.lastY = this.home.y;
  }

  protected teardown(): void {
    this.gfx.destroy();
    this.plat.destroy();
  }
}

/** Static floor with a carry force. */
export class ConveyorTrap extends Trap {
  private bodies: Phaser.Physics.Arcade.Sprite[] = [];
  private gfx!: Phaser.GameObjects.Graphics;
  private r!: Rect;
  private phase = 0;

  protected arm(): void {
    this.r = cellsRect(this.cells);
    this.gfx = this.ctx.scene.add.graphics().setDepth(3.5);
    this.bodies.push(spawnSolid(this.ctx, this.r));
    this.state = 'done';
  }

  protected fire(): void {}

  protected onUpdate(dtMs: number): void {
    this.phase += dtMs * 0.06;
    this.gfx.clear();
    drawTile(this.gfx, { x: 0, y: 0, w: this.r.w, h: this.r.h }, this.ctx.theme, 'none');
    drawConveyorArrows(this.gfx, { x: 0, y: 0, w: this.r.w, h: 14 }, this.def.params?.dir ?? 1, this.phase, this.ctx.theme);
    this.gfx.setPosition(this.r.x, this.r.y);
    const pr = playerRect(this.ctx.player);
    const standing =
      Math.abs(pr.y + pr.h - this.r.y) < 8 &&
      pr.x + pr.w > this.r.x + 2 &&
      pr.x < this.r.x + this.r.w - 2 &&
      this.ctx.player.grounded;
    if (standing) {
      const speed = this.def.params?.speed ?? 60;
      this.ctx.player.x += (this.def.params?.dir ?? 1) * speed * (dtMs / 1000);
    }
  }

  protected restore(): void {}
  protected teardown(): void {
    this.gfx.destroy();
  }
}
