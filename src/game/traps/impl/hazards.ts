import Phaser from 'phaser';
import { Trap } from '../TrapBase';
import { drawSpikeStrip, drawTile } from './draw';
import { playerRect, overlap, cellsRect, rectCenter } from '../context';
import { TILE, COLORS } from '../../core/config';
import { Rect } from '../../levels/types';

/** Spikes that hide inside a floor block and pop out on the trigger. */
export class HiddenSpikesTrap extends Trap {
  private items: { tile: Phaser.GameObjects.Graphics; g: Phaser.GameObjects.Graphics; zone: Rect; cell: Rect; out: boolean; body: Phaser.Physics.Arcade.Sprite }[] = [];
  private periodic = false;
  private cycleT = 0;

  protected arm(): void {
    this.periodic = (this.def.params?.period ?? 0) > 0;
    for (const cell of this.cells) {
      // the block it hides in looks (and is) solid
      const tile = this.ctx.scene.add.graphics().setDepth(3);
      drawTile(tile, { x: 0, y: 0, w: cell.w, h: cell.h }, this.ctx.theme, this.def.params?.tell === 'crack' ? 'crack' : 'none');
      tile.setPosition(cell.x, cell.y);
      const body = this.ctx.solids.create(cell.x + cell.w / 2, cell.y + cell.h / 2, 'px') as Phaser.Physics.Arcade.Sprite;
      body.setDisplaySize(cell.w, cell.h);
      body.refreshBody();
      body.setVisible(false);
      const g = this.ctx.scene.add.graphics().setDepth(4);
      drawSpikeStrip(g, { x: 0, y: 0, w: cell.w, h: 14 });
      g.setPosition(cell.x, cell.y + 20).setAlpha(0); // sunken inside the block
      const zone: Rect = { x: cell.x + 3, y: cell.y - 14, w: cell.w - 6, h: 15 };
      this.items.push({ tile, g, zone, cell, out: false, body });
    }
  }

  protected fire(): void {
    this.pop(true);
    if (!this.periodic) this.complete();
  }

  private pop(out: boolean): void {
    for (const it of this.items) {
      const targetY = out ? it.cell.y - 13 : it.cell.y + 20;
      this.ctx.scene.tweens.add({ targets: it.g, y: targetY, alpha: out ? 1 : 0, duration: this.ctx.reduceMotion ? 40 : 110, ease: 'Back.easeOut' });
      this.after(this.ctx.reduceMotion ? 40 : 110, () => (it.out = out));
    }
    if (out) {
      this.ctx.sfx('pop');
      this.ctx.haptic('light');
    }
  }

  protected onUpdate(dtMs: number): void {
    if (this.periodic && this.state === 'active') {
      this.cycleT += dtMs;
      const period = this.def.params!.period!;
      const hold = this.def.params?.hold ?? period * 0.45;
      const phase = this.def.params?.phase ?? 0;
      const shouldBeOut = (this.cycleT + phase) % period < hold;
      if (shouldBeOut !== this.items[0]?.out) this.pop(shouldBeOut);
    }
    const pr = playerRect(this.ctx.player);
    for (const it of this.items) {
      if (it.out && overlap(it.zone, pr)) {
        this.ctx.kill('spikes');
        return;
      }
    }
  }

  protected restore(): void {
    this.cycleT = 0;
    for (const it of this.items) {
      this.ctx.scene.tweens.killTweensOf(it.g);
      it.g.setPosition(it.cell.x, it.cell.y + 20).setAlpha(0);
      it.out = false;
      if (!this.ctx.solids.contains(it.body)) {
        it.body = this.ctx.solids.create(it.cell.x + it.cell.w / 2, it.cell.y + it.cell.h / 2, 'px') as Phaser.Physics.Arcade.Sprite;
        it.body.setDisplaySize(it.cell.w, it.cell.h);
        it.body.refreshBody();
        it.body.setVisible(false);
      } else {
        (it.body.body as Phaser.Physics.Arcade.StaticBody).enable = true;
      }
    }
  }

  protected teardown(): void {
    for (const it of this.items) {
      it.g.destroy();
      it.tile.destroy();
    }
  }
}

/** Block that drops from above when the player crosses under it; then rests as ground. */
export class FallBlockTrap extends Trap {
  private block!: Phaser.Physics.Arcade.Sprite;
  private gfx!: Phaser.GameObjects.Graphics;
  private landed = false;
  private home!: { x: number; y: number };
  private fallT = 0;

