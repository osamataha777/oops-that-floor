import Phaser from 'phaser';
import { ParsedLevel, Rect } from '../levels/types';
import { parseLevel } from '../levels/parse';
import { LevelDef } from '../levels/types';
import { Trap } from '../traps/TrapBase';
import { buildTrap } from '../traps/registry';
import { TrapContext, DeathCause, playerRect, overlap } from '../traps/context';
import { Player } from '../entities/Player';
import { drawTile, drawPlatformTile, drawSpikeStrip, drawGoal } from '../traps/impl/draw';
import { ChapterTheme, TILE } from '../core/config';
import { SFX } from '../audio/synth';

export interface RuntimeHooks {
  onKill(cause: DeathCause): void;
  onGoal(): void;
  sfx(name: keyof typeof SFX): void;
  haptic(kind: 'light' | 'medium' | 'heavy'): void;
  quip(text: string, x: number, y: number): void;
  reduceMotion(): boolean;
}

/**
 * Builds and owns everything inside a level: baked static visuals, physics
 * groups, the goal, and every trap instance. `reset()` restores the whole
 * level deterministically without a scene restart.
 */
export class LevelRuntime {
  readonly parsed: ParsedLevel;
  readonly bus = new Phaser.Events.EventEmitter();
  readonly solids: Phaser.Physics.Arcade.StaticGroup;
  /** '=' cells — true one-way platforms (collide only from the standing face). */
  readonly platforms: Phaser.Physics.Arcade.StaticGroup;
  readonly dynamics: Phaser.Physics.Arcade.Group;
  traps: Trap[] = [];
  /** 1-based: attempt N is the player's Nth try this visit. */
  attempt = 1;

  private scene: Phaser.Scene;
  private theme: ChapterTheme;
  private hooks: RuntimeHooks;
  private player: Player;
  private goalHome: Rect;
  private goalRect: Rect;
  private goalG: Phaser.GameObjects.Graphics;
  private spikeZones: Rect[];
  private staticG: Phaser.GameObjects.Graphics;
  private ctx: TrapContext;
  private platformsFaceDown = true;

  constructor(scene: Phaser.Scene, def: LevelDef, theme: ChapterTheme, player: Player, hooks: RuntimeHooks) {
    this.scene = scene;
    this.theme = theme;
    this.hooks = hooks;
    this.player = player;
    this.parsed = parseLevel(def);

    this.solids = scene.physics.add.staticGroup();
    this.platforms = scene.physics.add.staticGroup();
    this.dynamics = scene.physics.add.group();
    this.staticG = scene.add.graphics().setDepth(2);
    this.goalG = scene.add.graphics().setDepth(4);

    this.ctx = {
      scene,
      player,
      solids: this.solids,
      dynamics: this.dynamics,
      attempt: 1,
      theme,
      parsed: this.parsed,
      bus: this.bus,
      reduceMotion: hooks.reduceMotion(),
      kill: (c) => hooks.onKill(c),
      sfx: (n) => hooks.sfx(n),
      haptic: (k) => hooks.haptic(k),
      moveGoal: (x, y) => this.moveGoal(x, y),
      quip: (t, x, y) => hooks.quip(t, x, y),
    };

    this.buildStatics();
    this.goalHome = { ...this.parsed.goal };
    this.goalRect = { ...this.parsed.goal };
    this.drawGoal();
    this.spikeZones = this.parsed.spikes;

    for (const tdef of def.traps) {
      const trap = buildTrap(tdef, this.ctx);
      this.traps.push(trap);
      trap.start();
    }

    scene.physics.world.setBounds(0, 0, this.parsed.width, this.parsed.height + 400);
  }

