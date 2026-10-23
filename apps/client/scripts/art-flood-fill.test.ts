/** Edge flood-fill ground removal — technical spec v7 §5.5 (L72-10). Enclosed light regions survive. */
import { describe, expect, it } from 'vitest';

import { clearEdgeGround, type RgbaImage } from './art-flood-fill';

const PIXELS: Readonly<Record<string, readonly [number, number, number, number]>> = {
  '.': [255, 255, 255, 255], // white card ground
  c: [253, 243, 211, 255], // cream special ground
  '#': [40, 40, 40, 255], // dark outline
  o: [250, 250, 250, 255], // light island, 8.7 from white
  '~': [252, 252, 252, 255], // ground noise, 5.2 from white
  g: [230, 230, 230, 255], // light drawing fill, 43.3 from white
  t: [255, 255, 243, 255], // exactly 12 from white
  x: [0, 0, 0, 0], // already transparent
};

function imageFrom(rows: readonly string[]): RgbaImage {
  const width = rows[0]?.length ?? 0;
  const data = new Uint8ClampedArray(width * rows.length * 4);
  rows.forEach((row, y) => {
    let x = 0;
    for (const symbol of row) {
      const pixel = PIXELS[symbol];
      if (pixel === undefined) throw new Error(`Unknown pixel symbol ${symbol}`);
      data.set(pixel, (y * width + x) * 4);
      x += 1;
    }
  });
  return { width, height: rows.length, data };
}

/** '1' where the pixel is still opaque, '0' where its alpha is 0. */
const alphaMask = (image: RgbaImage): string[] =>
  Array.from({ length: image.height }, (_, y) =>
    Array.from({ length: image.width }, (_, x) =>
      (image.data[(y * image.width + x) * 4 + 3] ?? 0) === 0 ? '0' : '1',
    ).join(''),
  );

const mask = (rows: readonly string[], tolerance = 16): string[] =>
  alphaMask(clearEdgeGround(imageFrom(rows), { tolerance }));

describe('clearEdgeGround (technical spec v7 §5.5, L72-10)', () => {
  it('clears edge-connected ground and keeps an enclosed light island', () => {
    expect(mask(['.......', '.#####.', '.#ooo#.', '.#ooo#.', '.#ooo#.', '.#####.', '.......'])).toEqual(
      ['0000000', '0111110', '0111110', '0111110', '0111110', '0111110', '0000000']);
  });
  it('clears ground noise within tolerance that touches the edge fill', () => {
    expect(mask(['.....', '.~~#.', '.~###', '.....'])).toEqual(['00000', '00010', '00111', '00000']);
  });
  it('keeps a light drawing color beyond tolerance even where it touches the edge', () => {
    expect(mask(['....', 'gg..', 'gg..', '....'])).toEqual(['0000', '1100', '1100', '0000']);
  });
  it('is 4-connected, so a diagonal gap in an outline does not leak', () => {
    expect(mask(['.....', '..#..', '.#o#.', '..#..', '.....'])).toEqual(
      ['00000', '00100', '01110', '00100', '00000']);
  });
  it('counts a distance equal to the tolerance as ground', () => {
    expect(mask(['...', '.t.', '...'], 12)).toEqual(['000', '000', '000']);
    expect(mask(['...', '.t.', '...'], 11)).toEqual(['000', '010', '000']);
  });
  it('uses the most frequent border color as the ground, not the corner pixel', () => {
    expect(mask(['.ccc', 'c..c', 'cccc', 'cc.c'])).toEqual(['1000', '0110', '0000', '0010']);
  });
  it('lets the fill cross pixels that are already transparent', () => {
    expect(mask(['.....', '.###.', '.#.#.', '.#x#.', '.....'])).toEqual(
      ['00000', '01110', '01010', '01010', '00000']);
  });
  it('returns a new image and leaves the input and every color channel untouched', () => {
    const input = imageFrom(['...', '.#.', '...']);
    const before = Uint8ClampedArray.from(input.data);
    const out = clearEdgeGround(input, { tolerance: 16 });
    expect(out).not.toBe(input);
    expect(out.data).not.toBe(input.data);
    expect(input.data).toEqual(before);
    expect([out.width, out.height]).toEqual([3, 3]);
    for (let i = 0; i < out.data.length; i += 4) {
      expect(out.data.subarray(i, i + 3)).toEqual(input.data.subarray(i, i + 3));
    }
  });
});
