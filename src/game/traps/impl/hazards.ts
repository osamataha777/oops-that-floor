import Phaser from 'phaser';
import { Trap } from '../TrapBase';
import { drawSpikeStrip, drawTile, drawCrusher } from './draw';
import { playerRect, overlap, cellsRect } from '../context';
import { TILE } from '../../core/config';
import { Rect, TriggerDef } from '../../levels/types';

const SPIKE_SUNK = 20; // px below the cell top while hidden
const SPIKE_OUT = -13; // px above the cell top while exposed

interface SpikeItem {
  tile: Phaser.GameObjects.Graphics;
  g: Phaser.GameObjects.Graphics;
  zone: Rect;
  cell: Rect;
  body: Phaser.Physics.Arcade.Sprite;
}

/**
 * Spikes that hide inside a floor block and pop out on the trigger.
 * `params.period` turns them into a rhythm hazard with a visible peek
 * telegraph before every rise. Exposure is a single idempotent flag, so a
 * transition can never be scheduled twice while its tween is in flight.
 */
export class HiddenSpikesTrap extends Trap {
  private items: SpikeItem[] = [];
  private periodic = false;
  private exposed = false;
  private peeking = false;
  /** Sim-time at which the rising spikes become lethal (−1 = not lethal). */
  private lethalAt = -1;
  private cycleStart = 0;

  /** Attempt-gated spikes behave like any other hidden spike — they pop when the player gets close. */
  protected override defaultActivation(): TriggerDef {
    return { event: 'proximity', distance: 60 };
  }

  private get riseMs(): number {
    return this.ctx.reduceMotion ? 40 : 110;
  }

  protected arm(): void {
    this.periodic = (this.def.params?.period ?? 0) > 0;
    for (const cell of this.cells) {
      // the block it hides in looks (and is) solid
      const tile = this.ctx.scene.add.graphics().setDepth(3);
      drawTile(tile, { x: 0, y: 0, w: cell.w, h: cell.h }, this.ctx.theme, this.def.params?.tell === 'crack' ? 'crack' : 'none', this.ctx.edgesAt(cell), cell);
      tile.setPosition(cell.x, cell.y);
      const body = this.spawnBody(cell);
      const g = this.ctx.scene.add.graphics().setDepth(2.5);
      drawSpikeStrip(g, { x: 0, y: 0, w: cell.w, h: 14 });
      g.setPosition(cell.x, cell.y + SPIKE_SUNK).setAlpha(0);
      const zone: Rect = { x: cell.x + 3, y: cell.y - 14, w: cell.w - 6, h: 15 };
      this.items.push({ tile, g, zone, cell, body });
    }
  }

  private spawnBody(cell: Rect): Phaser.Physics.Arcade.Sprite {
    const body = this.ctx.solids.create(cell.x + cell.w / 2, cell.y + cell.h / 2, 'px') as Phaser.Physics.Arcade.Sprite;
    body.setDisplaySize(cell.w, cell.h);
    body.refreshBody();
    body.setVisible(false);
    return body;
  }

  protected fire(): void {
    this.cycleStart = this.elapsed;
    if (this.periodic) this.ctx.feedback('trap.arm');
    else this.setExposed(true);
    // Stay 'active' — exposed spikes must remain lethal. Calling complete()
    // here would freeze onUpdate and make them harmless decorations.
  }

  /** Idempotent: repeated calls with the same value are no-ops. */
  private setExposed(out: boolean): void {
    if (out === this.exposed) return;
    this.exposed = out;
    this.peeking = false;
    this.lethalAt = out ? this.elapsed + this.riseMs : -1;
    for (const it of this.items) {
      this.ctx.scene.tweens.killTweensOf(it.g);
      this.ctx.scene.tweens.add({
        targets: it.g,
        y: it.cell.y + (out ? SPIKE_OUT : SPIKE_SUNK),
        alpha: out ? 1 : 0,
        duration: out ? this.riseMs : this.riseMs * 1.6,
        ease: out ? 'Back.easeOut' : 'Quad.easeIn',
      });
    }
    if (out) this.ctx.feedback('trap.spikes');
  }

