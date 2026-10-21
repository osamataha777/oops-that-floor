/**
 * Central motion language. Every duration/ease the game uses for a recurring
 * kind of movement lives here so UI, character and world animate with one
 * consistent rhythm: quick anticipation, springy overshoot, soft settle.
 *
 * Rules of thumb:
 *  - Feedback that confirms input: ≤ 120 ms.
 *  - World transformations (walls, doors, reveals): 110–220 ms, Back.easeOut.
 *  - Transitions between screens: 220–320 ms, never blocking input longer.
 *  - Reduced motion: durations collapse to ≤ 60 ms and decorative motion stops.
 */
export const MOTION = {
  ui: {
    press: { ms: 60, scale: 0.94, ease: 'Quad.easeOut' },
    release: { ms: 110, ease: 'Back.easeOut' },
    panelIn: { ms: 220, ease: 'Back.easeOut' },
    panelOut: { ms: 140, ease: 'Quad.easeIn' },
    toast: { inMs: 260, holdMs: 1900, outMs: 260 },
  },
  death: { ms: 300 },
  respawn: { ms: 180, ease: 'Back.easeOut' },
  complete: { celebrateMs: 650, bannerMs: 240 },
  trap: { reveal: 110, transform: 160, ease: 'Back.easeOut' },
  scene: { fadeIn: 220, fadeOut: 160, wipe: 280 },
  chapter: { cardMs: 1700 },
} as const;

/** Collapse a duration under reduced motion. */
export function dur(ms: number, reduced: boolean): number {
  return reduced ? Math.min(ms, 60) : ms;
}
