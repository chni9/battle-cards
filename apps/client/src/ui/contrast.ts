/**
 * Contrast and color-distance math for the V7 token tests (technical spec v7 §5.1).
 * Pure helpers, no DOM: `ui/contrast.test.ts` runs them over `ui/palette.ts`.
 */

/** WCAG 2.x success criterion 1.4.3: body text. */
export const WCAG_AA_TEXT = 4.5;
/** WCAG 2.x success criterion 1.4.3: large text. */
export const WCAG_AA_LARGE_TEXT = 3;

/**
 * Seat hues must be at least this far apart in CIEDE2000 (sRGB, D65, kL = kC = kH = 1).
 * Recorded in `DESIGN.md`; technical spec v7 §5.1.
 */
export const SEAT_HUE_MIN_DELTA_E = 20;

type Rgb = readonly [number, number, number];

const HEX = /^#[0-9a-f]{6}$/i;
const POW25_7 = 25 ** 7;

function parseHex(hex: string): Rgb {
  if (!HEX.test(hex)) {
    throw new Error(`Expected #rrggbb, got ${hex}`);
  }
  const packed = Number.parseInt(hex.slice(1), 16);
  return [(packed >> 16) & 0xff, (packed >> 8) & 0xff, packed & 0xff];
}

/** sRGB channel (0-255) to linear light. */
function linear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

export function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const WHITE_X = 0.95047;
const WHITE_Y = 1;
const WHITE_Z = 1.08883;

function labF(t: number): number {
  return t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116;
}

function toLab(hex: string): Rgb {
  const [r8, g8, b8] = parseHex(hex);
  const r = linear(r8);
  const g = linear(g8);
  const b = linear(b8);
  const x = 0.4124564 * r + 0.3575761 * g + 0.1804375 * b;
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const z = 0.0193339 * r + 0.119192 * g + 0.9503041 * b;
  const fx = labF(x / WHITE_X);
  const fy = labF(y / WHITE_Y);
  const fz = labF(z / WHITE_Z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

const toRad = (deg: number): number => (deg * Math.PI) / 180;
const toDeg = (rad: number): number => (rad * 180) / Math.PI;

/** Hue angle in degrees, [0, 360); 0 when both components are 0. */
function hueDeg(b: number, aPrime: number): number {
  if (aPrime === 0 && b === 0) {
    return 0;
  }
  const h = toDeg(Math.atan2(b, aPrime));
  return h < 0 ? h + 360 : h;
}

/** CIEDE2000 (Sharma, Wu, Dalal 2005), kL = kC = kH = 1. */
export function deltaE2000(hexA: string, hexB: string): number {
  const [l1, a1, b1] = toLab(hexA);
  const [l2, a2, b2] = toLab(hexB);

  const cBar = (Math.hypot(a1, b1) + Math.hypot(a2, b2)) / 2;
  const cBar7 = cBar ** 7;
  const g = 0.5 * (1 - Math.sqrt(cBar7 / (cBar7 + POW25_7)));
  const a1p = (1 + g) * a1;
  const a2p = (1 + g) * a2;
  const c1p = Math.hypot(a1p, b1);
  const c2p = Math.hypot(a2p, b2);
  const h1p = hueDeg(b1, a1p);
  const h2p = hueDeg(b2, a2p);

  const lBarP = (l1 + l2) / 2;
  const cBarP = (c1p + c2p) / 2;
  const dLp = l2 - l1;
  const dCp = c2p - c1p;
  const chromaProduct = c1p * c2p;

  let dhp = 0;
  if (chromaProduct !== 0) {
    dhp = h2p - h1p;
    if (dhp > 180) {
      dhp -= 360;
    } else if (dhp < -180) {
      dhp += 360;
    }
  }
  const dHp = 2 * Math.sqrt(chromaProduct) * Math.sin(toRad(dhp / 2));

  let hBarP = h1p + h2p;
  if (chromaProduct !== 0) {
    if (Math.abs(h1p - h2p) <= 180) {
      hBarP = (h1p + h2p) / 2;
    } else {
      hBarP = (h1p + h2p + (h1p + h2p < 360 ? 360 : -360)) / 2;
    }
  }

  const t =
    1 -
    0.17 * Math.cos(toRad(hBarP - 30)) +
    0.24 * Math.cos(toRad(2 * hBarP)) +
    0.32 * Math.cos(toRad(3 * hBarP + 6)) -
    0.2 * Math.cos(toRad(4 * hBarP - 63));
  const dTheta = 30 * Math.exp(-(((hBarP - 275) / 25) ** 2));
  const cBarP7 = cBarP ** 7;
  const rT = -Math.sin(toRad(2 * dTheta)) * 2 * Math.sqrt(cBarP7 / (cBarP7 + POW25_7));

  const lOffset = (lBarP - 50) ** 2;
  const sL = 1 + (0.015 * lOffset) / Math.sqrt(20 + lOffset);
  const sC = 1 + 0.045 * cBarP;
  const sH = 1 + 0.015 * cBarP * t;

  const lTerm = dLp / sL;
  const cTerm = dCp / sC;
  const hTerm = dHp / sH;
  return Math.sqrt(lTerm ** 2 + cTerm ** 2 + hTerm ** 2 + rT * cTerm * hTerm);
}
