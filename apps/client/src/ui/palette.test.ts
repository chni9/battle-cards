import { describe, expect, it } from 'vitest';
import { DUR_BASE_MS, DUR_FAST_MS, DUR_SLOW_MS, EASE_ENTRANCE } from './motion/motion-tokens';
import { V7_COLORS, V7_SEAT_COLORS, v7Color, v7SeatColor } from './palette';
import tokensCss from './tokens.css?raw';

const COMMENT = /\/\*[\s\S]*?\*\//g;
const DECLARATION = /--([\w-]+)\s*:\s*([^;]+);/g;
const TYPE_STEPS = ['micro', 'caption', 'body', 'input', 'title', 'vital', 'display'] as const;
const SPEC_COLORS = {
  'bg-0': '#0c0920',
  'bg-1': '#17113a',
  'glow-a': '#ff3d7f',
  'glow-b': '#3da9ff',
  panel: '#1f1850',
  'panel-2': '#2b2256',
  ink: '#0c0920',
  text: '#f3eeff',
  'text-2': '#cfc6ff',
  'text-on-card': '#2a2550',
  'text-on-cta': '#0c0920',
  life: '#ff3d7f',
  point: '#ffc93d',
  upgrade: '#3dcf8f',
  shield: '#6b8cff',
  cta: '#ffd43d',
  'cta-2': '#3da9ff',
  danger: '#ff4d4d',
  'threat-attack': '#ff3d7f',
  'threat-other': '#ffa53d',
  mine: '#3da9ff',
  'card-face-0': '#ffffff',
  'card-face-1': '#f1edff',
};
const SPEC_SEATS = ['#7cc4ff', '#ff6461', '#4fe06a', '#f5e05a', '#a080ff', '#f5b07a', '#33e6e0', '#f655c1'];

/** Declarations of the first `<opener> {` block; :root and @theme inline hold no nested braces. */
function declarations(opener: string): Map<string, string> {
  const css = tokensCss.replace(COMMENT, '');
  const start = css.indexOf(`${opener} {`);
  if (start < 0) throw new Error(`tokens.css has no ${opener} block`);
  const bodyStart = start + opener.length + 2;
  const result = new Map<string, string>();
  for (const [, name, value] of css.slice(bodyStart, css.indexOf('}', bodyStart)).matchAll(DECLARATION)) {
    if (name !== undefined && value !== undefined) result.set(name, value.trim());
  }
  return result;
}
function pick(decls: Map<string, string>, keys: readonly string[]): Record<string, string | undefined> {
  return Object.fromEntries(keys.map((key) => [key, decls.get(key)]));
}
const paletteEntries = (): [string, string][] => [
  ...Object.entries(V7_COLORS),
  ...V7_SEAT_COLORS.map((hex, i): [string, string] => [`seat-${i}`, hex]),
];
const byName = ([a]: [string, string], [b]: [string, string]): number => a.localeCompare(b);

