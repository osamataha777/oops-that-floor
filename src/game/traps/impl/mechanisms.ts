import Phaser from 'phaser';
import { Trap } from '../TrapBase';
import { drawPlate } from './draw';
import { playerRect, overlap, cellsRect, rectCenter } from '../context';
import { COLORS, TILE } from '../../core/config';

/** Pressure plate — emits `plate:<id>` on the bus for chained traps. */
export class PlateTrap extends Trap {
  private g!: Phaser.GameObjects.Graphics;
  private pressed = false;
  private released = true;

  protected arm(): void {
    const r = cellsRect(this.cells);
    this.g = this.ctx.scene.add.graphics().setDepth(4);
    drawPlate(this.g, { x: 0, y: 0, w: r.w, h: r.h }, false, this.ctx.theme);
    this.g.setPosition(r.x, r.y);
  }

  protected fire(): void {
    /* external fire → treat as press */
    this.press();
  }

  protected onUpdate(): void {
    const r = cellsRect(this.cells);
    const zone = { x: r.x, y: r.y - 4, w: r.w, h: r.h + 4 };
    const touching = overlap(zone, playerRect(this.ctx.player));
    if (touching && !this.pressed) {
      this.press();
    } else if (!touching && this.pressed && this.released === false) {
      /* stay latched */
    }
  }

  private press(): void {
    if (this.pressed) return;
    this.pressed = true;
    const r = cellsRect(this.cells);
    this.g.clear();
    drawPlate(this.g, { x: 0, y: 0, w: r.w, h: r.h }, true, this.ctx.theme);
    this.ctx.sfx('plate');
    this.ctx.haptic('light');
    this.ctx.bus.emit(`plate:${this.def.id}`);
    const hold = this.def.params?.hold ?? 0;
    if (hold > 0) {
      this.after(hold, () => {
        this.pressed = false;
        this.g.clear();
        drawPlate(this.g, { x: 0, y: 0, w: r.w, h: r.h }, false, this.ctx.theme);
        this.ctx.bus.emit(`plate:${this.def.id}:release`);
      });
    }
    this.complete();
  }

  protected restore(): void {
    this.pressed = false;
    const r = cellsRect(this.cells);
    this.g.clear();
    drawPlate(this.g, { x: 0, y: 0, w: r.w, h: r.h }, false, this.ctx.theme);
  }

  protected teardown(): void {
    this.g.destroy();
  }
}

/** Zone that flips gravity. Signposted in Ch3+; earlier it's the joke itself. */
export class GravFlipTrap extends Trap {
  private g!: Phaser.GameObjects.Graphics;
  private applied = false;

  protected arm(): void {
    const r = cellsRect(this.cells);
    this.g = this.ctx.scene.add.graphics().setDepth(2);
    this.g.fillStyle(this.ctx.theme.accent, 0.1);
    this.g.fillRoundedRect(r.x, r.y, r.w, r.h, 8);
    this.g.lineStyle(2, this.ctx.theme.accent, 0.3);
    this.g.strokeRoundedRect(r.x, r.y, r.w, r.h, 8);
    // arrows hinting "up"
    this.g.fillStyle(this.ctx.theme.accent, 0.4);
    const cx = r.x + r.w / 2;
    for (let i = 0; i < 3; i++) {
      const y = r.y + r.h - 14 - i * 14;
      this.g.fillTriangle(cx - 8, y, cx, y - 8, cx + 8, y);
    }
    this.g.setPosition(0, 0);
  }

  protected fire(): void {
    if (this.applied) return;
    this.applied = true;
    const world = this.ctx.scene.physics.world;
    world.gravity.y = -world.gravity.y || -1800;
    this.ctx.sfx('gravflip');
    this.ctx.haptic('medium');
    if (!this.ctx.reduceMotion) {
      this.ctx.scene.cameras.main.flash(140, 240, 240, 250);
      this.ctx.scene.tweens.add({ targets: this.ctx.scene.cameras.main, angle: 3, duration: 90, yoyo: true, repeat: 1 });
    }
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
    this.ctx.scene.physics.world.gravity.y = Math.abs(this.ctx.scene.physics.world.gravity.y);
    this.ctx.scene.cameras.main.setAngle(0);
  }

