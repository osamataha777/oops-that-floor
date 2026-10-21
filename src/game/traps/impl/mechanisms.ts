import Phaser from 'phaser';
import { Trap } from '../TrapBase';
import { drawPlate, drawSpinner, drawSpring, drawGravZone } from './draw';
import { playerRect, overlap, cellsRect, rectCenter } from '../context';
import { TILE } from '../../core/config';
import { Rect } from '../../levels/types';

/** Pressure plate — emits `plate:<id>` on the bus for chained traps. */
export class PlateTrap extends Trap {
  private g!: Phaser.GameObjects.Graphics;
  private pressed = false;
  private r!: Rect;

  protected arm(): void {
    this.r = cellsRect(this.cells);
    this.g = this.ctx.scene.add.graphics().setDepth(4);
    drawPlate(this.g, { x: 0, y: 0, w: this.r.w, h: this.r.h }, false, this.ctx.theme);
    this.g.setPosition(this.r.x, this.r.y);
  }

  protected fire(): void {
    /* external fire → treat as press */
    this.press();
  }

  protected onUpdate(): void {
    if (this.pressed) return;
    const zone = { x: this.r.x, y: this.r.y - 4, w: this.r.w, h: this.r.h + 4 };
    if (overlap(zone, playerRect(this.ctx.player))) this.press();
  }

  private press(): void {
    if (this.pressed) return;
    this.pressed = true;
    this.g.clear();
    drawPlate(this.g, { x: 0, y: 0, w: this.r.w, h: this.r.h }, true, this.ctx.theme);
    this.ctx.feedback('trap.plate');
    this.ctx.bus.emit(`plate:${this.def.id}`);
    const hold = this.def.params?.hold ?? 0;
    if (hold > 0) {
      this.after(hold, () => {
        this.pressed = false;
        this.g.clear();
        drawPlate(this.g, { x: 0, y: 0, w: this.r.w, h: this.r.h }, false, this.ctx.theme);
        this.ctx.bus.emit(`plate:${this.def.id}:release`);
      });
    }
    this.complete();
  }

  protected restore(): void {
    this.pressed = false;
    this.g.clear();
    drawPlate(this.g, { x: 0, y: 0, w: this.r.w, h: this.r.h }, false, this.ctx.theme);
  }

  protected teardown(): void {
    this.g.destroy();
  }
}

/** Zone that flips gravity. Signposted with drifting chevrons. */
export class GravFlipTrap extends Trap {
  private g!: Phaser.GameObjects.Graphics;
  private chev!: Phaser.GameObjects.Graphics;
  private applied = false;
  private r!: Rect;

  protected arm(): void {
    this.r = cellsRect(this.cells);
    this.g = this.ctx.scene.add.graphics().setDepth(2);
    drawGravZone(this.g, this.r, this.ctx.theme, 0);
    this.chev = this.ctx.scene.add.graphics().setDepth(2.1);
  }

  /** Chevrons drift in the direction the zone will send you. */
  protected onUpdate(): void {
    if (this.ctx.reduceMotion) return;
    const t = (this.elapsed / 700) % 1;
    this.chev.clear();
    drawGravZone(this.chev, this.r, this.ctx.theme, t, true, this.ctx.player.gSign === 1 ? -1 : 1);
  }

  protected fire(): void {
    if (this.applied) return;
    this.applied = true;
    const world = this.ctx.scene.physics.world;
    world.gravity.y = -world.gravity.y || -1800;
    this.ctx.feedback('trap.gravflip');
    if (!this.ctx.reduceMotion) this.ctx.scene.cameras.main.flash(120, 240, 240, 250);
    const dur = this.def.params?.duration ?? 0;
    if (dur > 0) {
      this.after(dur, () => {
        world.gravity.y = Math.abs(world.gravity.y);
      });
    }
    this.complete();
  }

  protected restore(): void {
    this.applied = false;
    const world = this.ctx.scene.physics.world;
    world.gravity.y = Math.abs(world.gravity.y);
  }

  protected teardown(): void {
    this.g.destroy();
    this.chev.destroy();
    // The Arcade world is already torn down during scene shutdown.
    const world = this.ctx.scene.physics?.world;
    if (world) world.gravity.y = Math.abs(world.gravity.y);
  }
}