  /** Warning peek before a periodic rise: tips show, nothing is lethal yet. */
  private setPeek(on: boolean): void {
    if (on === this.peeking || this.exposed) return;
    this.peeking = on;
    for (const it of this.items) {
      this.ctx.scene.tweens.killTweensOf(it.g);
      this.ctx.scene.tweens.add({
        targets: it.g,
        y: it.cell.y + (on ? -3 : SPIKE_SUNK), // tips poke ~4 px above the surface
        alpha: on ? 0.85 : 0,
        duration: 90,
        ease: 'Sine.easeOut',
      });
    }
    if (on) this.ctx.feedback('trap.warn');
  }

  protected onUpdate(): void {
    if (this.periodic && this.state === 'active') {
      const period = this.def.params!.period!;
      const hold = this.def.params?.hold ?? period * 0.45;
      const phase = this.def.params?.phase ?? 0;
      const t = (this.elapsed - this.cycleStart + phase) % period;
      const shouldBeOut = t < hold;
      const warn = Math.min(260, period - hold - 60);
      if (shouldBeOut) this.setExposed(true);
      else {
        this.setExposed(false);
        this.setPeek(period - t <= warn);
      }
    }
    if (this.lethalAt < 0 || this.elapsed < this.lethalAt) return;
    const pr = playerRect(this.ctx.player);
    for (const it of this.items) {
      if (overlap(it.zone, pr)) {
        this.ctx.kill('spikes');
        return;
      }
    }
  }

  /** Diagnostics for tests: whether the spikes can currently kill. */
  get isLethal(): boolean {
    return this.lethalAt >= 0 && this.elapsed >= this.lethalAt;
  }

  protected restore(): void {
    this.exposed = false;
    this.peeking = false;
    this.lethalAt = -1;
    this.cycleStart = 0;
    for (const it of this.items) {
      this.ctx.scene.tweens.killTweensOf(it.g);
      it.g.setPosition(it.cell.x, it.cell.y + SPIKE_SUNK).setAlpha(0);
      if (!this.ctx.solids.contains(it.body)) it.body = this.spawnBody(it.cell);
      else (it.body.body as Phaser.Physics.Arcade.StaticBody).enable = true;
    }
  }

  protected teardown(): void {
    for (const it of this.items) {
      this.ctx.scene.tweens.killTweensOf(it.g);
      it.g.destroy();
      it.tile.destroy();
    }
  }
}

/** Shudder offset used by telegraphing hazards (procedural — never a tween). */
function shudder(elapsed: number, amp: number): number {
  return Math.sin(elapsed * 0.09) * amp;
}

/** Block that drops from above when the player crosses under it; then rests as ground. */
export class FallBlockTrap extends Trap {
  private block!: Phaser.Physics.Arcade.Sprite;
  private gfx!: Phaser.GameObjects.Graphics;
  private landed = false;
  private home!: { x: number; y: number };
  private fallT = 0;
  private prevTop = 0;

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

  protected onTriggered(): void {
    this.ctx.feedback('trap.warn');
  }

  protected fire(): void {
    this.fallT = 0;
    const body = this.block.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(true);
    body.setImmovable(false);
    // While falling it's a hazard, not a platform: Pip must not "catch" it.
    this.block.setData('passThrough', true);
    this.ctx.feedback('trap.drop');
  }

  protected onUpdate(dtMs: number): void {
    const body = this.block.body as Phaser.Physics.Arcade.Body;
    const shake = this.state === 'triggered' ? shudder(this.elapsed, 1.6) : 0;
    this.gfx.setPosition(this.block.x - this.block.displayWidth / 2 + shake, this.block.y - this.block.displayHeight / 2);
    if (this.state !== 'active') {
      this.prevTop = this.block.y - this.block.displayHeight / 2;
      return;
    }
    this.fallT += dtMs;
    const top = this.block.y - this.block.displayHeight / 2;
    if (!this.landed && top > this.prevTop + 0.5) {
      // Swept test: everything the block passed through this frame. Near the
      // ground it moves ~20 px/frame — more than enough to skip over Pip.
      const pr = playerRect(this.ctx.player);
      const sweep = { x: this.block.x - this.block.displayWidth / 2 + 2, y: this.prevTop + 2, w: this.block.displayWidth - 4, h: top - this.prevTop + this.block.displayHeight - 2 };
      if (overlap(sweep, pr)) {
        this.ctx.kill('crush');
        return;
      }
    }
    this.prevTop = top;
    if (!this.landed && this.fallT > 250 && (body.blocked.down || body.touching.down || Math.abs(body.velocity.y) < 8)) {
      this.landed = true;
      body.setVelocity(0, 0);
      body.setAllowGravity(false);
      body.setImmovable(true);
      this.block.setData('passThrough', false);
      this.ctx.feedback('trap.impact');
      this.complete();
    }
    // Fell into a pit: park it far below so it never haunts the level.
    if (!this.landed && this.block.y > this.parsed.height + 200) {
      body.setVelocity(0, 0);
      body.setAllowGravity(false);
      this.landed = true;
      this.complete();
    }
  }