  protected arm(): void {
    const r = cellsRect(this.cells);
    this.home = { x: r.x, y: r.y };
    this.gfx = this.ctx.scene.add.graphics().setDepth(4);
    drawTile(this.gfx, { x: 0, y: 0, w: r.w, h: r.h }, this.ctx.theme, 'none');
    this.block = this.ctx.scene.physics.add.sprite(r.x + r.w / 2, r.y + r.h / 2, 'px');
    this.block.setDisplaySize(r.w, r.h);
    this.block.setVisible(false);
    const body = this.block.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
    this.ctx.dynamics.add(this.block);
    this.gfx.setPosition(r.x, r.y);
  }

  protected fire(): void {
    this.fallT = 0;
    const body = this.block.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(true);
    body.setImmovable(false);
    this.ctx.sfx('whoosh');
  }

  protected onUpdate(dtMs: number): void {
    const body = this.block.body as Phaser.Physics.Arcade.Body;
    this.gfx.setPosition(this.block.x - this.block.displayWidth / 2, this.block.y - this.block.displayHeight / 2);
    if (this.state !== 'active') return;
    this.fallT += dtMs;
    if (!this.landed && body.velocity.y > 60) {
      const pr = playerRect(this.ctx.player);
      const hitbox = { x: this.block.x - this.block.displayWidth / 2 + 2, y: this.block.y - this.block.displayHeight / 2 + 2, w: this.block.displayWidth - 4, h: this.block.displayHeight - 2 };
      if (overlap(hitbox, pr)) {
        this.ctx.kill('crush');
        return;
      }
    }
    if (!this.landed && this.fallT > 250 && (body.blocked.down || body.touching.down || Math.abs(body.velocity.y) < 8)) {
      this.landed = true;
      body.setVelocity(0, 0);
      body.setAllowGravity(false);
      body.setImmovable(true);
      this.ctx.sfx('land');
      if (!this.ctx.reduceMotion) this.ctx.scene.cameras.main.shake(90, 0.004);
      this.complete();
    }
  }

  protected restore(): void {
    const body = this.block.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    body.setAllowGravity(false);
    body.setImmovable(true);
    body.reset(this.home.x + this.block.displayWidth / 2, this.home.y + this.block.displayHeight / 2);
    this.landed = false;
    this.fallT = 0;
    this.gfx.setPosition(this.home.x, this.home.y);
  }

  protected teardown(): void {
    this.gfx.destroy();
    this.block.destroy();
  }
}

/** A wall that rises out of the floor — or (dir:-1) starts raised and sinks open like a door. */
export class WallTrap extends Trap {
  private block!: Phaser.Physics.Arcade.Sprite;
  private gfx!: Phaser.GameObjects.Graphics;
  private r!: Rect;
  private inverse = false;

  protected arm(): void {
    this.r = cellsRect(this.cells);
    this.inverse = (this.def.params?.dir ?? 1) === -1;
    this.gfx = this.ctx.scene.add.graphics().setDepth(4);
    drawTile(this.gfx, { x: 0, y: 0, w: this.r.w, h: this.r.h }, this.ctx.theme, 'none');
    this.gfx.setPosition(this.r.x, this.inverse ? this.r.y : this.r.y + this.r.h);
    this.block = this.ctx.scene.physics.add.sprite(this.r.x + this.r.w / 2, this.r.y + this.r.h / 2, 'px');
    this.block.setDisplaySize(this.r.w, this.r.h).setVisible(false);
    const body = this.block.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
    body.enable = this.inverse;
    this.ctx.dynamics.add(this.block);
  }

  protected fire(): void {
    this.ctx.sfx('wall');
    this.ctx.haptic('medium');
    const dur = this.ctx.reduceMotion ? 60 : 150;
    if (this.inverse) {
      // sink open
      this.ctx.scene.tweens.add({
        targets: this.gfx,
        y: this.r.y + this.r.h,
        duration: dur * 1.4,
        ease: 'Quad.easeIn',
        onUpdate: () => {
          const body = this.block.body as Phaser.Physics.Arcade.Body;
          if (this.gfx.y > this.r.y + this.r.h * 0.5) body.enable = false;
          if (body.enable) body.reset(this.r.x + this.r.w / 2, this.gfx.y + this.r.h / 2);
        },
        onComplete: () => {
          (this.block.body as Phaser.Physics.Arcade.Body).enable = false;
          this.complete();
        },
      });
      return;
    }
    this.ctx.scene.tweens.add({
      targets: this.gfx,
      y: this.r.y,
      duration: dur,
      ease: 'Back.easeOut',
      onUpdate: () => {
        const body = this.block.body as Phaser.Physics.Arcade.Body;
        if (this.gfx.y < this.r.y + this.r.h * 0.4 && !body.enable) body.enable = true;
        if (body.enable) body.reset(this.r.x + this.r.w / 2, this.gfx.y + this.r.h / 2);
      },
      onComplete: () => {
        const body = this.block.body as Phaser.Physics.Arcade.Body;
        body.enable = true;
        body.reset(this.r.x + this.r.w / 2, this.r.y + this.r.h / 2);
        this.complete();
      },
    });
  }

