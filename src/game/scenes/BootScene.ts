import Phaser from 'phaser';
import { COLORS } from '../core/config';

type G = Phaser.GameObjects.Graphics;

/** Face options for the procedural Pip texture generator. */
interface PipFace {
  eyes: 'normal' | 'up' | 'wide' | 'huge' | 'squint' | 'closed' | 'worried' | 'dizzy';
  mouth: 'smile' | 'open' | 'o' | 'big' | 'flat' | 'grin' | 'frown' | 'grit';
  feet: 'together' | 'apart' | 'cross' | 'tucked' | 'flail';
  brows?: 'none' | 'angry' | 'worried' | 'raise';
  sweat?: boolean;
  lean?: number;
  stretch?: number;
  wide?: number;
}

/**
 * Generates every texture at runtime — the game ships zero art files.
 * Pip is a 26×30 navy blob with a cream belly, expressive eyes, brows and feet.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' });
  }

  create(): void {
    const g = this.make.graphics({});

    // 1×1 physics pixel
    g.clear().fillStyle(0xffffff).fillRect(0, 0, 2, 2);
    g.generateTexture('px', 2, 2);

    // particles
    g.clear().fillStyle(0xffffff).fillCircle(4, 4, 4);
    g.generateTexture('dot', 8, 8);
    g.clear().fillStyle(0xffffff).fillTriangle(0, 10, 5, 0, 10, 10);
    g.generateTexture('tri', 10, 10);
    g.clear().fillStyle(0xffffff).fillRoundedRect(0, 0, 10, 10, 3);
    g.generateTexture('squ', 10, 10);
    // soft oval shadow used under actors/props
    g.clear().fillStyle(0xffffff).fillEllipse(14, 4, 28, 8);
    g.generateTexture('shadow', 28, 8);

    this.pip(g, 'pip-idle', { eyes: 'normal', mouth: 'smile', feet: 'together' });
    this.pip(g, 'pip-run1', { eyes: 'normal', mouth: 'open', feet: 'apart', lean: -6 });
    this.pip(g, 'pip-run2', { eyes: 'normal', mouth: 'open', feet: 'cross', lean: -6 });
    this.pip(g, 'pip-jump', { eyes: 'up', mouth: 'o', feet: 'tucked', stretch: 1.12 });
    this.pip(g, 'pip-fall', { eyes: 'wide', mouth: 'o', feet: 'flail', wide: 1.15 });
    this.pip(g, 'pip-shock', { eyes: 'huge', mouth: 'big', feet: 'together', brows: 'worried', sweat: true });
    this.pip(g, 'pip-squint', { eyes: 'squint', mouth: 'flat', feet: 'together', brows: 'angry' });
    this.pip(g, 'pip-happy', { eyes: 'closed', mouth: 'grin', feet: 'apart' });
    this.pip(g, 'pip-suspicious', { eyes: 'squint', mouth: 'flat', feet: 'apart', brows: 'raise' });
    this.pip(g, 'pip-nervous', { eyes: 'worried', mouth: 'grit', feet: 'together', brows: 'worried', sweat: true });
    this.pip(g, 'pip-defeated', { eyes: 'closed', mouth: 'frown', feet: 'together' });
    this.pip(g, 'pip-celebrate', { eyes: 'closed', mouth: 'grin', feet: 'flail', lean: -10 });
    this.pip(g, 'pip-curious', { eyes: 'wide', mouth: 'o', feet: 'apart', brows: 'raise' });
    this.pip(g, 'pip-dizzy', { eyes: 'dizzy', mouth: 'grit', feet: 'cross' });

    g.destroy();
    document.getElementById('boot-status')?.remove();
    this.scene.start('Menu');
  }

  private pip(g: G, key: string, o: PipFace): void {
    const W = 40;
    const H = 46;
    const sx = o.wide ?? 1;
    const sy = o.stretch ?? 1;
    const bw = 26 * sx;
    const bh = 30 * sy;
    const cx = W / 2 + (o.lean ? 1 : 0);
    const top = H - 6 - bh;
    const dark = 0x232040; // outline — darker shade of Pip navy

    g.clear();
    // feet (dark shoes)
    g.fillStyle(dark, 1);
    const fy = H - 5;
    if (o.feet === 'together') {
      g.fillRoundedRect(cx - 8, fy, 7, 5, 2);
      g.fillRoundedRect(cx + 1, fy, 7, 5, 2);
    } else if (o.feet === 'apart' || o.feet === 'flail') {
      g.fillRoundedRect(cx - 13, fy - (o.feet === 'flail' ? 3 : 0), 7, 5, 2);
      g.fillRoundedRect(cx + 6, fy - (o.feet === 'flail' ? 1 : 0), 7, 5, 2);
    } else if (o.feet === 'cross') {
      g.fillRoundedRect(cx - 10, fy, 7, 5, 2);
      g.fillRoundedRect(cx + 2, fy - 2, 7, 5, 2);
    } else if (o.feet === 'tucked') {
      g.fillRoundedRect(cx - 6, fy - 4, 7, 5, 2);
      g.fillRoundedRect(cx + 2, fy - 5, 7, 5, 2);
    }
    // body with outline
    g.fillStyle(dark, 1);
    g.fillRoundedRect(cx - bw / 2 - 1, top - 1, bw + 2, bh + 2, 11);
    g.fillStyle(COLORS.player, 1);
    g.fillRoundedRect(cx - bw / 2, top, bw, bh, 10);
    // top shine
    g.fillStyle(0xffffff, 0.12);
    g.fillRoundedRect(cx - bw / 2 + 3, top + 2, bw - 6, 7, { tl: 8, tr: 8, bl: 4, br: 4 });
    // belly
    g.fillStyle(COLORS.playerBelly, 1);
    g.fillRoundedRect(cx - bw / 2 + 5, top + bh * 0.45, bw - 10, bh * 0.5 - 3, 7);
    // brows (drawn first; eyes may overlap)
    const ey = top + bh * 0.3;
    const eyeDX = bw * 0.19;
    if (o.brows && o.brows !== 'none') {
      g.lineStyle(1.8, 0xfffaf0, 0.95);
      g.beginPath();
      const by = ey - 7.5;
      if (o.brows === 'angry') {
        g.moveTo(cx - eyeDX - 4.5, by - 1);
        g.lineTo(cx - eyeDX + 3, by + 1.5);
        g.moveTo(cx + eyeDX - 3, by + 1.5);
        g.lineTo(cx + eyeDX + 4.5, by - 1);
      } else if (o.brows === 'worried') {
        g.moveTo(cx - eyeDX - 4.5, by + 1.5);
        g.lineTo(cx - eyeDX + 3, by - 1);
        g.moveTo(cx + eyeDX - 3, by - 1);
        g.lineTo(cx + eyeDX + 4.5, by + 1.5);
      } else {
        g.arc(cx - eyeDX, by + 3, 4, Math.PI * 1.15, Math.PI * 1.85);
        g.arc(cx + eyeDX, by + 3, 4, Math.PI * 1.15, Math.PI * 1.85);
      }
      g.strokePath();
    }
    // eyes
    const pupilY = o.eyes === 'up' ? -1.6 : 0.4;
    if (o.eyes === 'closed') {
      g.lineStyle(2.4, 0xfffaf0, 1);
      g.beginPath();
      g.arc(cx - eyeDX, ey, 4, Math.PI * 0.1, Math.PI * 0.9);
      g.strokePath();
      g.beginPath();
      g.arc(cx + eyeDX, ey, 4, Math.PI * 0.1, Math.PI * 0.9);
      g.strokePath();
    } else if (o.eyes === 'squint') {
      g.lineStyle(2.2, 0xfffaf0, 1);
      g.beginPath();
      g.moveTo(cx - eyeDX - 3.4, ey);
      g.lineTo(cx - eyeDX + 3.4, ey + 1.4);
      g.moveTo(cx + eyeDX - 3.4, ey + 1.4);
      g.lineTo(cx + eyeDX + 3.4, ey);
      g.strokePath();
    } else if (o.eyes === 'dizzy') {
      g.lineStyle(2, 0xfffaf0, 1);
      for (const sxn of [-1, 1]) {
        const ex = cx + eyeDX * sxn;
        g.beginPath();
        g.moveTo(ex - 3, ey - 3);
        g.lineTo(ex + 3, ey + 3);
        g.moveTo(ex + 3, ey - 3);
        g.lineTo(ex - 3, ey + 3);
        g.strokePath();
      }
    } else {
      const r = o.eyes === 'huge' ? 5.6 : o.eyes === 'wide' ? 4.8 : o.eyes === 'worried' ? 4.4 : 4;
      const pr = o.eyes === 'huge' ? 1.9 : o.eyes === 'worried' ? 1.7 : 2.3;
      g.fillStyle(0xfffaf0, 1);
      g.fillCircle(cx - eyeDX, ey, r);
      g.fillCircle(cx + eyeDX, ey, r);
      g.fillStyle(0x2a2740, 1);
      g.fillCircle(cx - eyeDX, ey + pupilY, pr);
      g.fillCircle(cx + eyeDX, ey + pupilY, pr);
      // sparkle
      g.fillStyle(0xffffff, 0.9);
      g.fillCircle(cx - eyeDX - 1.2, ey - 1.4, 1);
      g.fillCircle(cx + eyeDX - 1.2, ey - 1.4, 1);
    }
    // mouth
    const my = top + bh * 0.62;
    g.fillStyle(0x2a2740, 1);
    g.lineStyle(2, 0x2a2740, 1);
    switch (o.mouth) {
      case 'smile':
        g.beginPath();
        g.arc(cx, my - 2, 4, Math.PI * 0.15, Math.PI * 0.85);
        g.strokePath();
        break;
      case 'open':
        g.fillEllipse(cx, my + 1, 7, 4);
        break;
      case 'o':
        g.fillCircle(cx, my + 1, 3.4);
        break;
      case 'big':
        g.fillEllipse(cx, my + 2, 9, 10);
        break;
      case 'flat':
        g.beginPath();
        g.moveTo(cx - 4, my + 1);
        g.lineTo(cx + 4, my + 1);
        g.strokePath();
        break;
      case 'grin':
        g.fillStyle(0xfffaf0, 1);
        g.fillRoundedRect(cx - 6, my - 1, 12, 5, 2);
        g.lineStyle(1.4, 0x2a2740, 1);
        g.strokeRoundedRect(cx - 6, my - 1, 12, 5, 2);
        break;
      case 'frown':
        g.beginPath();
        g.arc(cx, my + 5, 4, Math.PI * 1.15, Math.PI * 1.85);
        g.strokePath();
        break;
      case 'grit':
        g.lineStyle(1.6, 0xfffaf0, 0.9);
        g.beginPath();
        g.moveTo(cx - 5, my);
        g.lineTo(cx + 5, my);
        g.moveTo(cx - 4, my - 2);
        g.lineTo(cx - 4, my + 2);
        g.moveTo(cx, my - 2);
        g.lineTo(cx, my + 2);
        g.moveTo(cx + 4, my - 2);
        g.lineTo(cx + 4, my + 2);
        g.strokePath();
        break;
    }
    // sweat drop
    if (o.sweat) {
      g.fillStyle(0x8fd3ff, 1);
      g.fillEllipse(cx + bw / 2 - 1, ey - 4, 4, 7);
      g.fillStyle(0xffffff, 0.6);
      g.fillCircle(cx + bw / 2 - 1.5, ey - 6, 1);
    }
    g.generateTexture(key, W, H);
  }
}