  protected restore(): void {
    const body = this.block.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    body.setAllowGravity(false);
    body.setImmovable(true);
    body.reset(this.home.x + this.block.displayWidth / 2, this.home.y + this.block.displayHeight / 2);
    this.block.setData('passThrough', false);
    this.landed = false;
    this.fallT = 0;
    this.prevTop = this.home.y;
    this.gfx.setPosition(this.home.x, this.home.y);
  }

  protected teardown(): void {
    this.gfx.destroy();
    this.block.destroy();
  }
}

/**
 * A wall that rises out of the floor — or (dir:-1) starts raised and sinks
 * open like a door. The motion is evaluated on the trap's sim clock every
 * frame (not a tween) so the collision body is exactly where the art is.
 */
export class WallTrap extends Trap {
  private block!: Phaser.Physics.Arcade.Sprite;
  private gfx!: Phaser.GameObjects.Graphics;
  private r!: Rect;
  private inverse = false;
  private moveAt = -1;
  /** 'go' = first move, 'back' = changing its mind (params.retract). */
  private leg: 'go' | 'back' = 'go';

  protected arm(): void {
    this.r = cellsRect(this.cells);
    this.inverse = (this.def.params?.dir ?? 1) === -1;
    this.gfx = this.ctx.scene.add.graphics().setDepth(4);
    drawTile(this.gfx, { x: 0, y: 0, w: this.r.w, h: this.r.h }, this.ctx.theme, 'none');
    this.block = this.ctx.scene.physics.add.sprite(this.r.x + this.r.w / 2, this.r.y + this.r.h / 2, 'px');
    this.block.setDisplaySize(this.r.w, this.r.h).setVisible(false);
    const body = this.block.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
    this.ctx.dynamics.add(this.block);
    this.place(this.inverse ? 0 : 1);
  }

  private get moveMs(): number {
    return this.ctx.reduceMotion ? 60 : this.inverse ? 210 : 150;
  }

  /** `sunk` 0 = fully raised, 1 = fully inside the floor. */
  private place(sunk: number): void {
    const y = this.r.y + this.r.h * sunk;
    this.gfx.setPosition(this.r.x, y).setVisible(sunk < 0.999);
    const body = this.block.body as Phaser.Physics.Arcade.Body;
    // Solid while at least ~half exposed: never an invisible wall, never a gap.
    const solid = sunk < 0.55;
    if (solid && !body.enable) {
      body.enable = true;
      body.reset(this.r.x + this.r.w / 2, y + this.r.h / 2);
      this.liftPlayerIfInside(y);
    } else if (!solid && body.enable) body.enable = false;
    if (body.enable) body.reset(this.r.x + this.r.w / 2, y + this.r.h / 2);
  }

  protected fire(): void {
    this.ctx.feedback(this.inverse ? 'trap.open' : 'trap.wall');
    this.moveAt = this.elapsed;
  }

