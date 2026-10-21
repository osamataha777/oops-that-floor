import Phaser from 'phaser';
import { makeButton, makeSlider, makeToggle, panel, tinyText, dim } from './widgets';
import { TXT } from './theme';
import { services } from '../core/services';
import { VIEW } from '../core/view';
import { GAME_HEIGHT } from '../core/config';

/**
 * Shared settings panel — used from the menu and the pause overlay.
 * Emits nothing; mutates services.settings and persists.
 */
export class SettingsPanel extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, onClose: () => void, opts: { onReset?: () => void } = {}) {
    super(scene, VIEW.w / 2 - VIEW.ox, GAME_HEIGHT / 2);
    const s = services.settings;

    this.add(dim(scene));
    const W = 430;
    const H = 470;
    this.add(panel(scene, W, H));
    this.add(scene.add.text(0, -H / 2 + 32, 'Settings', TXT.h1).setOrigin(0.5));

    let y = -H / 2 + 88;
    this.add(makeSlider(scene, 0, y, 'Music', s.music / 10, (v) => { s.music = Math.round(v * 10); services.persistSettings(); }));
    y += 52;
    this.add(makeSlider(scene, 0, y, 'Effects', s.sfx / 10, (v) => { s.sfx = Math.round(v * 10); services.persistSettings(); }));
    y += 52;
    this.add(makeToggle(scene, 0, y, 'Haptics', s.haptics, (v) => { s.haptics = v; services.persistSettings(); }));
    y += 46;
    this.add(makeToggle(scene, 0, y, 'Reduced motion', s.reducedMotion, (v) => { s.reducedMotion = v; services.persistSettings(); }));
    y += 46;
    this.add(makeSlider(scene, 0, y, 'Button size', (s.controlScale - 0.8) / 0.6, (v) => { s.controlScale = 0.8 + v * 0.6; services.persistSettings(); }));
    y += 52;
    this.add(makeToggle(scene, 0, y, 'Wide controls', s.controlSpread, (v) => { s.controlSpread = v; services.persistSettings(); }));

    y += 56;
    const resetBtn = makeButton(scene, -100, y, 170, 42, 'Reset progress', { fill: 0xb8452f });
    resetBtn.on('pointerup', () => this.confirmReset(opts.onReset));
    const credBtn = makeButton(scene, 100, y, 170, 42, 'Credits', { fill: 0x6b5e52 });
    credBtn.on('pointerup', () => this.showCredits());
    this.add([resetBtn, credBtn]);

    const close = makeButton(scene, 0, H / 2 - 32, 160, 40, 'Done', { fill: 0x4a4038 });
    close.on('pointerup', onClose);
    this.add(close);

    this.add(tinyText(scene, 0, H / 2 - 62, 'No accounts. No ads. Your data stays on this device.'));
    this.setDepth(90);
    scene.add.existing(this);
  }

  private confirmReset(onReset?: () => void): void {
    const c = new Phaser.GameObjects.Container(this.scene, 0, 0);
    c.add(this.scene.add.rectangle(0, 0, 460, 470, 0xfffaf0, 0.97).setInteractive());
    c.add(this.scene.add.text(0, -80, 'Erase all progress?', TXT.h2).setOrigin(0.5));
    c.add(this.scene.add.text(0, -40, 'Every unlocked level, every death,\nevery achievement. Gone.', { ...TXT.body, align: 'center' }).setOrigin(0.5));
    const yes = makeButton(this.scene, -90, 60, 140, 44, 'Erase', { fill: 0xb8452f });
    yes.on('pointerup', () => {
      services.resetProgress();
      c.destroy();
      onReset?.();
    });
    const no = makeButton(this.scene, 90, 60, 140, 44, 'Keep it', { fill: 0x58a05c });
    no.on('pointerup', () => c.destroy());
    c.add([yes, no]);
    this.add(c);
  }

  private showCredits(): void {
    const c = new Phaser.GameObjects.Container(this.scene, 0, 0);
    c.add(this.scene.add.rectangle(0, 0, 460, 470, 0xfffaf0, 0.97).setInteractive());
    c.add(this.scene.add.text(0, -170, 'Credits & Licenses', TXT.h2).setOrigin(0.5));
    c.add(
      this.scene.add
        .text(
          0,
          -30,
          [
            'Code, art, audio & levels: original work',
            'for Oops! That Floor! (MIT).',
            '',
            'Engine: Phaser 3 (MIT)',
            'Packaging: Capacitor (MIT)',
            '',
            'All art generated procedurally at runtime.',
            'All audio synthesized at runtime.',
            'No third-party game assets included.',
          ].join('\n'),
          { ...TXT.small, align: 'center', lineSpacing: 6 },
        )
        .setOrigin(0.5),
    );
    const ok = makeButton(this.scene, 0, 160, 150, 42, 'Back', {});
    ok.on('pointerup', () => c.destroy());
    c.add(ok);
    this.add(c);
  }
}
