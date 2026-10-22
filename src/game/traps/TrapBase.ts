import { TrapDef, Rect, ParsedLevel, TriggerDef } from '../levels/types';
import { TrapContext, cellsRect, playerRect, overlap } from './context';
import { TILE } from '../core/config';

export type TrapState = 'dormant' | 'armed' | 'triggered' | 'active' | 'done';

interface SimTimer {
  at: number;
  fn: () => void;
}

/**
 * Lifecycle:  dormant → armed → triggered → active → done → (reset → armed)
 * `arm()`     build visuals + physics in their pristine state.
 * `fire()`    run the betrayal (trigger condition already satisfied).
 * `reset()`   restore to post-arm state; MUST cancel owned tweens.
 * `onUpdate`  per-frame hook while alive.
 *
 * Timing runs on the trap's own simulation clock (`elapsed`), advanced only
 * by `update()`. Pausing, the death freeze-frame and the intro card therefore
 * stop every trap timer for free, and a replay with identical inputs always
 * produces identical trap behaviour.
 */
export abstract class Trap {
  state: TrapState = 'dormant';
  protected def: TrapDef;
  protected ctx: TrapContext;
  protected parsed: ParsedLevel;
  protected cells: Rect[] = [];
  protected toCells: Rect[] = [];
  private pendingAt = -1;
  /** Simulation-time ms since the last reset. */
  protected elapsed = 0;
  private busHandlers: { ev: string; fn: (...a: unknown[]) => void }[] = [];
  private simTimers: SimTimer[] = [];
  private areaCache = new Map<string, Rect[]>();

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

  /**
   * The trigger that actually fires the trap while armed. For attempt-gated
   * traps the trigger IS the gate, so activation falls back to a per-type
   * default (collapse→touch, spikes→proximity, everything else→always).
   */
  protected activationTrigger(): TriggerDef {
    const t = this.def.trigger;
    if (t.event === 'attempt-gte' || t.event === 'attempt-eq') return this.defaultActivation();
    return t;
  }

  /** Override per trap family to set the post-gate activation. */
  protected defaultActivation(): TriggerDef {
    return { event: 'always' };
  }

  /**
   * Families that evaluate their own trigger per cell (timed steps) return
   * false so the shared poller doesn't fire the whole group at once.
   */
  protected usesSharedTrigger(_t: TriggerDef): boolean {
    return true;
  }

  start(): void {
    this.arm();
    this.state = this.allowedThisAttempt() ? 'armed' : 'dormant';
    this.subscribeTriggers();
  }

  protected subscribeTriggers(): void {
    const t = this.activationTrigger();
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
    this.onTriggered?.(delayMs);
  }

  update(dtMs: number): void {
    if (this.state === 'dormant') return;
    this.elapsed += dtMs;
    this.runTimers();
    if (this.state === 'done') return;
    if (this.state === 'armed') this.checkEdgeTriggers();
    if (this.state === 'triggered' && this.pendingAt >= 0 && this.elapsed >= this.pendingAt) {
      this.pendingAt = -1;
      this.state = 'active';
      this.fire();
      this.speak();
    }
    if (this.state === 'active' || this.state === 'armed' || this.state === 'triggered') this.onUpdate?.(dtMs);
  }

  private runTimers(): void {
    if (!this.simTimers.length) return;
    // Callbacks may schedule more timers; only run what is due right now.
    for (let guard = 0; guard < 32; guard++) {
      const i = this.simTimers.findIndex((t) => t.at <= this.elapsed);
      if (i < 0) return;
      const [t] = this.simTimers.splice(i, 1);
      t.fn();
    }
  }

  /** Polling-style triggers evaluated every frame while armed. */
  private checkEdgeTriggers(): void {
    const t = this.activationTrigger();
    if (!this.usesSharedTrigger(t)) return;
    const pr = playerRect(this.ctx.player);
    switch (t.event) {
      case 'always':
        this.beginCountdown(t.delay ?? 0);
        break;
      case 'timer':
        if (this.elapsed >= t.after) this.beginCountdown(t.delay ?? 0);
        break;
      case 'enter-area': {
        let zones = this.areaCache.get(t.area);
        if (!zones) {
          zones = this.resolveCells(t.area);
          this.areaCache.set(t.area, zones);
        }
        if (zones.some((z) => overlap(z, pr))) this.beginCountdown(t.delay ?? 0);
        break;
      }
      case 'proximity': {
        const d = t.distance ?? TILE * 2.4;
        const center = this.proximityAnchor();
        if (!center) break;
        if (Math.hypot(pr.x + pr.w / 2 - center.x, pr.y + pr.h / 2 - center.y) < d) this.beginCountdown(t.delay ?? 0);
        break;
      }
      case 'touch': {
        if (this.cells.some((z) => overlap(this.inflate(z, 0, 2), pr))) this.beginCountdown(t.delay ?? 0);
        break;
      }
      default:
        break; // attempt gates handled by allowedThisAttempt; bus events by subscribeTriggers
    }
  }

  private spoke = false;

  /** Optional authored one-liner (`params.say`) the first time a trap fires per attempt. */
  private speak(): void {
    const line = this.def.params?.say;
    if (!line || this.spoke || !this.cells.length) return;
    this.spoke = true;
    const r = cellsRect(this.cells);
    this.ctx.quip(line, r.x + r.w / 2, r.y - 36);
  }

  /** Where proximity is measured from. Moving traps (shy doors) override. */
  protected proximityAnchor(): { x: number; y: number } | null {
    if (!this.cells.length) return null;
    const r = cellsRect(this.cells);
    return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
  }

  protected inflate(r: Rect, dx: number, dy: number): Rect {
    return { x: r.x - dx, y: r.y - dy, w: r.w + dx * 2, h: r.h + dy * 2 };
  }

  /** Schedule on the trap's simulation clock. Cancelled by reset/destroy. */
  protected after(ms: number, fn: () => void): void {
    this.simTimers.push({ at: this.elapsed + ms, fn });
  }

  protected complete(): void {
    if (this.state === 'done') return;
    this.state = 'done';
    this.ctx.bus.emit(`trap:${this.def.id}:complete`);
  }

  /** Back to armed (for cycling traps) without touching timers. */
  protected rearm(): void {
    this.pendingAt = -1;
    this.state = 'armed';
  }

  reset(): void {
    this.spoke = false;
    this.simTimers = [];
    this.elapsed = 0;
    this.pendingAt = -1;
    this.state = this.allowedThisAttempt() ? 'armed' : 'dormant';
    this.restore();
  }

  destroy(): void {
    this.simTimers = [];
    for (const h of this.busHandlers) this.ctx.bus.off(h.ev, h.fn);
    this.busHandlers = [];
    this.teardown();
  }

  /** Number of pending sim timers (diagnostics / leak tests). */
  get pendingTimers(): number {
    return this.simTimers.length;
  }

  /** Build pristine state. */
  protected abstract arm(): void;
  /** Execute. */
  protected abstract fire(): void;
  /** Restore post-arm state. */
  protected abstract restore(): void;
  /** Remove owned objects (level teardown only — not called on respawn). */
  protected teardown(): void {}
  /** Per-frame while armed/triggered/active. */
  protected onUpdate?(dtMs: number): void;
  /** Telegraph hook: the trigger fired and `delayMs` of warning remain. */
  protected onTriggered?(delayMs: number): void;
}