describe('V7 palette mirror (technical spec v7 §5.1)', () => {
  it('pins the §5.1 colors plus the V7 additions', () => {
    expect(V7_COLORS).toStrictEqual(SPEC_COLORS);
  });
  it('pins the eight dark-ground seat hues (§14.3 watch point)', () => {
    expect(V7_SEAT_COLORS).toStrictEqual(SPEC_SEATS);
  });
  it('declares exactly the palette hex values on :root', () => {
    const hexOnRoot = [...declarations(':root')].filter(([, value]) => /^#[0-9a-f]{6}$/.test(value));
    expect(hexOnRoot.sort(byName)).toStrictEqual(paletteEntries().sort(byName));
  });
  it('reads colors and clamps seat indexes like the V2 palette', () => {
    expect([v7Color('panel'), v7Color('text-on-cta')]).toStrictEqual(['#1f1850', '#0c0920']);
    expect([3, -1, 99, 2.7].map(v7SeatColor)).toStrictEqual([3, 0, 7, 2].map((i) => V7_SEAT_COLORS[i]));
  });
});
describe('ui/tokens.css (technical spec v7 §5.2, §5.3, §5.7)', () => {
  it('pins the §5.3 card and chrome shapes', () => {
    const root = declarations(':root');
    expect(root.get('card-rim-holo')).toMatch(/^conic-gradient\(/);
    expect(root.get('card-rim-gold')).toMatch(/gradient\(/);
    const shapes = {
      'card-radius': '12px', 'card-rim-width': '2px', 'card-shadow': '0 10px 22px rgba(0, 0, 0, 0.45)',
      'chrome-outline-width': '3px', 'chrome-shadow': '0 4px 0 var(--ink)', 'chrome-radius': '12px',
      'chrome-radius-sm': '10px', 'chrome-press-y': '3px', scanline: 'rgba(255, 255, 255, 0.03)',
    };
    expect(pick(root, Object.keys(shapes))).toStrictEqual(shapes);
  });
  it('keeps the §5.2 type floors (11 px functional, 16 px inputs, 22 px vital)', () => {
    const root = declarations(':root');
    expect(TYPE_STEPS.map((s) => root.get(`type-${s}`))).toStrictEqual(['11px', '12px', '14px', '16px', '20px', '22px', '32px']);
    expect(Number.parseFloat(root.get('type-micro') ?? '')).toBeGreaterThanOrEqual(11);
    expect(Number.parseFloat(root.get('type-input') ?? '')).toBeGreaterThanOrEqual(16);
    expect(Number.parseFloat(root.get('type-vital') ?? '')).toBeGreaterThanOrEqual(22);
  });
  it('mirrors ui/motion/motion-tokens', () => {
    expect(pick(declarations(':root'), ['dur-fast', 'dur-base', 'dur-slow', 'ease-entrance'])).toStrictEqual({
      'dur-fast': `${DUR_FAST_MS}ms`, 'dur-base': `${DUR_BASE_MS}ms`, 'dur-slow': `${DUR_SLOW_MS}ms`,
      'ease-entrance': `cubic-bezier(${EASE_ENTRANCE.join(', ')})`,
    });
  });
  it('maps every V7 color into @theme inline as --color-v7-<token>', () => {
    const theme = declarations('@theme inline');
    for (const [name] of paletteEntries()) expect(theme.get(`color-v7-${name}`), name).toBe(`var(--${name})`);
  });
  it('maps shapes, fonts, type and ease under v7 names only, never a V2 name', () => {
    const theme = declarations('@theme inline');
    const fixed = {
      'radius-v7-chrome': 'var(--chrome-radius)', 'radius-v7-chrome-sm': 'var(--chrome-radius-sm)',
      'radius-v7-card': 'var(--card-radius)', 'shadow-v7-chrome': 'var(--chrome-shadow)',
      'shadow-v7-card': 'var(--card-shadow)', 'ease-v7-entrance': 'var(--ease-entrance)',
      'font-v7-display': "'Lilita One', ui-rounded, system-ui, sans-serif",
      'font-v7-card': "'Fredoka', ui-rounded, system-ui, sans-serif",
      'font-v7-body': "'Nunito', ui-sans-serif, system-ui, sans-serif",
      ...Object.fromEntries(TYPE_STEPS.map((s) => [`text-v7-${s}`, `var(--type-${s})`])),
    };
    expect(pick(theme, Object.keys(fixed))).toStrictEqual(fixed);
    expect(theme.size).toBe(47); // 31 colors + 3 radii + 2 shadows + 3 fonts + 7 type steps + 1 ease
    for (const key of theme.keys()) expect(key).toMatch(/^(color|radius|shadow|font|text|ease)-v7-/);
    for (const s of TYPE_STEPS) expect(theme.has(`color-v7-${s}`)).toBe(false);
  });
  it('keeps the ground opt-in and viewport-safe (§4.4, L53-02)', () => {
    const css = tokensCss.replace(COMMENT, '');
    expect(css).toContain('.v7-ground {');
    expect(css).not.toMatch(/(^|[\s,}])(html|body|#root)\s*[{,]/);
    expect(css).not.toMatch(/\d+d?vh/);
    for (const hex of [V7_COLORS['glow-a'], V7_COLORS['glow-b']]) {
      const rgb = [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16)).join(' ');
      expect(css).toContain(`rgb(${rgb} / 0.3)`);
    }
  });
});
