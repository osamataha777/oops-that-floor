import Phaser from 'phaser';

type G = Phaser.GameObjects.Graphics;

/** Pip's palette — indigo gumdrop, cream face-plate, sprout on top. */
export const PIP_COLORS = {
  body: 0x3d3b74,
  bodyShade: 0x2c2a5a,
  outline: 0x1b1a36,
  belly: 0xfbf3e4,
  bellyShade: 0xe9dcc4,
  cheek: 0xff8a8a,
  eye: 0xfffdf7,
  pupil: 0x1b1a36,
  brow: 0xfffaf0,
  mouth: 0x2a1f2e,
  tongue: 0xe8636f,
  shoe: 0x1b1a36,
  stem: 0x4b8a3a,
  leaf: 0x7ccc63,
  leafVein: 0xb7ec9f,
  sweat: 0x8fd3ff,
};

interface Part {
  w: number;
  h: number;
  /** Origin within the part canvas (logical px). */
  ox: number;
  oy: number;
  draw: (g: G) => void;
}

/** Superellipse blob, a bit wider at the bottom — Pip's gumdrop silhouette. */
function blob(cx: number, cy: number, a: number, b: number, inflate = 0): Phaser.Types.Math.Vector2Like[] {
  const pts: Phaser.Types.Math.Vector2Like[] = [];
  const n = 2.7;
  for (let i = 0; i < 56; i++) {
    const t = (i / 56) * Math.PI * 2;
    const c = Math.cos(t);
    const s = Math.sin(t);
    const yy = Math.sign(s) * Math.pow(Math.abs(s), 2 / n);
    const widen = 1 + 0.1 * Math.max(0, yy); // heavier bottom
    pts.push({
      x: cx + (a * widen + inflate) * Math.sign(c) * Math.pow(Math.abs(c), 2 / n),
      y: cy + (b + inflate) * yy,
    });
  }
  return pts;
}

const C = PIP_COLORS;

function mouthPart(draw: (g: G) => void): Part {
  return { w: 14, h: 10, ox: 7, oy: 5, draw };
}

/**
 * Layered parts. PipView assembles them in a rig whose origin is the point
 * between Pip's feet; body/face sit above it (negative y).
 */
