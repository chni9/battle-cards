import { describe, expect, it } from 'vitest';
import { contrastRatio } from './contrast';
import { V7_COLORS, V7_TOOL_LINE } from './palette';
import tokensCss from './tokens.css?raw';

const COMMENT = /\/\*[\s\S]*?\*\//g;
/** Any declaration, custom property or not: the tool block also sets `color-scheme`. */
const DECLARATION = /([-\w]+)\s*:\s*([^;]+);/g;

/** Declarations of the first `<opener> {` block; neither block read here nests braces. */
function block(opener: string): Map<string, string> {
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

describe('admin tool mode (technical spec v7 §7.8, L80-01)', () => {
  it('declares the tool chrome knobs (spec v7 §7.8, §5.3)', () => {
    expect(Object.fromEntries(block('[data-mode="tool"]'))).toStrictEqual({
      '--ink': V7_TOOL_LINE,
      '--chrome-outline-width': '1px',
      '--chrome-shadow': 'none',
      '--chrome-radius': '8px',
      '--chrome-radius-sm': '6px',
      '--chrome-press-y': '0px',
      'color-scheme': 'dark',
    });
  });

  it('keeps the tool line at 3:1 on every ground (WCAG 1.4.11)', () => {
    for (const ground of ['bg-0', 'bg-1', 'panel', 'panel-2'] as const) {
      expect(contrastRatio(V7_TOOL_LINE, V7_COLORS[ground]), ground).toBeGreaterThanOrEqual(3);
    }
  });

  it('leaves :root arcade chrome unchanged', () => {
    const root = block(':root');
    expect([root.get('--chrome-outline-width'), root.get('--ink')]).toStrictEqual(['3px', '#0c0920']);
  });
});
