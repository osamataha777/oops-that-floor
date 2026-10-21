import { THEMES, COLORS } from '../core/config';

export const FONT = "ui-rounded, 'SF Pro Rounded', 'Nunito', system-ui, sans-serif";

export const TXT = {
  title: { fontFamily: FONT, fontSize: '54px', fontStyle: '800', color: '#3f372f' } as Phaser.Types.GameObjects.Text.TextStyle,
  h1: { fontFamily: FONT, fontSize: '34px', fontStyle: '800', color: '#3f372f' } as Phaser.Types.GameObjects.Text.TextStyle,
  h2: { fontFamily: FONT, fontSize: '24px', fontStyle: '700', color: '#3f372f' } as Phaser.Types.GameObjects.Text.TextStyle,
  body: { fontFamily: FONT, fontSize: '18px', fontStyle: '600', color: '#5a5045' } as Phaser.Types.GameObjects.Text.TextStyle,
  small: { fontFamily: FONT, fontSize: '14px', fontStyle: '600', color: '#7a6f62' } as Phaser.Types.GameObjects.Text.TextStyle,
  chip: { fontFamily: FONT, fontSize: '15px', fontStyle: '800', color: '#fffaf0' } as Phaser.Types.GameObjects.Text.TextStyle,
  quip: { fontFamily: FONT, fontSize: '20px', fontStyle: '800', color: '#3f372f', align: 'center' } as Phaser.Types.GameObjects.Text.TextStyle,
  light: { fontFamily: FONT, fontSize: '18px', fontStyle: '700', color: '#fffaf0' } as Phaser.Types.GameObjects.Text.TextStyle,
};

export function chapterTheme(chapter: number) {
  return THEMES[Math.min(THEMES.length - 1, Math.max(0, chapter - 1))];
}

export function hex(n: number): string {
  return `#${n.toString(16).padStart(6, '0')}`;
}

export { COLORS };