  private buildStatics(): void {
    const g = this.staticG;
    const t = this.theme;
    for (const r of this.parsed.solids) {
      drawTile(g, r, t);
      this.addSolid(r);
    }
    for (const r of this.parsed.platforms) {
      drawPlatformTile(g, r, t);
      this.addPlatform(r);
    }
    for (const r of this.parsed.ghosts) {
      // identical look, zero body — the classic betrayal
      drawTile(g, r, t);
    }
    for (const r of this.parsed.decor) {
      g.fillStyle(t.bgDecor, 1);
      g.fillCircle(r.x + r.w / 2, r.y + r.h, r.w / 2);
    }
    for (const r of this.parsed.spikes) {
      drawSpikeStrip(g, { x: r.x - 3, y: r.y, w: r.w + 6, h: 14 });
    }
  }

  private addSolid(r: Rect): Phaser.Physics.Arcade.Sprite {
    const b = this.solids.create(r.x + r.w / 2, r.y + r.h / 2, 'px') as Phaser.Physics.Arcade.Sprite;
    b.setDisplaySize(r.w, r.h);
    b.refreshBody();
    b.setVisible(false);
    return b;
  }

  private addPlatform(r: Rect): void {
    const b = this.platforms.create(r.x + r.w / 2, r.y + r.h / 2, 'px') as Phaser.Physics.Arcade.Sprite;
    b.setDisplaySize(r.w, r.h);
    b.refreshBody();
    b.setVisible(false);
    const body = b.body as Phaser.Physics.Arcade.StaticBody;
    // One-way: collide on the standing face only. Gravity flips swap the face.
    const down = this.scene.physics.world.gravity.y >= 0;
    body.checkCollision.up = down;
    body.checkCollision.down = !down;
    body.checkCollision.left = false;
    body.checkCollision.right = false;
  }

  private drawGoal(): void {
    this.goalG.clear();
    drawGoal(this.goalG, { x: 0, y: 0, w: this.goalRect.w, h: this.goalRect.h });
    this.goalG.setPosition(this.goalRect.x, this.goalRect.y);
  }

  moveGoal(x: number, y: number): void {
    this.goalRect.x = x;
    this.goalRect.y = y;
    this.scene.tweens.add({ targets: this.goalG, x, y, duration: this.hooks.reduceMotion() ? 40 : 200, ease: 'Back.easeOut' });
    this.goalG.setPosition(x, y);
  }

  update(dtMs: number): void {
    const pr = playerRect(this.player);
    for (const z of this.spikeZones) {
      if (overlap(z, pr)) {
        this.hooks.onKill('spikes');
        return;
      }
    }
    if (overlap(this.goalRect, pr)) {
      this.hooks.onGoal();
      return;
    }
    if (this.player.y > this.parsed.height + 120) {
      this.hooks.onKill('void');
      return;
    }
    // One-way platforms track gravity flips.
    const down = this.scene.physics.world.gravity.y >= 0;
    if (down !== this.platformsFaceDown) {
      this.platformsFaceDown = down;
      for (const p of this.platforms.getChildren()) {
        const body = (p as Phaser.Physics.Arcade.Sprite).body as Phaser.Physics.Arcade.StaticBody;
        body.checkCollision.up = down;
        body.checkCollision.down = !down;
      }
    }
    for (const t of this.traps) t.update(dtMs);
  }

  /** Deterministic full restore. */
  reset(): void {
    this.attempt += 1;
    this.ctx.attempt = this.attempt;
    this.goalRect = { ...this.goalHome };
    this.scene.tweens.killTweensOf(this.goalG);
    this.drawGoal();
    for (const t of this.traps) t.reset();
  }

  notifyJump(): void {
    this.bus.emit('player:jump');
  }
  notifyLand(): void {
    this.bus.emit('player:land');
  }

  setAttempt(n: number): void {
    this.attempt = n;
    this.ctx.attempt = n;
  }

  destroy(): void {
    for (const t of this.traps) t.destroy();
    this.traps = [];
    this.staticG.destroy();
    this.goalG.destroy();
    this.solids.destroy(true, true);
    this.platforms.destroy(true, true);
    this.dynamics.destroy(true, true);
    this.bus.removeAllListeners();
  }
}
