import Phaser from 'phaser';
import { Trap } from '../TrapBase';
import { drawTile, drawGhost } from './draw';
import { playerRect, overlap, TrapContext } from '../context';
import { Rect, TriggerDef } from '../../levels/types';

/** Shared helper: spawn an invisible static body the player can stand on. */
export function spawnSolid(ctx: TrapContext, r: Rect): Phaser.Physics.Arcade.Sprite {
  const b = ctx.solids.create(r.x + r.w / 2, r.y + r.h / 2, 'px') as Phaser.Physics.Arcade.Sprite;
  b.setDisplaySize(r.w, r.h);
  b.refreshBody();
  b.setVisible(false);
  return b;
}

function setSolid(b: Phaser.Physics.Arcade.Sprite, on: boolean): void {
  (b.body as Phaser.Physics.Arcade.StaticBody).enable = on;
}

/** Cells that look like floor… until they don't. */
export class CollapseTrap extends Trap {
  private cellG: { cell: Rect; g: Phaser.GameObjects.Graphics; body: Phaser.Physics.Arcade.Sprite }[] = [];

  /** Attempt-gated collapse floors crumble when stepped on. */
  protected override defaultActivation(): TriggerDef {
    return { event: 'touch' };
  }

  protected arm(): void {
    for (const cell of this.cells) {
      const g = this.ctx.scene.add.graphics().setDepth(3);
      drawTile(g, { x: 0, y: 0, w: cell.w, h: cell.h }, this.ctx.theme, this.def.params?.tell ?? 'crack', this.ctx.edgesAt(cell), cell);
      g.setPosition(cell.x, cell.y);
      const body = spawnSolid(this.ctx, cell);
      this.cellG.push({ cell, g, body });
    }
  }

  protected fire(): void {
    const fuse = this.def.params?.fuse ?? 0;
    const shake = this.def.params?.delay ?? 260;
    this.ctx.feedback('trap.crumble');
    this.after(fuse, () => {
      for (const p of this.cellG) {
        // warning wobble — the floor has second thoughts
        this.ctx.scene.tweens.add({ targets: p.g, x: p.cell.x + 2, duration: 40, yoyo: true, repeat: Math.max(0, Math.floor(shake / 80) - 1) });
      }
      this.after(shake, () => {
        for (const p of this.cellG) {
          setSolid(p.body, false);
          this.ctx.scene.tweens.killTweensOf(p.g);
          p.g.setX(p.cell.x);
          this.ctx.scene.tweens.add({
            targets: p.g,
            y: p.cell.y + 240,
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
      setSolid(p.body, true);
    }
  }

  protected teardown(): void {
    for (const p of this.cellG) {
      this.ctx.scene.tweens.killTweensOf(p.g);
      p.g.destroy();
    }
  }
}

/** Floor that was never there. Looks identical; has no body. */
export class GhostTrap extends Trap {
  private gs: Phaser.GameObjects.Graphics[] = [];
  private wobble = false;

  protected arm(): void {
    this.wobble = this.def.params?.tell === 'wobble' && !this.ctx.reduceMotion;
    for (const cell of this.cells) {
      const g = this.ctx.scene.add.graphics().setDepth(3);
      drawGhost(g, { x: 0, y: 0, w: cell.w, h: cell.h }, this.ctx.theme, this.def.params?.tell, this.ctx.edgesAt(cell), cell);
      g.setPosition(cell.x, cell.y);
      this.gs.push(g);
    }
  }

  protected fire(): void {}

  /** The optional tell is a procedural shimmer — no tween that a reset could orphan. */
  protected onUpdate(): void {
    if (!this.wobble) return;
    const s = 1 - (Math.sin(this.elapsed * 0.007) + 1) * 0.03;
    for (const g of this.gs) g.setScale(1, s);
  }

  protected restore(): void {
    for (const g of this.gs) g.setScale(1);
  }

  protected teardown(): void {
    for (const g of this.gs) g.destroy();
  }
}

interface TimedItem {
  cell: Rect;
  g: Phaser.GameObjects.Graphics;
  body: Phaser.Physics.Arcade.Sprite;
  /** idle → fusing → gone → (back to idle, or spent when not cycling) */
  phase: 'idle' | 'fusing' | 'gone' | 'spent';
  fuseAt: number;
}

/**
 * Steps that blink out after being stood on. With a `touch` trigger every
 * step has its own fuse (only the one you stand on vanishes); any other
 * trigger fires all steps together.
 */
export class TimedTrap extends Trap {
  private items: TimedItem[] = [];

  protected override usesSharedTrigger(t: TriggerDef): boolean {
    return t.event !== 'touch';
  }

  protected arm(): void {
    for (const cell of this.cells) {
      const g = this.ctx.scene.add.graphics().setDepth(3);
      drawTile(g, { x: 0, y: 0, w: cell.w, h: cell.h }, this.ctx.theme, this.def.params?.tell ?? 'none', this.ctx.edgesAt(cell), cell);
      g.setPosition(cell.x, cell.y);
      const body = spawnSolid(this.ctx, cell);
      this.items.push({ cell, g, body, phase: 'idle', fuseAt: 0 });
    }
  }

  protected fire(): void {
    // fired by a non-touch trigger (timer, plate, chain): every step fuses
    for (const it of this.items) this.startFuse(it);
  }

  protected onUpdate(): void {
    const fuse = this.def.params?.fuse ?? 700;
    if (this.activationTrigger().event === 'touch') {
      const pr = playerRect(this.ctx.player);
      for (const it of this.items) {
        if (it.phase !== 'idle') continue;
        const top = { x: it.cell.x, y: it.cell.y - 6, w: it.cell.w, h: 10 };
        if (overlap(top, pr)) this.startFuse(it);
      }
    }
    // Fuse blink: procedural, speeds up as the step is about to go.
    for (const it of this.items) {
      if (it.phase !== 'fusing') continue;
      const left = it.fuseAt + fuse - this.elapsed;
      const rate = left < fuse * 0.4 ? 0.06 : 0.03;
      it.g.setAlpha(0.55 + 0.45 * Math.abs(Math.cos(this.elapsed * rate)));
    }
  }

  private startFuse(it: TimedItem): void {
    if (it.phase !== 'idle') return;
    const fuse = this.def.params?.fuse ?? 700;
    const off = this.def.params?.off ?? 1400;
    it.phase = 'fusing';
    it.fuseAt = this.elapsed;
    this.after(fuse, () => {
      it.g.setAlpha(0).setVisible(false);
      setSolid(it.body, false);
      it.phase = 'gone';
      this.ctx.feedback('trap.vanish');
      this.after(off, () => {
        it.g.setAlpha(1).setVisible(true);
        setSolid(it.body, true);
        it.phase = this.def.params?.cycle ? 'idle' : 'spent';
        if (this.items.every((i) => i.phase === 'spent')) this.complete();
      });
    });
  }

  protected restore(): void {
    for (const it of this.items) {
      it.g.setAlpha(1).setVisible(true);
      setSolid(it.body, true);
      it.phase = 'idle';
    }
  }

  protected teardown(): void {
    for (const it of this.items) it.g.destroy();
  }
}
