import Phaser from 'phaser';
import { makeButton, makeSlider, makeToggle, panel, tinyText, dim, iconButton, toast } from './widgets';
import { TXT } from './theme';
import { services } from '../core/services';
import { VIEW } from '../core/view';
import { GAME_HEIGHT } from '../core/config';

/**
 * Shared settings panel — used from the menu and the pause overlay.
 * Two columns: sound & feel | comfort & controls. Every option here is real
 * and takes effect immediately (controls apply on the next level start).
 */
export class SettingsPanel extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, onClose: () => void, opts: { onReset?: () => void } = {}) {
    super(scene, VIEW.w / 2 - VIEW.ox, GAME_HEIGHT / 2);
    const s = services.settings;
    const save = () => services.persistSettings();

    this.add(dim(scene));
    const W = Math.min(800, VIEW.w - 40);
    const H = 470;
    this.add(panel(scene, W, H));
    this.add(scene.add.text(0, -H / 2 + 34, 'Settings', TXT.h1).setOrigin(0.5));
    this.add(iconButton(scene, W / 2 - 34, -H / 2 + 34, 'close', onClose, 40));

    const colW = W / 2 - 40;
    const lx = -W / 4 + 4;
    const rx = W / 4 - 4;
    const head = (x: number, y: number, t: string) => this.add(scene.add.text(x - colW / 2, y, t.toUpperCase(), { ...TXT.small, fontSize: '12px', fontStyle: '800', color: '#a08d78' }).setOrigin(0, 0.5));

    let y = -H / 2 + 82;
    head(lx, y, 'Sound & feel');
    y += 30;
    this.add(makeSlider(scene, lx, y, 'Music', s.music / 10, (v) => { s.music = Math.round(v * 10); save(); }, colW));
    y += 48;
    this.add(makeSlider(scene, lx, y, 'Effects', s.sfx / 10, (v) => { s.sfx = Math.round(v * 10); save(); services.fx('ui.toggle'); }, colW));
    y += 48;
    this.add(makeToggle(scene, lx, y, 'Haptics', s.haptics, (v) => { s.haptics = v; save(); if (v) services.fx('ui.tap'); }, colW));
    y += 46;
    this.add(makeToggle(scene, lx, y, 'Screen shake', s.shake, (v) => { s.shake = v; save(); }, colW));
    y += 46;
    this.add(makeToggle(scene, lx, y, 'Reduced motion', s.reducedMotion, (v) => { s.reducedMotion = v; save(); }, colW));

    y = -H / 2 + 82;
    head(rx, y, 'Comfort & controls');
    y += 30;
    this.add(makeToggle(scene, rx, y, 'Gentle mode', s.gentle, (v) => { s.gentle = v; save(); }, colW));
    y += 46;
    this.add(makeToggle(scene, rx, y, 'High-contrast hazards', s.highContrast, (v) => { s.highContrast = v; save(); }, colW));
    y += 48;
    this.add(makeSlider(scene, rx, y, 'Button size', (s.controlScale - 0.8) / 0.6, (v) => { s.controlScale = 0.8 + v * 0.6; save(); }, colW, 6));
    y += 48;
    this.add(makeSlider(scene, rx, y, 'Button opacity', (s.controlOpacity - 0.3) / 0.7, (v) => { s.controlOpacity = 0.3 + v * 0.7; save(); }, colW, 7));
    y += 46;
    this.add(makeToggle(scene, rx, y, 'Wide button spacing', s.controlSpread, (v) => { s.controlSpread = v; save(); }, colW));

    const by = H / 2 - 54;
    const resetBtn = makeButton(scene, -W / 4 + 4, by, 190, 44, 'Reset progress', { fill: 0xb8452f });
    resetBtn.on('pointerup', () => this.confirmReset(opts.onReset));
    const credBtn = makeButton(scene, W / 4 - 4, by, 190, 44, 'Credits', { fill: 0x6b5e52 });
    credBtn.on('pointerup', () => this.showCredits());
    this.add([resetBtn, credBtn]);
    this.add(tinyText(scene, 0, H / 2 - 18, 'No accounts · no ads · no tracking. Your progress stays on this device.'));

    this.setDepth(90);
    scene.add.existing(this);
  }

  private sheet(): Phaser.GameObjects.Container {
    const c = new Phaser.GameObjects.Container(this.scene, 0, 0);
    c.add(this.scene.add.rectangle(0, 0, Math.min(800, VIEW.w - 40) - 6, 464, 0xfffaf0, 1).setInteractive());
    this.add(c);
    return c;
  }

  private confirmReset(onReset?: () => void): void {
    const c = this.sheet();
    c.add(this.scene.add.text(0, -80, 'Erase all progress?', TXT.h2).setOrigin(0.5));
    c.add(this.scene.add.text(0, -36, 'Every unlocked level, every death, every\nachievement. Gone. Settings are kept.', { ...TXT.body, align: 'center' }).setOrigin(0.5));
    const yes = makeButton(this.scene, -100, 60, 160, 48, 'Erase', { fill: 0xb8452f });
    yes.on('pointerup', () => {
      services.resetProgress();
      c.destroy();
      toast(this.scene, 'Progress erased. The floor forgets nothing, though.');
      onReset?.();
    });
    const no = makeButton(this.scene, 100, 60, 160, 48, 'Keep it', { fill: 0x3f9d57 });
    no.on('pointerup', () => c.destroy());
    c.add([yes, no]);
  }

  private showCredits(): void {
    const c = this.sheet();
    c.add(this.scene.add.text(0, -170, 'Credits & Licenses', TXT.h2).setOrigin(0.5));
    c.add(
      this.scene.add
        .text(
          0,
          -30,
          [
            'Design, code, art, audio & levels: original work',
            'for Oops! That Floor! (MIT).',
            '',
            'Engine: Phaser 3 (MIT) · Packaging: Capacitor (MIT)',
            '',
            'Every sprite is drawn procedurally at runtime.',
            'Every sound and song is synthesized at runtime.',
            'No third-party game assets are included.',
          ].join('\n'),
          { ...TXT.small, fontSize: '15px', align: 'center', lineSpacing: 6 },
        )
        .setOrigin(0.5),
    );
    const ok = makeButton(this.scene, 0, 160, 150, 44, 'Back', {});
    ok.on('pointerup', () => c.destroy());
    c.add(ok);
  }
}