  protected restore(): void {
    this.ctx.scene.tweens.killTweensOf(this.gfx);
    this.gfx.setPosition(this.r.x, this.inverse ? this.r.y : this.r.y + this.r.h);
    const body = this.block.body as Phaser.Physics.Arcade.Body;
    body.enable = this.inverse;
    if (this.inverse) body.reset(this.r.x + this.r.w / 2, this.r.y + this.r.h / 2);
  }

  protected teardown(): void {
    this.gfx.destroy();
    this.block.destroy();
  }
}

/** Ceiling mass that slams down, then slowly rises back. */
export class CrusherTrap extends Trap {
  private block!: Phaser.Physics.Arcade.Sprite;
  private gfx!: Phaser.GameObjects.Graphics;
  private r!: Rect;
  private floorY = 0;
  private phase: 'idle' | 'slam' | 'rise' = 'idle';

  protected arm(): void {
    this.r = cellsRect(this.cells);
    this.floorY = this.toCells.length ? cellsRect(this.toCells).y : this.r.y + TILE * 6;
    this.gfx = this.ctx.scene.add.graphics().setDepth(4);
    this.gfx.fillStyle(COLORS.hazardDark, 1);
    this.gfx.fillRoundedRect(0, 0, this.r.w, this.r.h, 4);
    drawSpikeStrip(this.gfx, { x: 0, y: this.r.h - 2, w: this.r.w, h: 12 });
    this.gfx.setPosition(this.r.x, this.r.y);
    this.block = this.ctx.scene.physics.add.sprite(this.r.x + this.r.w / 2, this.r.y + this.r.h / 2, 'px');
    this.block.setDisplaySize(this.r.w, this.r.h + 10).setVisible(false);
    const body = this.block.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
    this.ctx.dynamics.add(this.block);
  }

  protected fire(): void {
    this.phase = 'slam';
    this.ctx.sfx('crusher');
    this.ctx.haptic('heavy');
    if (!this.ctx.reduceMotion) this.ctx.scene.cameras.main.shake(120, 0.006);
  }

  protected onUpdate(dtMs: number): void {
    const body = this.block.body as Phaser.Physics.Arcade.Body;
    const speed = this.def.params?.speed ?? 900;
    if (this.phase === 'slam') {
      const step = (speed * dtMs) / 1000;
      this.gfx.y += step;
      body.reset(this.r.x + this.r.w / 2, this.gfx.y + this.r.h / 2);
      const pr = playerRect(this.ctx.player);
      const hit = { x: this.r.x + 2, y: this.gfx.y, w: this.r.w - 4, h: this.r.h + 12 };
      if (overlap(hit, pr)) {
        this.ctx.kill('crush');
        return;
      }
      if (this.gfx.y >= this.floorY - this.r.h) {
        this.gfx.y = this.floorY - this.r.h;
        this.phase = 'rise';
        this.ctx.sfx('land');
        if (!this.ctx.reduceMotion) this.ctx.scene.cameras.main.shake(100, 0.005);
      }
    } else if (this.phase === 'rise') {
      this.gfx.y -= (speed * 0.18 * dtMs) / 1000;
      body.reset(this.r.x + this.r.w / 2, this.gfx.y + this.r.h / 2);
      if (this.gfx.y <= this.r.y) {
        this.gfx.y = this.r.y;
        this.phase = 'idle';
        if (this.def.params?.cycle) {
          this.state = 'armed';
        } else {
          this.complete();
        }
      }
    }
    this.gfx.x = this.r.x;
  }

  protected restore(): void {
    this.phase = 'idle';
    this.gfx.setPosition(this.r.x, this.r.y);
    const body = this.block.body as Phaser.Physics.Arcade.Body;
    body.reset(this.r.x + this.r.w / 2, this.r.y + this.r.h / 2);
  }

  protected teardown(): void {
    this.gfx.destroy();
    this.block.destroy();
  }
}