  protected teardown(): void {
    this.g.destroy();
    this.ctx.scene.physics.world.gravity.y = Math.abs(this.ctx.scene.physics.world.gravity.y);
  }
}

/** Rotating spiked arm — orbiting sensor bodies kill on touch. */
export class SpinnerTrap extends Trap {
  private armG!: Phaser.GameObjects.Graphics;
  private orbs: Phaser.Physics.Arcade.Sprite[] = [];
  private angleDeg = 0;
  private center!: { x: number; y: number };
  private len = 90;
  private spinning = false;

  protected arm(): void {
    this.center = rectCenter(cellsRect(this.cells));
    this.len = (this.def.params?.len ?? 3) * TILE;
    this.armG = this.ctx.scene.add.graphics().setDepth(4);
    for (let i = 0; i < 3; i++) {
      const o = this.ctx.scene.physics.add.sprite(this.center.x, this.center.y, 'px');
      o.setDisplaySize(16, 16).setVisible(false);
      const b = o.body as Phaser.Physics.Arcade.Body;
      b.setAllowGravity(false);
      b.setImmovable(true);
      b.setCircle(8);
      this.orbs.push(o);
    }
    this.drawArm();
  }

  private drawArm(): void {
    const g = this.armG;
    g.clear();
    g.fillStyle(0x000000, 0.15);
    g.fillCircle(0, 0, 8);
    const rad = Phaser.Math.DegToRad(this.angleDeg);
    const ex = Math.cos(rad) * this.len;
    const ey = Math.sin(rad) * this.len;
    g.lineStyle(7, 0x6b5e52, 1);
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(ex, ey);
    g.strokePath();
    g.fillStyle(COLORS.hazard, 1);
    for (const t of [0.4, 0.7, 1]) {
      const ox = ex * t;
      const oy = ey * t;
      g.fillCircle(ox, oy, 9);
      g.fillTriangle(ox - 12, oy, ox, oy - 14, ox + 12, oy);
    }
    g.fillStyle(0x3f372f, 1);
    g.fillCircle(0, 0, 5);
    g.setPosition(this.center.x, this.center.y);
  }

  protected fire(): void {
    this.spinning = true;
  }

  protected onUpdate(dtMs: number): void {
    if (!this.spinning) return;
    const speed = (this.def.params?.speed ?? 110) * (this.def.params?.dir ?? 1);
    this.angleDeg = (this.angleDeg + (speed * dtMs) / 1000) % 360;
    this.drawArm();
    const rad = Phaser.Math.DegToRad(this.angleDeg);
    const ts = [0.4, 0.7, 1];
    for (let i = 0; i < 3; i++) {
      const ox = this.center.x + Math.cos(rad) * this.len * ts[i];
      const oy = this.center.y + Math.sin(rad) * this.len * ts[i];
      (this.orbs[i].body as Phaser.Physics.Arcade.Body).reset(ox, oy);
    }
    const pr = playerRect(this.ctx.player);
    for (const o of this.orbs) {
      const b = o.body as Phaser.Physics.Arcade.Body;
      if (overlap({ x: b.x, y: b.y, w: b.width, h: b.height }, pr)) {
        this.ctx.kill('hazard');
        return;
      }
    }
  }

  protected restore(): void {
    this.angleDeg = 0;
    this.spinning = this.def.trigger.event === 'always';
    this.drawArm();
    (this.orbs[0].body as Phaser.Physics.Arcade.Body).reset(-200, -200);
    for (const o of this.orbs) (o.body as Phaser.Physics.Arcade.Body).reset(-200, -200);
  }

  protected teardown(): void {
    this.armG.destroy();
    for (const o of this.orbs) o.destroy();
  }
}
