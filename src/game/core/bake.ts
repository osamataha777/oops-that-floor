import Phaser from 'phaser';
import { VIEW } from './view';

/** Max supersampling for baked layers (memory guard: 2× of 1280×540 ≈ 11 MB). */
const MAX_BAKE_RES = 2;

/**
 * Draw once with Graphics, keep forever as a single texture quad. Static
 * scenery (ground, backdrops) is baked so the GPU draws one image instead
 * of re-tessellating hundreds of rounded shapes every frame.
 * Returns an Image positioned at (x, y) in the scene's current space.
 */
export function bakeImage(
  scene: Phaser.Scene,
  key: string,
  x: number,
  y: number,
  w: number,
  h: number,
  draw: (g: Phaser.GameObjects.Graphics) => void,
  opts: { reuse?: boolean } = {},
): Phaser.GameObjects.Image {
  const res = Math.min(MAX_BAKE_RES, VIEW.res);
  const tm = scene.textures;
  if (!(opts.reuse && tm.exists(key))) {
    if (tm.exists(key)) tm.remove(key);
    const g = scene.make.graphics({}, false);
    g.setScale(res);
    draw(g);
    const dt = tm.addDynamicTexture(key, Math.ceil(w * res), Math.ceil(h * res));
    if (dt) {
      dt.draw(g, 0, 0);
      g.destroy();
    } else {
      // Canvas renderer fallback
      g.generateTexture(key, Math.ceil(w * res), Math.ceil(h * res));
      g.destroy();
    }
  }
  return scene.add.image(x, y, key).setOrigin(0, 0).setScale(1 / res);
}
