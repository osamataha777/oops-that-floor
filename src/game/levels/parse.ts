import { GRID_W, GRID_H, TILE } from '../core/config';
import { LevelDef, ParsedLevel, Rect, Vec2 } from './types';

const isMarker = (ch: string) => ch >= 'a' && ch <= 'z';

/** Merge a row of cells into horizontal runs → fewer physics bodies. */
function runs(row: number, cols: number[]): Rect[] {
  if (!cols.length) return [];
  const out: Rect[] = [];
  let start = cols[0];
  let prev = cols[0];
  for (let i = 1; i <= cols.length; i++) {
    if (i === cols.length || cols[i] !== prev + 1) {
      out.push({ x: start * TILE, y: row * TILE, w: (prev - start + 1) * TILE, h: TILE });
      start = cols[i];
      prev = cols[i];
    } else {
      prev = cols[i];
    }
  }
  return out;
}

/**
 * Parse an ASCII level map into pixel-space geometry.
 * Cell (0,0) is top-left. Throws on malformed input — callers in level
 * modules rely on the validator for friendly error messages.
 */
export function parseLevel(def: LevelDef): ParsedLevel {
  const width = (def.widthCells ?? GRID_W) * TILE;
  const height = GRID_H * TILE;
  const rows = def.map;
  if (rows.length !== GRID_H) throw new Error(`${def.id}: map must have ${GRID_H} rows, got ${rows.length}`);
  for (let r = 0; r < rows.length; r++) {
    if (rows[r].length !== GRID_W && (def.widthCells ?? GRID_W) !== rows[r].length)
      throw new Error(`${def.id}: row ${r} has ${rows[r].length} cols, expected ${def.widthCells ?? GRID_W}`);
  }

  const solidCols: number[][] = Array.from({ length: rows.length }, () => []);
  const platCols: number[][] = Array.from({ length: rows.length }, () => []);
  const spikeCols: number[][] = Array.from({ length: rows.length }, () => []);
  const ghostCols: number[][] = Array.from({ length: rows.length }, () => []);
  const decorCols: number[][] = Array.from({ length: rows.length }, () => []);
  const markers = new Map<string, Rect[]>();
  let spawn: Vec2 | null = null;
  let goal: Rect | null = null;

  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      const ch = rows[r][c];
      const rect: Rect = { x: c * TILE, y: r * TILE, w: TILE, h: TILE };
      switch (ch) {
        case '#': solidCols[r].push(c); break;
        case '=': platCols[r].push(c); break;
        case 'X': spikeCols[r].push(c); break;
        case '~': ghostCols[r].push(c); break;
        case '^': decorCols[r].push(c); break;
        case '@': spawn = { x: rect.x + TILE / 2, y: rect.y + TILE / 2 }; break;
        case 'G': goal = { x: rect.x + 2, y: rect.y - TILE + 2, w: TILE + 22, h: TILE * 2 - 4 }; break;
        case '.': break;
        default:
          if (isMarker(ch)) {
            if (!markers.has(ch)) markers.set(ch, []);
            markers.get(ch)!.push(rect);
          }
          break;
      }
    }
  }

  if (!spawn) throw new Error(`${def.id}: missing spawn '@'`);
  if (!goal) throw new Error(`${def.id}: missing goal 'G'`);

  const flatten = (cols: number[][]): Rect[] =>
    cols.flatMap((rowCols, r) => runs(r, rowCols));

  // Spike strips: kill zone is the top 12 px of each spike cell.
  const spikeRects = flatten(spikeCols).map((r) => ({ x: r.x + 3, y: r.y + 2, w: r.w - 6, h: 12 }));

  return {
    def,
    width,
    height,
    solids: flatten(solidCols),
    platforms: flatten(platCols),
    spikes: spikeRects,
    ghosts: flatten(ghostCols),
    decor: flatten(decorCols),
    spawn,
    goal,
    markers,
  };
}

/** Marker letters present in a map. */
export function markerLetters(def: LevelDef): Set<string> {
  const s = new Set<string>();
  for (const row of def.map) for (const ch of row) if (isMarker(ch)) s.add(ch);
  return s;
}
