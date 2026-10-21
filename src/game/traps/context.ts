import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { ChapterTheme } from '../core/config';
import { ParsedLevel, Rect } from '../levels/types';
import { SFX } from '../audio/synth';

export type DeathCause =
  | 'spikes' | 'crush' | 'fall' | 'void' | 'hazard' | 'squash';

/** Services handed to every trap instance. */
export interface TrapContext {
  scene: Phaser.Scene;
  player: Player;
  /** Group of Arcade static bodies the player collides with. */
  solids: Phaser.Physics.Arcade.StaticGroup;
  attempt: number;
  theme: ChapterTheme;
  parsed: ParsedLevel;
  bus: Phaser.Events.EventEmitter;
  reduceMotion: boolean;
  kill(cause: DeathCause): void;
  sfx(name: keyof typeof SFX): void;
  haptic(kind: 'light' | 'medium' | 'heavy'): void;
  /** Move the level goal (used by shygoal). */
  moveGoal(x: number, y: number): void;
  /** Float a short sarcastic line at a world position. */
  quip(text: string, x: number, y: number): void;
  /** Dynamic (non-static) collidable group — movers, blocks, walls. */
  dynamics: Phaser.Physics.Arcade.Group;
}

export function cellsRect(cells: Rect[]): Rect {
  const x = Math.min(...cells.map((c) => c.x));
  const y = Math.min(...cells.map((c) => c.y));
  return {
    x,
    y,
    w: Math.max(...cells.map((c) => c.x + c.w)) - x,
    h: Math.max(...cells.map((c) => c.y + c.h)) - y,
  };
}

export function rectCenter(r: Rect): { x: number; y: number } {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

export function overlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function playerRect(p: Player): Rect {
  const b = p.body as Phaser.Physics.Arcade.Body;
  return { x: b.x, y: b.y, w: b.width, h: b.height };
}
