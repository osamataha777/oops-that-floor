import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './config';

/**
 * Render resolution. The game is authored in a 960×540 logical space, but the
 * canvas is allocated at `res`× so phones with 2–3× pixel density get crisp
 * vector art and text instead of an upscaled blur. Every scene camera zooms
 * by `res` from its top-left, so world/logical coordinates are unchanged.
 */
export const VIEW = {
  res: 1,
  /** Logical width of the visible screen (≥960). Wide phones see more sides. */
  w: GAME_WIDTH,
  h: GAME_HEIGHT,
  /** Left margin between the screen edge and the 960-wide level area. */
  get ox(): number {
    return (this.w - GAME_WIDTH) / 2;
  },
};

/** Texture supersampling for generated sprites (Pip, particles). */
export const TEX = 3;

/**
 * Pick the logical view width and backing resolution for this device (call
 * once before boot). Height is fixed at 540 logical px; wider-than-16:9
 * screens (most phones) get extra margin left and right instead of black
 * letterbox bars — the touch controls live there, off the level.
 */
export function chooseResolution(): number {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const aspect = window.innerWidth / Math.max(1, window.innerHeight);
  VIEW.w = Math.round(Math.min(1280, Math.max(GAME_WIDTH, GAME_HEIGHT * aspect)) / 2) * 2;
  const cssScale = Math.min(window.innerWidth / VIEW.w, window.innerHeight / GAME_HEIGHT);
  const ideal = cssScale * dpr;
  // Cap at 2.5×: beyond that fill-rate cost outruns visible gain on mid-range GPUs.
  const res = Math.min(2.5, Math.max(1, Math.round(ideal * 4) / 4));
  VIEW.res = res;
  return res;
}

/**
 * Zoom a scene's main camera to the backing resolution. With `centerLevel`
 * the 960-wide level is centred in the (possibly wider) view: world x=0 sits
 * `VIEW.ox` logical px from the left edge. Scroll-factor-0 objects (HUD,
 * touch controls) use plain view coordinates 0..VIEW.w.
 */
export function setupCamera(scene: Phaser.Scene, centerLevel = true): Phaser.Cameras.Scene2D.Camera {
  const cam = scene.cameras.main;
  cam.setOrigin(0, 0);
  cam.setZoom(VIEW.res);
  cam.setScroll(centerLevel ? -VIEW.ox : 0, 0);
  return cam;
}

/** Pointer position in logical (960×540) coordinates. */
export function logicalPointer(p: Phaser.Input.Pointer): { x: number; y: number } {
  return { x: p.x / VIEW.res, y: p.y / VIEW.res };
}

/**
 * Make every `scene.add.text` render its glyph canvas at the backing
 * resolution so text stays sharp when the camera zooms.
 */
export function installCrispText(): void {
  const proto = Phaser.GameObjects.GameObjectFactory.prototype as unknown as {
    text: (x: number, y: number, t: string | string[], s?: Phaser.Types.GameObjects.Text.TextStyle) => Phaser.GameObjects.Text;
    __crisp?: boolean;
  };
  if (proto.__crisp) return;
  proto.__crisp = true;
  const orig = proto.text;
  proto.text = function (x, y, t, s) {
    return orig.call(this, x, y, t, { resolution: Math.max(1, Math.ceil(VIEW.res)), ...s });
  };
}
