import Phaser from 'phaser';
import { GAME_HEIGHT, THEMES } from '../core/config';
import { TXT } from '../ui/theme';
import { iconButton, INK } from '../ui/widgets';
import { services } from '../core/services';
import { LEVELS } from '../levels/index';
import { isUnlocked, chapterCompletion } from '../../services/progress';
import { LevelDef } from '../levels/types';
import { setupCamera, logicalPointer, VIEW } from '../core/view';
import { transitionTo } from '../ui/transition';
import { MOTION } from '../anim/motion';

const HEADER = 84; // fixed title bar height
const TILE_W = 200;
const TILE_H = 66;
const GAP = 14;

/**
 * Level select: one themed band per chapter with its progress, then a 4×2
 * grid of tiles. Drag (or wheel) to scroll with inertia; a drag never
 * counts as a tap. Content is clipped below the header.
 */
export class LevelSelectScene extends Phaser.Scene {
  private content!: Phaser.GameObjects.Container;
  private minY = 0;
  private dragging = false;
  private moved = 0;
  private lastY = 0;
  private velocity = 0;

  constructor() {
    super({ key: 'Select' });
  }

  create(data: { focus?: string } = {}): void {
    const W = VIEW.w;
    const cam = setupCamera(this, false);
    cam.setBackgroundColor(0xf4ece0);
    cam.fadeIn(MOTION.scene.fadeIn);
    services.audio.setChapterRoot('menu');

    // header
    const hg = this.add.graphics().setDepth(20);
    hg.fillStyle(0xf4ece0, 1).fillRect(0, 0, W, HEADER);
    hg.fillStyle(0x000000, 0.06).fillRect(0, HEADER - 4, W, 4);
    this.add.text(W / 2, 40, 'Pick Your Poison', { ...TXT.h1, fontSize: '32px' }).setOrigin(0.5).setDepth(21);
    const done = LEVELS.filter((l) => services.save.levels[l.id]?.completed).length;
    this.add.text(W - 24, 40, `${done}/${LEVELS.length} ★`, { ...TXT.h2, fontSize: '20px' }).setOrigin(1, 0.5).setDepth(21);
    iconButton(this, 40, 40, 'back', () => this.back()).setDepth(22);
    this.input.keyboard?.on('keydown-ESC', () => this.back());

    this.content = this.add.container(0, HEADER);
    const maskG = this.make.graphics({}, false);
    maskG.fillStyle(0xffffff).fillRect(0, HEADER, W, GAME_HEIGHT - HEADER);
    this.content.setMask(maskG.createGeometryMask());

    const gridW = TILE_W * 4 + GAP * 3;
    const left = (W - gridW) / 2;
    let y = 18;
    let focusY = 0;
    for (let ch = 1; ch <= 5; ch++) {
      const theme = THEMES[ch - 1];
      const levels = LEVELS.filter((l) => l.chapter === ch);
      const comp = chapterCompletion(services.save, levels.map((l) => l.id));
      const firstIdx = LEVELS.indexOf(levels[0]);
      const chapterOpen = isUnlocked(services.save, firstIdx);

      // chapter band
      const band = this.add.graphics();
      band.fillStyle(INK, 1).fillRoundedRect(left - 3, y - 3, gridW + 6, 62, 18);
      band.fillStyle(theme.solid, 1).fillRoundedRect(left, y, gridW, 56, 16);
      band.fillStyle(theme.solidTop, 1).fillRoundedRect(left, y, gridW, 9, { tl: 16, tr: 16, bl: 0, br: 0 });
      // progress bar
      const pw = 160;
      band.fillStyle(0x000000, 0.25).fillRoundedRect(left + gridW - pw - 18, y + 30, pw, 10, 5);
      band.fillStyle(0xfffaf0, 1).fillRoundedRect(left + gridW - pw - 18, y + 30, Math.max(10, (pw * comp.done) / comp.total), 10, 5);
      this.content.add(band);
      this.content.add(this.add.text(left + 18, y + 20, `${ch}  ${theme.name}`, { ...TXT.light, fontSize: '20px', stroke: '#2c2622', strokeThickness: 4 }).setOrigin(0, 0.5));
      this.content.add(this.add.text(left + 18, y + 41, chapterOpen ? theme.tagline : 'Locked — finish the previous chapter', { ...TXT.chip, fontSize: '12px' }).setOrigin(0, 0.5).setAlpha(0.9));
      this.content.add(this.add.text(left + gridW - 18, y + 18, `${comp.done}/${comp.total}`, { ...TXT.light, fontSize: '15px' }).setOrigin(1, 0.5));
      y += 72;

      for (let i = 0; i < 8; i++) {
        const lvl = levels[i];
        const col = i % 4;
        const row = Math.floor(i / 4);
        const tx = left + col * (TILE_W + GAP) + TILE_W / 2;
        const ty = y + row * (TILE_H + GAP) + TILE_H / 2;
        this.content.add(this.levelTile(tx, ty, lvl, theme));
        if (data.focus === lvl.id) focusY = ty;
      }
      y += 2 * (TILE_H + GAP) + 18;
    }
    this.minY = Math.min(HEADER, GAME_HEIGHT - y - 10);
    if (focusY) this.content.y = Phaser.Math.Clamp(HEADER + (GAME_HEIGHT - HEADER) / 2 - focusY, this.minY, HEADER);
    else {
      // otherwise start at the chapter of your next level
      const nextIdx = Math.min(services.save.unlockedThrough, LEVELS.length - 1);
      const nextCh = LEVELS[nextIdx].chapter;
      this.content.y = Phaser.Math.Clamp(HEADER - (nextCh - 1) * (72 + 2 * (TILE_H + GAP) + 18), this.minY, HEADER);
    }

    // drag scrolling with inertia
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (logicalPointer(p).y < HEADER) return;
      this.dragging = true;
      this.moved = 0;
      this.lastY = logicalPointer(p).y;
      this.velocity = 0;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.dragging || !p.isDown) return;
      const ly = logicalPointer(p).y;
      const dy = ly - this.lastY;
      this.lastY = ly;
      this.moved += Math.abs(dy);
      this.velocity = dy;
      this.scrollBy(dy);
    });
    const end = () => (this.dragging = false);
    this.input.on('pointerup', end);
    this.input.on('pointerupoutside', end);
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      this.velocity = 0;
      this.scrollBy(-dy * 0.6);
    });
    this.events.on(Phaser.Scenes.Events.UPDATE, () => {
      if (this.dragging || Math.abs(this.velocity) < 0.2) return;
      this.velocity *= 0.92;
      this.scrollBy(this.velocity);
    });
  }

  private scrollBy(dy: number): void {
    this.content.y = Phaser.Math.Clamp(this.content.y + dy, this.minY, HEADER);
  }

  private back(): void {
    transitionTo(this, () => this.scene.start('Menu'));
  }

  private levelTile(x: number, y: number, lvl: LevelDef, theme: (typeof THEMES)[number]): Phaser.GameObjects.Container {
    const idx = LEVELS.indexOf(lvl);
    const unlocked = isUnlocked(services.save, idx);
    const rec = services.save.levels[lvl.id];
    const cleared = !!rec?.completed;
    const isNext = unlocked && !cleared;
    const c = this.add.container(x, y);
    const w = TILE_W;
    const h = TILE_H;
    const g = this.add.graphics();
    const fill = !unlocked ? 0xd9d0c0 : cleared ? theme.solid : 0xfffaf0;
    g.fillStyle(INK, unlocked ? 1 : 0.35).fillRoundedRect(-w / 2 - 2.5, -h / 2 - 2.5, w + 5, h + 9, 16);
    g.fillStyle(fill, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    if (isNext) g.fillStyle(theme.accent, 1).fillRoundedRect(-w / 2, -h / 2, 8, h, { tl: 14, bl: 14, tr: 0, br: 0 });
    c.add(g);
    // level number medallion
    const mx = -w / 2 + 34;
    const mg = this.add.graphics();
    mg.fillStyle(unlocked ? (cleared ? 0xfffaf0 : theme.solid) : 0xb9b0a1, 1).fillCircle(mx, 0, 20);
    c.add(mg);
    c.add(this.add.text(mx, 0, unlocked ? lvl.id : '🔒', { ...TXT.h2, fontSize: unlocked ? '15px' : '16px', color: unlocked ? (cleared ? '#2c2622' : '#fffaf0') : '#7a6f62' }).setOrigin(0.5));
    const nameColor = !unlocked ? '#8a8073' : cleared ? '#fffaf0' : '#3f372f';
    c.add(this.add.text(mx + 30, -9, unlocked ? lvl.name : '???', { ...TXT.h2, fontSize: '15px', color: nameColor, wordWrap: { width: w - 80 } }).setOrigin(0, 0.5));
    const sub = !unlocked ? 'locked' : cleared ? `${rec.firstTry ? '★ first try' : `best: ${rec.bestAttempts} tries`}` : isNext ? 'next up ▶' : 'not cleared';
    c.add(this.add.text(mx + 30, 13, sub, { ...TXT.small, fontSize: '12px', color: cleared ? '#fff4d6' : '#7a6f62' }).setOrigin(0, 0.5));
    if (unlocked) {
      c.setSize(w, h).setInteractive({ useHandCursor: true });
      c.on('pointerdown', () => c.setScale(0.96));
      c.on('pointerout', () => c.setScale(1));
      c.on('pointerup', (p: Phaser.Input.Pointer) => {
        c.setScale(1);
        if (this.moved > 8) return; // it was a drag
        if (logicalPointer(p).y < HEADER) return; // clipped under the title bar
        services.audio.unlock();
        services.fx('ui.tap');
        transitionTo(this, () => this.scene.start('Game', { index: idx }));
      });
    }
    return c;
  }
}