export const PIP: { parts: Record<string, Part>; layout: Record<string, { x: number; y: number }> } = {
  layout: {
    body: { x: 0, y: -3 },
    belly: { x: 0, y: -11 },
    eyeL: { x: -5.6, y: -24 },
    eyeR: { x: 5.6, y: -24 },
    browL: { x: -5.8, y: -30.2 },
    browR: { x: 5.8, y: -30.2 },
    mouth: { x: 0, y: -15 },
    cheekL: { x: -8.6, y: -17.6 },
    cheekR: { x: 8.6, y: -17.6 },
    sprout: { x: 1, y: -32.5 },
    handL: { x: -13.2, y: -11 },
    handR: { x: 13.2, y: -11 },
    footL: { x: -6, y: -2.4 },
    footR: { x: 6, y: -2.4 },
    sweat: { x: 11.5, y: -29 },
  },
  parts: {
    'pip-body': {
      w: 34, h: 34, ox: 17, oy: 32,
      draw: (g) => {
        g.fillStyle(C.outline, 1).fillPoints(blob(17, 17.2, 12, 14.6, 1.4), true);
        g.fillStyle(C.bodyShade, 1).fillPoints(blob(17, 17.2, 12, 14.6), true);
        g.fillStyle(C.body, 1).fillPoints(blob(17, 15.9, 11.3, 13.3), true);
        // soft top-left sheen
        g.fillStyle(0xffffff, 0.16).fillEllipse(12.5, 7.5, 8, 4.4);
        g.fillStyle(0xffffff, 0.3).fillEllipse(11.2, 6.9, 3, 1.6);
      },
    },
    'pip-belly': {
      w: 24, h: 18, ox: 12, oy: 9,
      draw: (g) => {
        g.fillStyle(C.bellyShade, 1).fillEllipse(12, 9.6, 21, 16);
        g.fillStyle(C.belly, 1).fillEllipse(12, 8.8, 20, 14.6);
      },
    },
    'pip-eye': {
      w: 10, h: 12, ox: 5, oy: 6,
      draw: (g) => {
        g.fillStyle(C.outline, 0.55).fillEllipse(5, 6.4, 8.6, 10.6);
        g.fillStyle(C.eye, 1).fillEllipse(5, 6, 7.6, 9.6);
      },
    },
    'pip-eye-happy': {
      w: 10, h: 8, ox: 5, oy: 4,
      draw: (g) => {
        g.lineStyle(2.2, C.eye, 1);
        g.beginPath();
        g.arc(5, 6, 3.6, Math.PI * 1.1, Math.PI * 1.9);
        g.strokePath();
      },
    },
    'pip-eye-x': {
      w: 10, h: 10, ox: 5, oy: 5,
      draw: (g) => {
        g.lineStyle(2, C.eye, 1);
        g.beginPath();
        g.moveTo(2, 2); g.lineTo(8, 8);
        g.moveTo(8, 2); g.lineTo(2, 8);
        g.strokePath();
      },
    },
    'pip-pupil': {
      w: 6, h: 6, ox: 3, oy: 3,
      draw: (g) => {
        g.fillStyle(C.pupil, 1).fillCircle(3, 3, 2.6);
        g.fillStyle(0xffffff, 0.95).fillCircle(2, 1.9, 0.9);
      },
    },
    'pip-brow': {
      w: 8, h: 4, ox: 4, oy: 2,
      draw: (g) => g.fillStyle(C.brow, 1).fillRoundedRect(0.6, 0.8, 6.8, 2.2, 1.1),
    },
    'pip-cheek': {
      w: 7, h: 5, ox: 3.5, oy: 2.5,
      draw: (g) => g.fillStyle(C.cheek, 0.55).fillEllipse(3.5, 2.5, 6, 3.4),
    },
    'pip-m-smile': mouthPart((g) => {
      g.lineStyle(1.8, C.mouth, 1);
      g.beginPath();
      g.arc(7, 2.4, 3.6, Math.PI * 0.18, Math.PI * 0.82);
      g.strokePath();
    }),
    'pip-m-open': mouthPart((g) => {
      g.fillStyle(C.mouth, 1).fillEllipse(7, 5, 6.4, 4.6);
      g.fillStyle(C.tongue, 1).fillEllipse(7, 6.2, 3.6, 1.8);
    }),
    'pip-m-o': mouthPart((g) => {
      g.fillStyle(C.mouth, 1).fillEllipse(7, 5, 3.8, 4.4);
    }),
    'pip-m-big': mouthPart((g) => {
      g.fillStyle(C.mouth, 1).fillEllipse(7, 5, 8, 8.4);
      g.fillStyle(C.tongue, 1).fillEllipse(7, 7.4, 5, 2.6);
    }),
    'pip-m-flat': mouthPart((g) => {
      g.fillStyle(C.mouth, 1).fillRoundedRect(3.6, 4.2, 6.8, 1.7, 0.8);
    }),
    'pip-m-grin': mouthPart((g) => {
      g.fillStyle(C.mouth, 1);
      g.beginPath();
      g.arc(7, 2.6, 5, 0, Math.PI, false);
      g.closePath();
      g.fillPath();
      g.fillStyle(C.tongue, 1).fillEllipse(7, 6.2, 4.2, 2);
    }),
    'pip-m-frown': mouthPart((g) => {
      g.lineStyle(1.8, C.mouth, 1);
      g.beginPath();
      g.arc(7, 8, 3.4, Math.PI * 1.2, Math.PI * 1.8);
      g.strokePath();
    }),
    'pip-m-wobble': mouthPart((g) => {
      g.lineStyle(1.6, C.mouth, 1);
      g.beginPath();
      g.moveTo(2.5, 5);
      for (let i = 1; i <= 6; i++) g.lineTo(2.5 + i * 1.5, 5 + (i % 2 ? -1.1 : 1.1));
      g.strokePath();
    }),
    'pip-hand': {
      w: 8, h: 8, ox: 4, oy: 4,
      draw: (g) => {
        g.fillStyle(C.outline, 1).fillCircle(4, 4, 3.5);
        g.fillStyle(C.body, 1).fillCircle(4, 3.7, 2.6);
      },
    },
    'pip-foot': {
      w: 10, h: 7, ox: 5, oy: 3.5,
      draw: (g) => {
        g.fillStyle(C.shoe, 1).fillEllipse(5, 3.6, 8.6, 5.2);
        g.fillStyle(0xffffff, 0.22).fillEllipse(3.8, 2.4, 3.4, 1.4);
      },
    },
    'pip-sprout': {
      w: 16, h: 14, ox: 4, oy: 13,
      draw: (g) => {
        g.lineStyle(1.8, C.stem, 1);
        g.beginPath();
        g.moveTo(4, 13);
        g.lineTo(4.4, 9);
        g.lineTo(5.6, 6);
        g.strokePath();
        // leaf, tilted
        const leaf: Phaser.Types.Math.Vector2Like[] = [];
        for (let i = 0; i <= 20; i++) {
          const t = i / 20;
          const x = 5.6 + t * 9;
          const y = 6 - t * 3.4;
          const w = Math.sin(t * Math.PI) * 3.2;
          leaf.push({ x: x + w * 0.3, y: y - w });
        }
        for (let i = 20; i >= 0; i--) {
          const t = i / 20;
          const x = 5.6 + t * 9;
          const y = 6 - t * 3.4;
          const w = Math.sin(t * Math.PI) * 3.2;
          leaf.push({ x: x - w * 0.3, y: y + w });
        }
        g.fillStyle(C.stem, 1).fillPoints(leaf.map((p) => ({ x: p.x + 0.3, y: p.y + 0.5 })), true);
        g.fillStyle(C.leaf, 1).fillPoints(leaf, true);
        g.lineStyle(0.8, C.leafVein, 0.9);
        g.beginPath();
        g.moveTo(6.4, 5.6);
        g.lineTo(13.6, 2.9);
        g.strokePath();
      },
    },
    'pip-sweat': {
      w: 6, h: 9, ox: 3, oy: 4.5,
      draw: (g) => {
        g.fillStyle(C.sweat, 1).fillTriangle(3, 0.5, 0.9, 5, 5.1, 5);
        g.fillCircle(3, 5.6, 2.2);
        g.fillStyle(0xffffff, 0.7).fillCircle(2.3, 5, 0.7);
      },
    },
  },
};
