/**
 * GameplayEvent → FeedbackProfile → audio + haptic + camera.
 *
 * Every "something happened" moment in the game goes through `emit()`, so
 * mixing, debouncing and accessibility rules live in exactly one place.
 * The manager is engine-agnostic (pure TS) and unit-tested with fake sinks.
 */

export type HapticKind = 'selection' | 'light' | 'medium' | 'heavy' | 'success' | 'warning';

export type FeedbackEvent =
  | 'ui.tap' | 'ui.back' | 'ui.denied' | 'ui.toggle'
  | 'player.jump' | 'player.land' | 'player.landHard' | 'player.skid' | 'player.bonk'
  | 'trap.warn' | 'trap.arm' | 'trap.spikes' | 'trap.drop' | 'trap.impact' | 'trap.wall'
  | 'trap.open' | 'trap.crusher' | 'trap.crumble' | 'trap.plate' | 'trap.whoosh'
  | 'trap.boing' | 'trap.gravflip' | 'trap.vanish' | 'trap.spring' | 'goal.flee' | 'goal.caught'
  | 'death.spikes' | 'death.crush' | 'death.void' | 'death.hazard'
  | 'respawn' | 'goal.reach' | 'chapter.complete' | 'achievement';

export interface FeedbackProfile {
  /** Synth patch name(s); an array picks round-robin to avoid fatigue. */
  sfx?: string | string[];
  /** Play every patch in `sfx` together instead of round-robin. */
  layer?: boolean;
  haptic?: HapticKind;
  /** Camera shake: duration ms, intensity (fraction of viewport). */
  shake?: [number, number];
  /** Minimum gap between two plays of this event (ms). */
  gapMs?: number;
  /** Higher priority haptics may interrupt the global haptic gap. */
  priority?: number;
}

/** Tuned profiles. Heavy haptics are reserved for death and big impacts. */
export const PROFILES: Record<FeedbackEvent, FeedbackProfile> = {
  'ui.tap': { sfx: 'click', haptic: 'selection', gapMs: 40 },
  'ui.back': { sfx: 'back', haptic: 'selection', gapMs: 40 },
  'ui.denied': { sfx: 'denied', haptic: 'warning', gapMs: 200 },
  'ui.toggle': { sfx: 'tick', haptic: 'selection', gapMs: 40 },
  // jumps are frequent — sound only, no buzz (a failed jump must never nag)
  'player.jump': { sfx: ['jump', 'jump2'], gapMs: 50 },
  'player.land': { sfx: 'land', gapMs: 90 },
  'player.landHard': { sfx: 'landHard', haptic: 'light', shake: [70, 0.0025], gapMs: 160, priority: 1 },
  'player.skid': { sfx: 'skid', gapMs: 260 },
  'player.bonk': { sfx: 'bonk', haptic: 'light', gapMs: 200 },
  'trap.warn': { sfx: 'warn', haptic: 'selection', gapMs: 220 },
  'trap.arm': { sfx: 'tick', gapMs: 200 },
  'trap.spikes': { sfx: 'pop', haptic: 'light', gapMs: 120, priority: 1 },
  'trap.drop': { sfx: 'whoosh', gapMs: 120 },
  'trap.impact': { sfx: 'thud', haptic: 'medium', shake: [90, 0.004], gapMs: 120, priority: 2 },
  'trap.wall': { sfx: 'wall', haptic: 'medium', shake: [60, 0.003], gapMs: 120, priority: 2 },
  'trap.open': { sfx: 'wall', haptic: 'light', gapMs: 120 },
  'trap.crusher': { sfx: 'crusher', haptic: 'medium', shake: [110, 0.005], gapMs: 160, priority: 2 },
  'trap.crumble': { sfx: 'crumble', haptic: 'light', gapMs: 160 },
  'trap.plate': { sfx: 'plate', haptic: 'light', gapMs: 120 },
  'trap.whoosh': { sfx: 'whoosh', gapMs: 120 },
  'trap.boing': { sfx: 'boing', haptic: 'light', gapMs: 200 },
  'trap.gravflip': { sfx: 'gravflip', haptic: 'medium', gapMs: 250, priority: 2 },
  'trap.vanish': { sfx: 'vanish', gapMs: 80 },
  'trap.spring': { sfx: 'spring', haptic: 'medium', gapMs: 120, priority: 2 },
  'goal.flee': { sfx: 'flee', haptic: 'light', gapMs: 200 },
  'goal.caught': { sfx: 'caught', haptic: 'success', gapMs: 300 },
  'death.spikes': { sfx: 'pop', haptic: 'heavy', shake: [120, 0.006], gapMs: 250, priority: 3 },
  'death.crush': { sfx: 'splat', haptic: 'heavy', shake: [140, 0.008], gapMs: 250, priority: 3 },
  'death.void': { sfx: 'fall', haptic: 'medium', gapMs: 250, priority: 3 },
  'death.hazard': { sfx: 'shrink', haptic: 'heavy', shake: [110, 0.006], gapMs: 250, priority: 3 },
  respawn: { sfx: 'respawn', gapMs: 200 },
  'goal.reach': { sfx: ['goal', 'confetti'], layer: true, haptic: 'success', gapMs: 500, priority: 4 },
  'chapter.complete': { sfx: 'fanfare', haptic: 'success', gapMs: 1000, priority: 4 },
  achievement: { sfx: 'achievement', haptic: 'light', gapMs: 400 },
};