  protected onUpdate(): void {
    if (this.moveAt < 0 || this.state !== 'active') return;
    const k = Math.min(1, (this.elapsed - this.moveAt) / this.moveMs);
    if (this.leg === 'back') {
      // reverse of the first move, eased in — it sulks back
      this.place(this.inverse ? 1 - k * k : k * k);
      if (k >= 1) {
        this.place(this.inverse ? 0 : 1);
        this.moveAt = -1;
        this.complete();
      }
      return;
    }
    if (this.inverse) {
      this.place(k * k); // ease-in sink
    } else {
      // ease-out with a small overshoot (Back) — the wall *pops*
      const s = 1.6;
      const e = 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2);
      this.place(1 - Math.min(1.08, e));
    }
    if (k >= 1) {
      this.place(this.inverse ? 1 : 0);
      this.moveAt = -1;
      const retract = this.def.params?.retract ?? 0;
      if (retract > 0) {
        // "changes its mind": hold, wobble a warning, then undo itself
        this.after(Math.max(0, retract - 260), () => this.ctx.feedback('trap.warn'));
        this.after(retract, () => {
          this.leg = 'back';
          this.moveAt = this.elapsed;
          this.ctx.feedback(this.inverse ? 'trap.wall' : 'trap.open');
        });
      } else this.complete();
    }
  }

  private liftPlayerIfInside(top: number): void {
    const pr = playerRect(this.ctx.player);
    if (overlap({ x: this.r.x, y: top, w: this.r.w, h: this.r.y + this.r.h - top }, pr)) {
      this.ctx.player.y -= pr.y + pr.h - top + 1;
      (this.ctx.player.body as Phaser.Physics.Arcade.Body).updateFromGameObject();
    }
  }

  protected restore(): void {
    this.moveAt = -1;
    this.leg = 'go';
    const body = this.block.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    this.place(this.inverse ? 0 : 1);
  }

  protected teardown(): void {
    this.gfx.destroy();
    this.block.destroy();
  }
}

/** Ceiling mass that slams down, then slowly rises back. Shudders before it drops. */
export class CrusherTrap extends Trap {
  private block!: Phaser.Physics.Arcade.Sprite;
  private gfx!: Phaser.GameObjects.Graphics;
  private r!: Rect;
  private floorY = 0;
  private y = 0;
  private phase: 'idle' | 'slam' | 'rise' = 'idle';

  protected arm(): void {
    this.r = cellsRect(this.cells);
    // `to` marks the cells the crusher slams through; it stops flush with
    // their bottom edge (the floor), never hovering above it.
    this.floorY = this.toCells.length ? (() => { const t = cellsRect(this.toCells); return t.y + t.h; })() : this.r.y + TILE * 6;
    this.gfx = this.ctx.scene.add.graphics().setDepth(4);
    drawCrusher(this.gfx, this.r.w, this.r.h, this.r.y, this.ctx.theme);
    this.y = this.r.y;
    this.gfx.setPosition(this.r.x, this.r.y);
    this.block = this.ctx.scene.physics.add.sprite(this.r.x + this.r.w / 2, this.r.y + this.r.h / 2, 'px');
    this.block.setDisplaySize(this.r.w, this.r.h + 10).setVisible(false);
    const body = this.block.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
    this.ctx.dynamics.add(this.block);
  }

  protected onTriggered(): void {
    this.ctx.feedback('trap.warn');
  }

  protected fire(): void {
    this.phase = 'slam';
    this.ctx.feedback('trap.crusher');
  }

  protected onUpdate(dtMs: number): void {
    const body = this.block.body as Phaser.Physics.Arcade.Body;
    const speed = this.def.params?.speed ?? 900;
    if (this.phase === 'slam') {
      this.y += (speed * dtMs) / 1000;
      const pr = playerRect(this.ctx.player);
      const hit = { x: this.r.x + 2, y: this.y, w: this.r.w - 4, h: this.r.h + 12 };
      if (overlap(hit, pr)) {
        this.ctx.kill('crush');
        return;
      }
      if (this.y >= this.floorY - this.r.h) {
        this.y = this.floorY - this.r.h;
        this.phase = 'rise';
        this.ctx.feedback('trap.impact');
      }
    } else if (this.phase === 'rise') {
      this.y -= (speed * 0.18 * dtMs) / 1000;
      if (this.y <= this.r.y) {
        this.y = this.r.y;
        this.phase = 'idle';
        if (this.def.params?.cycle) this.rearm();
        else this.complete();
      }
    }
    body.reset(this.r.x + this.r.w / 2, this.y + this.r.h / 2);
    const shake = this.state === 'triggered' ? shudder(this.elapsed, 2) : 0;
    this.gfx.setPosition(this.r.x + shake, this.y);
  }

  protected restore(): void {
    this.phase = 'idle';
    this.y = this.r.y;
    this.gfx.setPosition(this.r.x, this.r.y);
    const body = this.block.body as Phaser.Physics.Arcade.Body;
    body.reset(this.r.x + this.r.w / 2, this.r.y + this.r.h / 2);
  }

  protected teardown(): void {
    this.gfx.destroy();
    this.block.destroy();
  }
}
