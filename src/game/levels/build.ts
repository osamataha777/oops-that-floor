import { GRID_W, GRID_H } from '../core/config';

/**
 * Authoring helper: write only the meaningful part of each row; rows are
 * right-padded with '.' to the level width, and missing rows at the top
 * are filled with empty air. Overlong rows throw immediately.
 *
 *   map: rows(
 *     '..@.......G',
 *     '###########',
 *   )   → bottom-aligned 18-row map
 */
export function rows(...lines: string[]): string[] {
  if (lines.length > GRID_H) throw new Error(`map has ${lines.length} rows (max ${GRID_H})`);
  const out = lines.map((l, i) => {
    if (l.length > GRID_W) throw new Error(`row ${i} is ${l.length} wide (max ${GRID_W}): '${l}'`);
    return l.padEnd(GRID_W, '.');
  });
  while (out.length < GRID_H) out.unshift('.'.repeat(GRID_W));
  return out;
}

/** A full-width row of one character. */
export const full = (ch = '#') => ch.repeat(GRID_W);
