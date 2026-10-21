import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, THEMES } from '../core/config';
import { TXT, hex } from '../ui/theme';
import { makeButton, tinyText } from '../ui/widgets';
import { services } from '../core/services';
import { LEVELS } from '../levels/index';
import { isUnlocked, chapterCompletion } from '../../services/progress';
import { LevelDef } from '../levels/types';
import { setupCamera, logicalPointer } from '../core/view';

export class LevelSelectScene extends Phaser.Scene {
  private scrollY = 0;
  private content!: Phaser.GameObjects.Container;
  private dragging = false;
  private dragStartY = 0;
  private contentStartY = 0;
  private minY = 0;

  constructor() {
    super({ key: 'Select' });
  }

  create(): void {
    setupCamera(this);
    this.cameras.main.setBackgroundColor(0xf4efe6);
    this.cameras.main.fadeIn(180);
    this.add.text(GAME_WIDTH / 2, 44, 'Pick Your Poison', TXT.h1).setOrigin(0.5);
    const back = makeButton(this, 60, 44, 96, 40, '← Menu', { fill: 0x6b5e52 });
    back.on('pointerup', () => {
      services.audio.sfx('back');
      this.scene.start('Menu');
    });

    this.content = this.add.container(0, 90);
    // scroll mask — cards must not draw over the header/back button
    const maskG = this.make.graphics({});
    maskG.fillStyle(0xffffff).fillRect(0, 88, GAME_WIDTH, GAME_HEIGHT - 88);
    this.content.setMask(maskG.createGeometryMask());

    let y = 0;
    for (let ch = 0; ch < 5; ch++) {
      const theme = THEMES[ch];
      const levels = LEVELS.filter((l) => l.chapter === ch + 1);
      const comp = chapterCompletion(services.save, levels.map((l) => l.id));
      const hdr = this.add.container(GAME_WIDTH / 2, y + 26);
      const hg = this.add.graphics();
      hg.fillStyle(theme.solidDark, 0.35).fillRoundedRect(-328, -20, 660, 44, 12);
      hg.fillStyle(theme.solid, 1).fillRoundedRect(-330, -22, 660, 44, 12);
      hg.fillStyle(theme.solidTop, 0.9).fillRoundedRect(-330, -22, 660, 8, { tl: 12, tr: 12, bl: 0, br: 0 });
      hdr.add(hg);
      hdr.add(this.add.text(-310, 0, `Chapter ${ch + 1} — ${theme.name}`, { ...TXT.light, fontSize: '19px' }).setOrigin(0, 0.5));
      const stars = '★'.repeat(comp.done) + '☆'.repeat(comp.total - comp.done);
      hdr.add(this.add.text(310, 0, stars, { ...TXT.light, fontSize: '13px' }).setOrigin(1, 0.5));
      this.content.add(hdr);
      y += 66;
      for (let i = 0; i < 8; i++) {
        const lvl = levels[i];
        const col = i % 4;
        const row = Math.floor(i / 4);
        this.content.add(this.levelButton(190 + col * 193, y + row * 74 + 36, lvl, theme));
      }
      y += 168;
    }
    this.minY = Math.min(0, GAME_HEIGHT - 100 - (90 + y) + 200);

    // scroll (drag + wheel)
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.dragging = true;
      this.dragStartY = logicalPointer(p).y;
      this.contentStartY = this.content.y;
    });
    this.input.on('pointerup', () => (this.dragging = false));
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.dragging || !p.isDown) return;
      this.content.y = Phaser.Math.Clamp(this.contentStartY + (logicalPointer(p).y - this.dragStartY), this.minY + 90, 90);
    });
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      this.content.y = Phaser.Math.Clamp(this.content.y - dy * 0.6, this.minY + 90, 90);
    });
  }

  private levelButton(x: number, y: number, lvl: LevelDef, theme: (typeof THEMES)[number]): Phaser.GameObjects.Container {
    const idx = LEVELS.indexOf(lvl);
    const unlocked = isUnlocked(services.save, idx);
    const rec = services.save.levels[lvl.id];
    const c = this.add.container(x, y);
    const w = 174;
    const h = 62;
    const g = this.add.graphics();
    const fill = unlocked ? (rec?.completed ? 0x58a05c : 0xfffaf0) : 0xd9d0c0;
    g.fillStyle(0x000000, unlocked ? 0.12 : 0.05).fillRoundedRect(-w / 2 + 3, -h / 2 + 4, w, h, 14);
    g.fillStyle(fill, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    if (unlocked && !rec?.completed) {
      // chapter accent edge on unlocked-but-uncleared cards
      g.fillStyle(theme.accent, 0.9).fillRoundedRect(-w / 2, -h / 2, 6, h, { tl: 14, tr: 0, bl: 14, br: 0 });
    }
    c.add(g);
    const label = unlocked ? `${lvl.id}  ${rec?.completed ? '✓' : ''}` : `${lvl.id}  🔒`;
    c.add(this.add.text(0, -12, label, { ...TXT.h2, fontSize: '17px', color: unlocked ? (rec?.completed ? '#fffaf0' : '#3f372f') : '#8a8073' }).setOrigin(0.5));
    const sub = unlocked
      ? rec?.completed && rec.bestAttempts
        ? `${lvl.name} · best ${rec.bestAttempts}`
        : lvl.name
      : 'finish previous';
    c.add(this.add.text(0, 14, sub, { ...TXT.small, fontSize: '12px', color: unlocked ? (rec?.completed ? '#e8f5e9' : '#7a6f62') : '#9a9083' }).setOrigin(0.5));
    if (unlocked) {
      c.setSize(w, h).setInteractive({ useHandCursor: true });
      c.on('pointerup', () => {
        if (Math.abs(this.content.y - this.contentStartY) > 6) return; // was a drag
        services.audio.unlock();
        services.audio.sfx('click');
        this.scene.start('Game', { index: idx });
      });
      c.on('pointerdown', () => this.tweens.add({ targets: c, scale: 0.95, duration: 50 }));
      c.on('pointerout', () => c.setScale(1));
    }
    return c;
  }
}
