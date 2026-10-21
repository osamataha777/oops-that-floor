import { GRID_W, GRID_H, TILE } from '../core/config';

/** Every trap type the runtime knows how to build. */
export const TRAP_TYPES = [
  'collapse',   // solid cells that shake then drop away
  'spikes',     // hidden spikes that pop up
  'fallblock',  // block that drops when triggered, then rests as ground
  'wall',       // wall that rises into existence
  'mover',      // platform that travels to a target
  'fakegoal',   // a door that isn't a door
  'shygoal',    // exit that flees when approached
  'spinner',    // rotating spiked arm
  'conveyor',   // surface with horizontal carry velocity
  'gravflip',   // zone that flips gravity
  'plate',      // pressure plate that fires an event
  'timed',      // platform that vanishes on a fuse after arming
  'ghost',      // floor that was never there
  'crusher',    // ceiling block that slams down and returns
  'spring',     // bounce pad that launches the player
] as const;
export type TrapType = (typeof TRAP_TYPES)[number];

/** Static map characters. Lowercase a-z are dynamic trap markers. */
export const STATIC_CELLS = '#=X@G~.^' as const;

export interface Rect {
  x: number; y: number; w: number; h: number;
}
export interface Vec2 {
  x: number; y: number;
}

/** Trigger conditions. `area` values are marker letters or cell rects. */
export type TriggerDef =
  | { event: 'always'; delay?: number }
  | { event: 'enter-area'; area: string; delay?: number }
  | { event: 'proximity'; distance?: number; delay?: number }
  | { event: 'jump'; delay?: number }
  | { event: 'land'; delay?: number }
  | { event: 'touch'; delay?: number }
  | { event: 'press'; ref: string; delay?: number }
  | { event: 'trap-complete'; ref: string; delay?: number }
  | { event: 'attempt-gte'; n: number; delay?: number }
  | { event: 'attempt-eq'; n: number; delay?: number }
  | { event: 'timer'; after: number; delay?: number };

export interface TrapDef {
  id: string;
  type: TrapType;
  /** Marker letter whose cells form this trap's body, or '@'/'G'. */
  at: string;
  /** Optional second marker (mover destination, fallblock trigger zone, shygoal hops). */
  to?: string;
  trigger: TriggerDef;
  /** Per-type tuning. All optional with sane defaults. */
  params?: {
    speed?: number;        // px/s for movers/crushers, deg/s for spinner
    dir?: 1 | -1;
    delay?: number;        // ms, generic
    fuse?: number;         // ms before timed/collapse fires
    off?: number;          // ms a timed platform stays gone
    period?: number;       // ms for periodic modes
    phase?: number;        // ms phase offset for periodic modes
    len?: number;          // spinner arm length in tiles
    hops?: number;         // shygoal: max flee hops
    duration?: number;     // gravflip ms (0 = permanent until reset)
    fake?: boolean;
    tell?: 'crack' | 'wobble' | 'none';   // Suspicious-World hint styling
    disguise?: 'solid' | 'crack';
    cycle?: boolean;       // repeat forever
    hold?: number;         // spikes: ms held out / plate hold
    safe?: boolean;        // world-remembers: skip this trap on given attempts
  };
}

export interface LevelDef {
  id: string;          // "1-3"
  chapter: number;     // 1..5
  index: number;       // 1..8 within chapter
  name: string;
  quip?: string;       // first-visit flavour line
  tip?: string;        // shown under the level name on attempt 4+
  widthCells?: number; // default GRID_W; >32 enables camera follow
  map: string[];       // GRID_H rows of map chars
  traps: TrapDef[];
}

/** A static spike run: `x,y,w,h` is the kill zone; `cell` the map cells it occupies. */
export interface SpikeStrip extends Rect {
  dir: 'up' | 'down';
  cell: Rect;
}

/** Parsed level: everything resolved to pixel rects. */
export interface ParsedLevel {
  def: LevelDef;
  width: number;
  height: number;
  solids: Rect[];            // '#'
  platforms: Rect[];         // '='
  spikes: SpikeStrip[];      // 'X' kill strips
  ghosts: Rect[];            // '~'
  decor: Rect[];             // '^' bumps/hills — visual only
  spawn: Vec2;
  goal: Rect;
  markers: Map<string, Rect[]>; // a-z → pixel rects per cell
}

export const CELL_SIZE = TILE;
export const GRID = { w: GRID_W, h: GRID_H };
