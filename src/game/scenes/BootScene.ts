import Phaser from 'phaser';
import { TEX } from '../core/view';
import { PIP } from '../entities/pipArt';

type G = Phaser.GameObjects.Graphics;

/**
 * Generates every texture at runtime — the game ships zero art files.
 * Textures are painted at TEX× (supersampled) and displayed at 1/TEX scale,
 * so they stay crisp at any device pixel ratio the view uses.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' });
  }

  create(): void {
    const g = this.make.graphics({});
    const paint = (key: string, w: number, h: number, draw: (g: G) => void) => {
      g.clear();
      g.setScale(TEX);
      draw(g);
      g.generateTexture(key, Math.ceil(w * TEX), Math.ceil(h * TEX));
    };

    // 2×2 physics pixel (bodies only — never drawn)
    g.setScale(1);
    g.clear().fillStyle(0xffffff).fillRect(0, 0, 2, 2);
    g.generateTexture('px', 2, 2);

    // particles (white, tinted at emit time)
    paint('dot', 8, 8, (g) => g.fillStyle(0xffffff).fillCircle(4, 4, 4));
    paint('tri', 10, 10, (g) => g.fillStyle(0xffffff).fillTriangle(0, 10, 5, 0, 10, 10));
    paint('squ', 10, 10, (g) => g.fillStyle(0xffffff).fillRoundedRect(0, 0, 10, 10, 3));
    paint('streak', 12, 3, (g) => g.fillStyle(0xffffff).fillRoundedRect(0, 0, 12, 3, 1.5));
    paint('shadow', 28, 8, (g) => g.fillStyle(0xffffff).fillEllipse(14, 4, 28, 8));
    paint('star', 12, 12, (g) => {
      g.fillStyle(0xffffff);
      const pts: Phaser.Types.Math.Vector2Like[] = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 2.4 : 6;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        pts.push({ x: 6 + Math.cos(a) * r, y: 6 + Math.sin(a) * r });
      }
      g.fillPoints(pts, true);
    });

    for (const [key, part] of Object.entries(PIP.parts)) paint(key, part.w, part.h, part.draw);

    g.destroy();
    document.getElementById('boot-status')?.remove();
    this.scene.start('Menu');
  }
}
