import Phaser from 'phaser';
import { TrapDef, Rect, ParsedLevel } from '../levels/types';
import { TrapContext, cellsRect, playerRect, overlap } from './context';
import { TILE } from '../core/config';

export type TrapState = 'dormant' | 'armed' | 'triggered' | 'active' | 'done';

/**
 * Lifecycle:  dormant → armed → triggered → active → done → (reset → armed)
 * `arm()`     build visuals + physics in their pristine state.
 * `fire()`    run the betrayal (trigger condition already satisfied).
 * `reset()`   restore to post-arm state; MUST cancel owned tweens/timers.
 * `onUpdate`  per-frame hook while alive.
 */
export abstract class Trap {
  state: TrapState = 'dormant';
  protected def: TrapDef;
  protected ctx: TrapContext;
  protected parsed: ParsedLevel;
  protected cells: Rect[] = [];
  protected toCells: Rect[] = [];
  private pendingAt = -1;
  private elapsed = 0;
  private busHandlers: { ev: string; fn: (...a: unknown[]) => void }[] = [];
  protected timers: Phaser.Time.TimerEvent[] = [];

  constructor(def: TrapDef, ctx: TrapContext) {
    this.def = def;
    this.ctx = ctx;
    this.parsed = ctx.parsed;
    this.cells = this.resolveCells(def.at);
    if (def.to) this.toCells = this.resolveCells(def.to);
  }

  protected resolveCells(marker: string): Rect[] {
    if (marker === 'G') return [this.parsed.goal];
    if (marker === '@') {
      const s = this.parsed.spawn;
      return [{ x: s.x - TILE / 2, y: s.y - TILE / 2, w: TILE, h: TILE }];
    }
    return this.parsed.markers.get(marker) ?? [];
  }

  get id(): string {
    return this.def.id;
  }

  /** Attempt-gated traps (the "world remembers" mechanic). */
  private allowedThisAttempt(): boolean {
    const t = this.def.trigger;
    if (t.event === 'attempt-gte') return this.ctx.attempt >= t.n;
    if (t.event === 'attempt-eq') return this.ctx.attempt === t.n;
    return true;
  }

  start(): void {
    this.arm();
    this.state = this.allowedThisAttempt() ? 'armed' : 'dormant';
    this.subscribeTriggers();
  }

  protected subscribeTriggers(): void {
    const t = this.def.trigger;
    const on = (ev: string, fn: (...a: unknown[]) => void) => {
      this.ctx.bus.on(ev, fn);
      this.busHandlers.push({ ev, fn });
    };
    if (t.event === 'press') on(`plate:${t.ref}`, () => this.beginCountdown(t.delay ?? 0));
    if (t.event === 'trap-complete') on(`trap:${t.ref}:complete`, () => this.beginCountdown(t.delay ?? 0));
    if (t.event === 'jump') on('player:jump', () => this.beginCountdown(t.delay ?? 0));
    if (t.event === 'land') on('player:land', () => this.beginCountdown(t.delay ?? 0));
  }

  protected beginCountdown(delayMs: number): void {
    if (this.state !== 'armed' || this.pendingAt >= 0) return;
    this.state = 'triggered';
    this.pendingAt = this.elapsed + delayMs;
  }

  update(dtMs: number): void {
    if (this.state === 'dormant' || this.state === 'done') return;
    this.elapsed += dtMs;
    if (this.state === 'armed') this.checkEdgeTriggers();
    if (this.state === 'triggered' && this.pendingAt >= 0 && this.elapsed >= this.pendingAt) {
      this.pendingAt = -1;
      this.state = 'active';
      this.fire();
    }
    if (this.state === 'active' || this.state === 'armed') this.onUpdate?.(dtMs);
  }

  /** Polling-style triggers evaluated every frame while armed. */
  private checkEdgeTriggers(): void {
    const t = this.def.trigger;
    const pr = playerRect(this.ctx.player);
    switch (t.event) {
      case 'always':
        this.beginCountdown(t.delay ?? 0);
        break;
      case 'timer':
        if (this.elapsed >= t.after) this.beginCountdown(t.delay ?? 0);
        break;
      case 'enter-area': {
        const zones = this.resolveCells(t.area);
        if (zones.some((z) => overlap(z, pr))) this.beginCountdown(t.delay ?? 0);
        break;
      }
      case 'proximity': {
        const d = t.distance ?? TILE * 2.4;
        const center = this.cells.length ? cellsRect(this.cells) : null;
        if (!center) break;
        const cx = center.x + center.w / 2;
        const cy = center.y + center.h / 2;
        if (Math.hypot(pr.x + pr.w / 2 - cx, pr.y + pr.h / 2 - cy) < d) this.beginCountdown(t.delay ?? 0);
        break;
      }
      case 'touch': {
        if (this.cells.some((z) => overlap(this.inflate(z, 0, 2), pr))) this.beginCountdown(t.delay ?? 0);
        break;
      }
      case 'attempt-gte':
      case 'attempt-eq':
        break; // gating already handled by allowedThisAttempt
      default:
        break;
    }
  }

  protected inflate(r: Rect, dx: number, dy: number): Rect {
    return { x: r.x - dx, y: r.y - dy, w: r.w + dx * 2, h: r.h + dy * 2 };
  }

  protected after(ms: number, fn: () => void): void {
    this.timers.push(this.ctx.scene.time.delayedCall(ms, fn));
  }

  protected complete(): void {
    this.state = 'done';
    this.ctx.bus.emit(`trap:${this.def.id}:complete`);
  }

  /** Snapshot helper for visuals that respawn. */
  protected snap(o: Phaser.GameObjects.GameObject & Partial<Phaser.GameObjects.Components.Transform & Phaser.GameObjects.Components.Alpha & Phaser.GameObjects.Components.Visible>): { x: number; y: number; alpha: number; visible: boolean } {
    return { x: o.x ?? 0, y: o.y ?? 0, alpha: o.alpha ?? 1, visible: o.visible ?? true };
  }

  reset(): void {
    for (const t of this.timers) t.remove(false);
    this.timers = [];
    this.elapsed = 0;
    this.pendingAt = -1;
    this.state = this.allowedThisAttempt() ? 'armed' : 'dormant';
    this.restore();
  }

  destroy(): void {
    for (const t of this.timers) t.remove(false);
    for (const h of this.busHandlers) this.ctx.bus.off(h.ev, h.fn);
    this.teardown();
  }

  /** Build pristine state. */
  protected abstract arm(): void;
  /** Execute. */
  protected abstract fire(): void;
  /** Restore post-arm state. */
  protected abstract restore(): void;
  /** Remove owned objects (level teardown only — not called on respawn). */
  protected teardown(): void {}
  /** Per-frame while armed/active. */
  protected onUpdate?(dtMs: number): void;
}
