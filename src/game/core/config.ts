/** Global game constants. All positions are in logical pixels. */
export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;
export const TILE = 30;
export const GRID_W = GAME_WIDTH / TILE; // 32
export const GRID_H = GAME_HEIGHT / TILE; // 18

export const PHYSICS = {
  gravityY: 1800,
  maxSpeed: 340,
  accel: 2600,
  decel: 3200,
  airAccel: 2100,
  jumpVelocity: -640,
  jumpCutFactor: 0.38,
  coyoteMs: 100,
  bufferMs: 130,
  maxFall: 940,
} as const;

export interface ChapterTheme {
  name: string;
  bg: number;
  bgDecor: number;
  solid: number;
  solidTop: number;
  platform: number;
  accent: number;
  ink: number;
}

/** One flat pastel identity per chapter. Hazards always #ff5a4e family. */
export const THEMES: ChapterTheme[] = [
  { name: 'Trust Nothing',    bg: 0xf4efe6, bgDecor: 0xe9e1d2, solid: 0x6b5e52, solidTop: 0x8a7b6c, platform: 0xbfb3a2, accent: 0xf2a541, ink: 0x3f372f },
  { name: 'Everything Moves', bg: 0xe8f0ee, bgDecor: 0xd8e4e0, solid: 0x4f6660, solidTop: 0x6a857d, platform: 0xa7bfb6, accent: 0xef8f3b, ink: 0x33423e },
  { name: 'The Rules Changed',bg: 0xeee9f4, bgDecor: 0xdfd7ea, solid: 0x5d5470, solidTop: 0x7a6f92, platform: 0xb2a7c9, accent: 0xf2b13f, ink: 0x3d3650 },
  { name: 'Chaos Academy',    bg: 0xf6ece8, bgDecor: 0xecddd4, solid: 0x74544a, solidTop: 0x927064, platform: 0xc4a597, accent: 0xe8a03c, ink: 0x473631 },
  { name: 'Final Betrayal',   bg: 0xe7ebf3, bgDecor: 0xd6dcea, solid: 0x4a5670, solidTop: 0x64708e, platform: 0x9ea9c4, accent: 0xf2a141, ink: 0x303850 },
];

export const COLORS = {
  hazard: 0xff5a4e,
  hazardDark: 0xc94036,
  goal: 0x58c472,
  goalDark: 0x3e9e57,
  player: 0x3d3a50,
  playerBelly: 0xf6f1e7,
  white: 0xfffaf0,
  shadow: 0x000000,
  quip: 0x3f372f,
};

export const SAVE_VERSION = 1;
export const SAVE_KEY = 'otf.save.v1';
export const SETTINGS_KEY = 'otf.settings.v1';
