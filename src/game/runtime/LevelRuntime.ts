import Phaser from 'phaser';
import { ParsedLevel, Rect, LevelDef, TrapType } from '../levels/types';
import { parseLevel } from '../levels/parse';
import { Trap } from '../traps/TrapBase';
import { buildTrap } from '../traps/registry';
import { TrapContext, DeathCause, playerRect, overlap } from '../traps/context';
import { Player } from '../entities/Player';
import { drawCell, drawPlatformTile, drawSpikeStrip, drawGoal, Edges } from '../traps/impl/draw';
import { ChapterTheme, TILE, GRID_W, GRID_H } from '../core/config';
import { FeedbackEvent } from '../feedback/FeedbackManager';
import { bakeImage } from '../core/bake';
import { VIEW } from '../core/view';

export interface RuntimeHooks {
  onKill(cause: DeathCause): void;
  onGoal(): void;
  feedback(ev: FeedbackEvent, opts?: { intensity?: number }): void;
  quip(text: string, x: number, y: number): void;
  reduceMotion(): boolean;
}

/** Trap families drawn as ordinary ground (their disguise must be seamless). */
const GROUND_LIKE: TrapType[] = ['collapse', 'spikes', 'timed', 'ghost', 'conveyor'];

/** One-way platforms collide on a plank this thick (matches the art). */
export const PLANK_H = 12;

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
  /** The shy-door hop tweens a proxy object, so it is tracked explicitly. */
  private goalTween: Phaser.Tweens.Tween | null = null;
  private statics: Phaser.GameObjects.Image | null = null;
  private ctx: TrapContext;
  private platformsFaceDown = true;
  /** Cells that *look* like ground (real or disguised), for seamless edges. */
  private looksSolid: boolean[][] = [];
  private cols: number;

  constructor(scene: Phaser.Scene, def: LevelDef, theme: ChapterTheme, player: Player, hooks: RuntimeHooks) {
    this.scene = scene;
    this.theme = theme;
    this.hooks = hooks;
    this.player = player;
    this.parsed = parseLevel(def);
    this.cols = def.widthCells ?? GRID_W;

    this.solids = scene.physics.add.staticGroup();
    this.platforms = scene.physics.add.staticGroup();
    // Group defaults are applied to every child on add() and would otherwise
    // reset trap bodies to gravity-affected + pushable. Traps opt in to
    // gravity/mobility explicitly (fall blocks on release).
    this.dynamics = scene.physics.add.group({ allowGravity: false, immovable: true });
    this.goalG = scene.add.graphics().setDepth(4);

    this.buildOccupancy(def);

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
      feedback: (ev, o) => hooks.feedback(ev, o),
      moveGoal: (x, y, instant) => this.moveGoal(x, y, instant),
      moveGoalToCell: (cell) => this.moveGoalToCell(cell),
      goalRect: () => this.goalRect,
      edgesAt: (r) => this.edgesAt(r),
      quip: (t, x, y) => hooks.quip(t, x, y),
    };

    this.buildStatics();
    // A door placed under a ceiling (ground above, air below) hangs upside-down.
    const gc = Math.round((this.parsed.goal.x - 2) / TILE);
    const gr = Math.round((this.parsed.goal.y - 2) / TILE) + 1;
    this.goalStartsFlipped = def.map[gr - 1]?.[gc] === '#' && def.map[gr + 1]?.[gc] !== '#';
    if (this.goalStartsFlipped) this.parsed.goal.y = gr * TILE;
    this.goalFlipped = this.goalStartsFlipped;
    this.goalHome = { ...this.parsed.goal };
    this.goalRect = { ...this.parsed.goal };
    this.drawGoal();

    for (const tdef of def.traps) {
      const trap = buildTrap(tdef, this.ctx);
      this.traps.push(trap);
      trap.start();
    }
    this.disableInternalFaces(def);

    // Levels are one screen wide: invisible side walls, open top and bottom
    // (falling out is a death; flipped gravity can fall "up").
    scene.physics.world.setBounds(0, -400, this.parsed.width, this.parsed.height + 800);
    scene.physics.world.setBoundsCollision(true, true, false, false);
  }

  private buildOccupancy(def: LevelDef): void {
    const groundMarkers = new Set(def.traps.filter((t) => GROUND_LIKE.includes(t.type)).map((t) => t.at));
    this.looksSolid = def.map.map((row) => [...row].map((ch) => ch === '#' || ch === '~' || groundMarkers.has(ch)));
  }

  private solidAt(c: number, r: number): boolean {
    if (c < 0 || c >= this.cols) return r >= 0 && r < GRID_H && (this.looksSolid[r]?.[Math.max(0, Math.min(this.cols - 1, c))] ?? false);
    if (r < 0) return false;
    if (r >= GRID_H) return this.looksSolid[GRID_H - 1]?.[c] ?? false; // ground continues off-screen
    return this.looksSolid[r]?.[c] ?? false;
  }

  /** Exposed sides of a cell-aligned rect, judged against ground-looking neighbours. */
  edgesAt(r: Rect): Edges {
    const c0 = Math.round(r.x / TILE);
    const r0 = Math.round(r.y / TILE);
    const c1 = c0 + Math.max(1, Math.round(r.w / TILE)) - 1;
    const r1 = r0 + Math.max(1, Math.round(r.h / TILE)) - 1;
    let top = true;
    let bottom = true;
    for (let c = c0; c <= c1; c++) {
      if (this.solidAt(c, r0 - 1)) top = false;
      if (this.solidAt(c, r1 + 1)) bottom = false;
    }
    let left = true;
    let right = true;
    for (let r = r0; r <= r1; r++) {
      if (this.solidAt(c0 - 1, r)) left = false;
      if (this.solidAt(c1 + 1, r)) right = false;
    }
    return { top, bottom, left, right };
  }

  /**
   * Static ground, planks and spikes, baked into one texture. Ground that
   * touches the level's left/right edge continues into the side margins of
   * wide screens so the world never ends in mid-air.
   */
  private buildStatics(): void {
    const t = this.theme;
    const p = this.parsed;
    const pad = Math.ceil(VIEW.ox / TILE) * TILE;
    const padCells = pad / TILE;
    this.statics = bakeImage(this.scene, `statics-${p.def.id}`, -pad, 0, p.width + pad * 2, p.height, (g) => {
      const X = (x: number) => x + pad;
      for (const r of p.decor) {
        g.fillStyle(t.bgDecor, 1);
        g.fillCircle(X(r.x + r.w / 2), r.y + r.h, r.w / 2);
      }
      for (let r = 0; r < GRID_H; r++) {
        const row = p.def.map[r];
        for (let c = -padCells; c < row.length + padCells; c++) {
          const inside = c >= 0 && c < row.length;
          const ch = inside ? row[c] : row[c < 0 ? 0 : row.length - 1];
          // margins only extend real ground ('#'), never traps or ghosts
          if (inside ? ch !== '#' && ch !== '~' : ch !== '#') continue;
          const x = c * TILE;
          const y = r * TILE;
          const e = this.edgesAt({ x: Math.max(0, Math.min(x, p.width - TILE)), y, w: TILE, h: TILE });
          if (!inside) {
            e.left = false;
            e.right = false;
          }
          drawCell(g, X(x), y, e, t, undefined, x, y);
        }
      }
      for (const r of p.platforms) drawPlatformTile(g, { ...r, x: X(r.x) }, t);
      for (const s of p.spikes) {
        if (s.dir === 'up') drawSpikeStrip(g, { x: X(s.cell.x) + 1, y: s.cell.y + TILE - 14, w: s.cell.w - 2, h: 14 });
        else drawSpikeStrip(g, { x: X(s.cell.x) + 1, y: s.cell.y, w: s.cell.w - 2, h: 14 }, undefined, true);
      }
    }).setDepth(2);

    for (const r of p.solids) this.addSolid(r);
    for (const r of p.platforms) this.addPlatform(r);
    // '~' ghosts: identical look, zero body — the classic betrayal
  }

  /**
   * "Internal edges": a static face fully covered by permanent ground can
   * never be touched legitimately. Leaving it collidable lets Arcade (which
   * resolves Y before X) mistake a seam on a wall face for a ceiling while
   * Pip is pressed against the wall — he couldn't jump up stepped ledges.
   * Only '#' counts as cover: collapsing or ghost cells may vanish.
   */
  private disableInternalFaces(def: LevelDef): void {
    const solid = (c: number, r: number) => {
      if (r >= GRID_H) return true; // below the world
      if (r < 0) return false;
      if (c < 0 || c >= this.cols) return true; // side world bounds
      return def.map[r][c] === '#';
    };
    for (const child of this.solids.getChildren()) {
      const b = (child as Phaser.Physics.Arcade.Sprite).body as Phaser.Physics.Arcade.StaticBody;
      const c0 = Math.round(b.x / TILE);
      const r0 = Math.round(b.y / TILE);
      const c1 = c0 + Math.max(1, Math.round(b.width / TILE)) - 1;
      const r1 = r0 + Math.max(1, Math.round(b.height / TILE)) - 1;
      let up = true, down = true, left = true, right = true;
      for (let c = c0; c <= c1; c++) {
        if (!solid(c, r0 - 1)) up = false;
        if (!solid(c, r1 + 1)) down = false;
      }
      for (let r = r0; r <= r1; r++) {
        if (!solid(c0 - 1, r)) left = false;
        if (!solid(c1 + 1, r)) right = false;
      }
      b.checkCollision.up = !up;
      b.checkCollision.down = !down;
      b.checkCollision.left = !left;
      b.checkCollision.right = !right;
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
    const b = this.platforms.create(r.x + r.w / 2, r.y + PLANK_H / 2, 'px') as Phaser.Physics.Arcade.Sprite;
    b.setDisplaySize(r.w, PLANK_H);
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

  private goalFlipped = false;
  private goalStartsFlipped = false;

  /** Door art is drawn around its centre so it can hang upside-down. */
  private drawGoal(): void {
    const w = this.goalRect.w;
    const h = this.goalRect.h;
    this.goalG.clear();
    drawGoal(this.goalG, { x: -w / 2, y: -h / 2, w, h }, this.theme);
    this.placeGoalArt(this.goalRect.x, this.goalRect.y);
  }

  private placeGoalArt(x: number, y: number): void {
    this.goalG.setPosition(x + this.goalRect.w / 2, y + this.goalRect.h / 2).setScale(1, this.goalFlipped ? -1 : 1);
  }

  /**
   * Send the exit to a map cell. A cell with ground above and air below is a
   * ceiling spot: the door hangs upside-down from it (reachable only with
   * flipped gravity).
   */
  moveGoalToCell(cell: Rect): void {
    const c = Math.round(cell.x / TILE);
    const r = Math.round(cell.y / TILE);
    const map = this.parsed.def.map;
    const ceiling = map[r - 1]?.[c] === '#' && map[r + 1]?.[c] !== '#';
    this.goalFlipped = ceiling;
    if (ceiling) this.moveGoal(cell.x + 2, cell.y, false);
    else this.moveGoal(cell.x + 2, cell.y - TILE + 2, false);
  }

  /** Relocate the exit. The hitbox moves instantly; the art scurries after it. */
  moveGoal(x: number, y: number, instant = false): void {
    this.goalRect = { ...this.goalRect, x, y };
    this.stopGoalTween();
    const hw = this.goalRect.w / 2;
    const hh = this.goalRect.h / 2;
    if (instant || this.hooks.reduceMotion()) {
      this.goalG.setAngle(0);
      this.placeGoalArt(x, y);
      return;
    }
    // a frightened little hop: leap in an arc, lean into the run
    const fromX = this.goalG.x - hw;
    const fromY = this.goalG.y - hh;
    this.goalG.setScale(1, this.goalFlipped ? -1 : 1);
    const o = { t: 0 };
    this.goalTween = this.scene.tweens.add({
      targets: o,
      t: 1,
      duration: 260,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        const arc = Math.sin(o.t * Math.PI) * 46;
        this.goalG.setPosition(fromX + (x - fromX) * o.t + hw, fromY + (y - fromY) * o.t - arc + hh);
        this.goalG.setAngle((x > fromX ? 1 : -1) * Math.sin(o.t * Math.PI) * 14);
      },
      onComplete: () => {
        this.goalG.setAngle(0);
        this.placeGoalArt(x, y);
        this.goalTween = null;
      },
    });
  }

  private stopGoalTween(): void {
    this.goalTween?.stop();
    this.goalTween = null;
    this.scene.tweens.killTweensOf(this.goalG);
  }

  /** Current exit rect (shy doors move it). */
  get goal(): Rect {
    return this.goalRect;
  }

  update(dtMs: number): void {
    const pr = playerRect(this.player);
    for (const z of this.parsed.spikes) {
      if (overlap(z, pr)) {
        this.hooks.onKill('spikes');
        return;
      }
    }
    if (overlap(this.goalRect, pr)) {
      this.hooks.onGoal();
      return;
    }
    if (this.player.y > this.parsed.height + 120 || this.player.y < -160) {
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
    this.goalFlipped = this.goalStartsFlipped;
    this.stopGoalTween();
    this.goalG.setAngle(0).setScale(1);
    this.drawGoal();
    // Gravity first: traps restore against the default world.
    this.scene.physics.world.gravity.y = Math.abs(this.scene.physics.world.gravity.y);
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
    this.stopGoalTween();
    for (const t of this.traps) t.destroy();
    this.traps = [];
    this.statics?.destroy();
    this.goalG.destroy();
    this.solids.destroy(true, true);
    this.platforms.destroy(true, true);
    this.dynamics.destroy(true, true);
    this.bus.removeAllListeners();
  }
}
