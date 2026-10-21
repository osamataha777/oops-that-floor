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
  /** far / mid parallax silhouette colors */
  bgFar: number;
  bgMid: number;
  solid: number;
  solidTop: number;
  /** outline / shadow derived from solid */
  solidDark: number;
  platform: number;
  accent: number;
  ink: number;
}

/** One storybook palette per chapter. Hazards always #ff5a4e family. */
export const THEMES: ChapterTheme[] = [
  { name: 'Trust Nothing',     bg: 0xf3ead9, bgDecor: 0xe7dbbe, bgFar: 0xead9bc, bgMid: 0xddc9a2, solid: 0x7d5a48, solidTop: 0xa37c5e, solidDark: 0x5c4134, platform: 0xc9b391, accent: 0xf2a541, ink: 0x3f372f },
  { name: 'Everything Moves',  bg: 0xddeee6, bgDecor: 0xc3e0d2, bgFar: 0xbfe0d0, bgMid: 0xa3cdb8, solid: 0x3f6a5e, solidTop: 0x5f9483, solidDark: 0x2c4d45, platform: 0x9fc7b5, accent: 0xef8f3b, ink: 0x2c423d },
  { name: 'The Rules Changed', bg: 0xe6ddf5, bgDecor: 0xd2c3ea, bgFar: 0xcdbde8, bgMid: 0xb3a1d6, solid: 0x5c4c80, solidTop: 0x8473ad, solidDark: 0x413660, platform: 0xbcaede, accent: 0xf2b13f, ink: 0x3a3154 },
  { name: 'Chaos Academy',     bg: 0xf7e3d9, bgDecor: 0xf0cfbc, bgFar: 0xf0c9ac, bgMid: 0xe2ad8b, solid: 0x8a4f3d, solidTop: 0xb0715a, solidDark: 0x63372b, platform: 0xd9ab8f, accent: 0xe8a03c, ink: 0x4a3128 },
  { name: 'Final Betrayal',    bg: 0xd9e1f0, bgDecor: 0xbccae3, bgFar: 0xb4c4e0, bgMid: 0x93a7cd, solid: 0x41507a, solidTop: 0x60709c, solidDark: 0x2c3a5e, platform: 0xa4b2d4, accent: 0xf2a141, ink: 0x2c3450 },
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
