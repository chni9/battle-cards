/** No emoji in ui/ — technical spec v7 §5.6, L72-07. U+2715 is not Extended_Pictographic, but V7 draws that cross as an icon. */
import { describe, expect, it } from 'vitest';

const PICTOGRAPHIC = /\p{Extended_Pictographic}/u;
const MULTIPLICATION_X = String.fromCodePoint(0x2715);
const UI_SOURCES = import.meta.glob<string>('../**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true });

describe('ui/ ships no emoji (technical spec v7 §5.6)', () => {
  it('reads files from ui/icons/ and from the rest of ui/', () => {
    const paths = Object.keys(UI_SOURCES);
    expect(paths.some((path) => path.endsWith('/icon.tsx'))).toBe(true);
    expect(paths.some((path) => path.endsWith('/palette.ts'))).toBe(true);
  });
  it('finds no pictographic character and no U+2715 cross in any ui/ file', () => {
    const offenders = Object.entries(UI_SOURCES).flatMap(([path, text]) =>
      text.split('\n').flatMap((line, index) =>
        PICTOGRAPHIC.test(line) || line.includes(MULTIPLICATION_X) ? [`${path}:${index + 1}`] : []));
    expect(offenders).toEqual([]);
  });
  it('flags an emoji and passes the punctuation ui/ copy uses', () => {
    expect(PICTOGRAPHIC.test(`Ready ${String.fromCodePoint(0x1f600)}`)).toBe(true);
    expect(PICTOGRAPHIC.test('Lives 4 · Points 3 — 2× shield → ?')).toBe(false);
  });
});
