import Phaser from 'phaser';
import { Trap } from '../TrapBase';
import { drawTile, drawGhost } from './draw';
import { playerRect, overlap } from '../context';
import { TILE } from '../../core/config';

/** Shared helper: spawn an invisible static body the player can stand on. */
function spawnSolid(ctx: import('../context').TrapContext, r: { x: number; y: number; w: number; h: number }): Phaser.Physics.Arcade.Sprite {
  const b = ctx.solids.create(r.x + r.w / 2, r.y + r.h / 2, 'px') as Phaser.Physics.Arcade.Sprite;
  b.setDisplaySize(r.w, r.h);
  b.refreshBody();
  b.setVisible(false);
  return b;
}

function freeSolid(ctx: import('../context').TrapContext, b: Phaser.Physics.Arcade.Sprite): void {
  ctx.solids.remove(b, true, true);
}

/** Cells that look like floor… until they don't. */
export class CollapseTrap extends Trap {
  private cellG: { cell: import('../../levels/types').Rect; g: Phaser.GameObjects.Graphics; body: Phaser.Physics.Arcade.Sprite }[] = [];

  /** Attempt-gated collapse floors crumble when stepped on. */
  protected override defaultActivation(): import('../../levels/types').TriggerDef {
    return { event: 'touch' };
  }

  protected arm(): void {
    for (const cell of this.cells) {
      const g = this.ctx.scene.add.graphics().setDepth(3);
      drawTile(g, { x: 0, y: 0, w: cell.w, h: cell.h }, this.ctx.theme, this.def.params?.tell ?? 'crack');
      g.setPosition(cell.x, cell.y);
      const body = spawnSolid(this.ctx, cell);
      this.cellG.push({ cell, g, body });
    }
  }

  protected fire(): void {
    const fuse = this.def.params?.fuse ?? 0;
    const shake = this.def.params?.delay ?? 260;
    this.ctx.sfx('crumble');
    this.ctx.haptic('light');
    this.after(fuse, () => {
      for (const p of this.cellG) {
        // warning wobble
        this.ctx.scene.tweens.add({ targets: p.g, x: p.g.x + 2, duration: 40, yoyo: true, repeat: Math.floor(shake / 80) });
      }
      this.after(shake, () => {
        for (const p of this.cellG) {
          freeSolid(this.ctx, p.body);
          this.ctx.scene.tweens.add({
            targets: p.g,
            y: p.g.y + 240,
            alpha: 0,
            angle: Phaser.Math.Between(-40, 40),
            duration: this.ctx.reduceMotion ? 60 : 420,
            ease: 'Quad.easeIn',
            onComplete: () => p.g.setVisible(false),
          });
        }
        this.complete();
      });
    });
  }

  protected restore(): void {
    for (const p of this.cellG) {
      this.ctx.scene.tweens.killTweensOf(p.g);
      p.g.setPosition(p.cell.x, p.cell.y).setAlpha(1).setAngle(0).setVisible(true);
      if (!this.ctx.solids.contains(p.body)) p.body = spawnSolid(this.ctx, p.cell);
      else (p.body.body as Phaser.Physics.Arcade.StaticBody).enable = true;
    }
  }

  protected teardown(): void {
    for (const p of this.cellG) p.g.destroy();
  }
}

/** Floor that was never there. Looks identical; has no body. */
export class GhostTrap extends Trap {
  private gs: Phaser.GameObjects.Graphics[] = [];

  protected arm(): void {
    for (const cell of this.cells) {
      const g = this.ctx.scene.add.graphics().setDepth(3);
      drawGhost(g, { x: 0, y: 0, w: cell.w, h: cell.h }, this.ctx.theme, this.def.params?.tell);
      g.setPosition(cell.x, cell.y);
      this.gs.push(g);
      if (this.def.params?.tell === 'wobble' && !this.ctx.reduceMotion) {
        this.ctx.scene.tweens.add({ targets: g, scaleY: 0.94, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    }
    this.state = 'done';
  }

  protected fire(): void {}
  protected restore(): void {}
  protected teardown(): void {
    for (const g of this.gs) g.destroy();
  }
}

/** Solid that vanishes on a fuse after being stepped on. */
export class TimedTrap extends Trap {
  private items: { cell: import('../../levels/types').Rect; g: Phaser.GameObjects.Graphics; body: Phaser.Physics.Arcade.Sprite; gone: boolean; counting: boolean }[] = [];

  protected arm(): void {
    for (const cell of this.cells) {
      const g = this.ctx.scene.add.graphics().setDepth(3);
      drawTile(g, { x: 0, y: 0, w: cell.w, h: cell.h }, this.ctx.theme, this.def.params?.tell ?? 'none');
      g.setPosition(cell.x, cell.y);
      const body = spawnSolid(this.ctx, cell);
      this.items.push({ cell, g, body, gone: false, counting: false });
    }
  }

  protected fire(): void {
    // fires when armed externally (trap-complete chains); fuse starts regardless
    for (const it of this.items) this.startFuse(it);
    if (!this.def.params?.cycle) this.complete();
  }

  protected onUpdate(): void {
    if (this.def.trigger.event !== 'touch') return;
    const pr = playerRect(this.ctx.player);
    for (const it of this.items) {
      if (it.gone || it.counting) continue;
      const top = { x: it.cell.x, y: it.cell.y - 6, w: it.cell.w, h: 10 };
      if (overlap(top, pr)) {
        it.counting = true;
        this.startFuse(it);
      }
    }
  }

  private startFuse(it: { g: Phaser.GameObjects.Graphics; body: Phaser.Physics.Arcade.Sprite; gone: boolean; counting: boolean; cell: import('../../levels/types').Rect }): void {
    const fuse = this.def.params?.fuse ?? 700;
    const off = this.def.params?.off ?? 1400;
    const blink = this.ctx.scene.tweens.add({
      targets: it.g,
      alpha: 0.25,
      duration: 90,
      yoyo: true,
      repeat: Math.floor(fuse / 180),
    });
    this.after(fuse, () => {
      blink.stop();
      it.g.setAlpha(0).setVisible(false);
      (it.body.body as Phaser.Physics.Arcade.StaticBody).enable = false;
      it.gone = true;
      this.ctx.sfx('pop');
      this.after(off, () => {
        it.g.setAlpha(1).setVisible(true);
        (it.body.body as Phaser.Physics.Arcade.StaticBody).enable = true;
        it.gone = false;
        it.counting = false;
        if (this.def.params?.cycle) {
          /* stays armed for another cycle */
        } else {
          this.complete();
        }
      });
    });
  }

  protected restore(): void {
    for (const it of this.items) {
      this.ctx.scene.tweens.killTweensOf(it.g);
      it.g.setAlpha(1).setVisible(true);
      (it.body.body as Phaser.Physics.Arcade.StaticBody).enable = true;
      it.gone = false;
      it.counting = false;
    }
  }

  protected teardown(): void {
    for (const it of this.items) it.g.destroy();
  }
}