/** Rotating spiked arm — drawn once, rotated per frame; kill test is analytic. */
export class SpinnerTrap extends Trap {
  private armG!: Phaser.GameObjects.Graphics;
  private hubG!: Phaser.GameObjects.Graphics;
  private angleDeg = 0;
  private center!: { x: number; y: number };
  private len = 90;
  private spinning = false;

  protected arm(): void {
    this.center = rectCenter(cellsRect(this.cells));
    this.len = (this.def.params?.len ?? 3) * TILE;
    this.angleDeg = this.def.params?.phase ?? 0;
    this.armG = this.ctx.scene.add.graphics().setDepth(4);
    drawSpinner(this.armG, this.len, this.ctx.theme);
    this.armG.setPosition(this.center.x, this.center.y).setAngle(this.angleDeg);
    this.hubG = this.ctx.scene.add.graphics().setDepth(4.1);
    this.hubG.fillStyle(0x2f2a26, 1).fillCircle(0, 0, 7).fillStyle(0xfffaf0, 0.5).fillCircle(-2, -2, 2);
    this.hubG.setPosition(this.center.x, this.center.y);
  }

  protected fire(): void {
    this.spinning = true;
  }

  protected onUpdate(dtMs: number): void {
    if (this.spinning) {
      const speed = (this.def.params?.speed ?? 110) * (this.def.params?.dir ?? 1);
      this.angleDeg = (this.angleDeg + (speed * dtMs) / 1000) % 360;
      this.armG.setAngle(this.angleDeg);
    }
    // Orb hit circles at 40/70/100% of the arm (radius 9 + a forgiving 1px).
    const rad = Phaser.Math.DegToRad(this.angleDeg);
    const pr = playerRect(this.ctx.player);
    for (const t of [0.4, 0.7, 1]) {
      const ox = this.center.x + Math.cos(rad) * this.len * t;
      const oy = this.center.y + Math.sin(rad) * this.len * t;
      const nx = Phaser.Math.Clamp(ox, pr.x, pr.x + pr.w);
      const ny = Phaser.Math.Clamp(oy, pr.y, pr.y + pr.h);
      if ((ox - nx) ** 2 + (oy - ny) ** 2 < 8 * 8) {
        this.ctx.kill('hazard');
        return;
      }
    }
  }

  protected restore(): void {
    this.angleDeg = this.def.params?.phase ?? 0;
    this.spinning = false;
    this.armG.setAngle(this.angleDeg);
  }

  protected teardown(): void {
    this.armG.destroy();
    this.hubG.destroy();
  }
}

/**
 * Bounce pad. Land on it (or walk over it) and you're launched — with
 * `params.speed` as the launch velocity. A friendly mechanic… mostly.
 */
export class SpringTrap extends Trap {
  private g!: Phaser.GameObjects.Graphics;
  private r!: Rect;
  private coil = 0;
  private cooldown = 0;

  protected arm(): void {
    this.r = cellsRect(this.cells);
    this.g = this.ctx.scene.add.graphics().setDepth(4);
    this.g.setPosition(this.r.x, this.r.y);
    drawSpring(this.g, this.r.w, this.r.h, 0, this.ctx.theme);
  }

  protected fire(): void {}

  protected onUpdate(dtMs: number): void {
    this.cooldown = Math.max(0, this.cooldown - dtMs);
    if (this.coil > 0) {
      this.coil = Math.max(0, this.coil - dtMs / 180);
      this.g.clear();
      drawSpring(this.g, this.r.w, this.r.h, this.coil, this.ctx.theme);
    }
    if (this.cooldown > 0) return;
    const pr = playerRect(this.ctx.player);
    const body = this.ctx.player.body as Phaser.Physics.Arcade.Body;
    const pad = { x: this.r.x + 2, y: this.r.y + this.r.h - 14, w: this.r.w - 4, h: 8 };
    const falling = body.velocity.y * this.ctx.player.gSign >= -10;
    if (falling && overlap(pad, pr)) {
      const v = this.def.params?.speed ?? 980;
      this.ctx.player.launch(-v * this.ctx.player.gSign);
      this.coil = 1;
      this.cooldown = 160;
      this.ctx.feedback('trap.spring');
    }
  }

  protected restore(): void {
    this.coil = 0;
    this.cooldown = 0;
    this.g.clear();
    drawSpring(this.g, this.r.w, this.r.h, 0, this.ctx.theme);
  }

  protected teardown(): void {
    this.g.destroy();
  }
}