/** Global minimum spacing between any two haptic pulses (anti-buzz). */
export const HAPTIC_GAP_MS = 70;

export interface FeedbackSinks {
  sfx(name: string): void;
  haptic(kind: HapticKind): void;
  now(): number;
}

export interface FeedbackPrefs {
  haptics: boolean;
  shake: boolean;
  reducedMotion: boolean;
  /** Lower everything a notch (accessibility: reduced sensory intensity). */
  gentle: boolean;
}

export type ShakeSink = (ms: number, intensity: number) => void;

const SOFTER: Record<HapticKind, HapticKind | null> = {
  heavy: 'medium',
  medium: 'light',
  light: 'selection',
  selection: null,
  success: 'light',
  warning: 'selection',
};

export class FeedbackManager {
  private lastAt = new Map<FeedbackEvent, number>();
  private rr = new Map<FeedbackEvent, number>();
  private lastHapticAt = -Infinity;
  private lastHapticPriority = 0;
  private shakeSink: ShakeSink | null = null;
  /** Ring of recent events (tests + the dev inspector read it). */
  readonly log: { ev: FeedbackEvent; t: number; haptic: HapticKind | null; sfx: string | null }[] = [];

  constructor(
    private sinks: FeedbackSinks,
    private prefs: () => FeedbackPrefs,
  ) {}

  /** The active scene registers its camera; it must detach on shutdown. */
  attachShake(sink: ShakeSink | null): void {
    this.shakeSink = sink;
  }

  emit(ev: FeedbackEvent, opts: { intensity?: number } = {}): void {
    const p = PROFILES[ev];
    if (!p) return;
    const now = this.sinks.now();
    const last = this.lastAt.get(ev) ?? -Infinity;
    if (now - last < (p.gapMs ?? 0)) return;
    this.lastAt.set(ev, now);
    const prefs = this.prefs();

    let sfx: string | null = null;
    if (Array.isArray(p.sfx)) {
      if (p.layer) {
        for (const s of p.sfx) this.sinks.sfx(s);
        sfx = p.sfx.join('+');
      } else {
        const i = this.rr.get(ev) ?? 0;
        sfx = p.sfx[i % p.sfx.length];
        this.rr.set(ev, i + 1);
        this.sinks.sfx(sfx);
      }
    } else if (p.sfx) {
      sfx = p.sfx;
      this.sinks.sfx(sfx);
    }

    let haptic: HapticKind | null = null;
    if (p.haptic && prefs.haptics) {
      haptic = prefs.gentle ? SOFTER[p.haptic] : p.haptic;
      const prio = p.priority ?? 0;
      const sinceHaptic = now - this.lastHapticAt;
      if (haptic && (sinceHaptic >= HAPTIC_GAP_MS || prio > this.lastHapticPriority)) {
        this.lastHapticAt = now;
        this.lastHapticPriority = prio;
        this.sinks.haptic(haptic);
      } else haptic = null;
    }

    if (p.shake && prefs.shake && !prefs.reducedMotion && this.shakeSink) {
      const k = (opts.intensity ?? 1) * (prefs.gentle ? 0.5 : 1);
      this.shakeSink(p.shake[0], p.shake[1] * k);
    }

    this.log.push({ ev, t: now, haptic, sfx });
    if (this.log.length > 64) this.log.shift();
  }
}
