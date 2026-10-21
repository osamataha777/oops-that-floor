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

export type Material = 'turf' | 'metal' | 'crystal' | 'brick' | 'slate';

export interface ChapterTheme {
  name: string;
  /** Short subtitle used on chapter cards. */
  tagline: string;
  material: Material;
  bg: number;
  skyTop: number;
  skyBottom: number;
  bgDecor: number;
  /** far / mid / near parallax silhouette colors */
  bgFar: number;
  bgMid: number;
  bgNear: number;
  solid: number;
  /** top lip of exposed ground (grass, paint, glow…) */
  solidTop: number;
  /** outline / shadow derived from solid */
  solidDark: number;
  /** second material accent (rivets, mortar, veins) */
  detail: number;
  platform: number;
  accent: number;
  ink: number;
  /** ambient particle tint */
  mote: number;
}

/** One art-directed world per chapter. Hazards always #ff5a4e family. */
export const THEMES: ChapterTheme[] = [
  {
    name: 'Trust Nothing', tagline: 'Everything is fine. Probably.', material: 'turf',
    bg: 0xfbeed3, skyTop: 0xfdf3dc, skyBottom: 0xf9dfb8, bgDecor: 0xe9d6a8,
    bgFar: 0xe3dcae, bgMid: 0xc5d39a, bgNear: 0xa9c47f,
    solid: 0x8a5d43, solidTop: 0x7dbb4f, solidDark: 0x5e3d2c, detail: 0xa7795a,
    platform: 0xd5b07e, accent: 0xf2a541, ink: 0x3f372f, mote: 0xffffff,
  },
  {
    name: 'Everything Moves', tagline: 'The level has places to be.', material: 'metal',
    bg: 0xdcefe8, skyTop: 0xe6f5ef, skyBottom: 0xc6e6db, bgDecor: 0xb6dccd,
    bgFar: 0xb2d6c8, bgMid: 0x8fbfae, bgNear: 0x6fa392,
    solid: 0x47676a, solidTop: 0xf0b847, solidDark: 0x2e4648, detail: 0x6b8d8f,
    platform: 0x9cc7b9, accent: 0xef8f3b, ink: 0x23383a, mote: 0xffffff,
  },
  {
    name: 'The Rules Changed', tagline: 'Up is more of a suggestion.', material: 'crystal',
    bg: 0xe8e0f7, skyTop: 0xf1ebfb, skyBottom: 0xd6c8f0, bgDecor: 0xd0c0ec,
    bgFar: 0xcbbbe9, bgMid: 0xb19bdc, bgNear: 0x947bc9,
    solid: 0x5b4a8a, solidTop: 0x9fe3e6, solidDark: 0x3e3166, detail: 0x7d69b0,
    platform: 0xc2b2e6, accent: 0xf2b13f, ink: 0x2f2750, mote: 0xfff4c2,
  },
  {
    name: 'Chaos Academy', tagline: 'Today\'s lesson: improvisation.', material: 'brick',
    bg: 0xf8e4d6, skyTop: 0xfbeee2, skyBottom: 0xf3cdb4, bgDecor: 0xf0cfbc,
    bgFar: 0xeec3a5, bgMid: 0xd99b7c, bgNear: 0xb9604a,
    solid: 0x9a4e3b, solidTop: 0xf2c14e, solidDark: 0x6a3127, detail: 0xc0745c,
    platform: 0xe0b08f, accent: 0xe8a03c, ink: 0x47261f, mote: 0xffe08a,
  },
  {
    name: 'Final Betrayal', tagline: 'It was the floor all along.', material: 'slate',
    bg: 0x2e3354, skyTop: 0x262a4a, skyBottom: 0x5a4d78, bgDecor: 0x3d3f66,
    bgFar: 0x434877, bgMid: 0x34375e, bgNear: 0x262848,
    solid: 0x4a4f74, solidTop: 0xff9a5a, solidDark: 0x2a2d4a, detail: 0x62678f,
    platform: 0x8f96c0, accent: 0xffb35c, ink: 0x1b1d33, mote: 0xffb27a,
  },
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
