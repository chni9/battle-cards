/** Edge flood-fill ground removal — technical spec v7 §5.5 (L72-10). Enclosed light regions survive. */
import { describe, expect, it } from 'vitest';

import { clearEdgeGround, defringeEdge, edgeGroundColor, type RgbaImage } from './art-flood-fill';

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
    Array.from(row).forEach((symbol, x) => {
      const pixel = PIXELS[symbol];
      if (pixel === undefined) throw new Error(`Unknown pixel symbol ${symbol}`);
      data.set(pixel, (y * width + x) * 4);
    });
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

/** Defringe fixtures (fix round 1): `PIXELS` plus blends of a drawing color with the white ground. */
const RING_PIXELS: Readonly<Record<string, readonly [number, number, number, number]>> = {
  ...PIXELS,
  m: [147, 147, 147, 255], // ink '#' over white at coverage 108/215 (about 50 %)
  q: [94, 94, 94, 255], // ink over white at 75 %: a second anti-aliased row
  h: [243, 243, 243, 255], // light fill 'g' over white
  r: [230, 60, 60, 255], // red drawing fill
  s: [242, 158, 158, 255], // red over white at about 50 %
};

const WHITE = { r: 255, g: 255, b: 255 } as const;

function ringImage(rows: readonly string[]): RgbaImage {
  const width = rows[0]?.length ?? 0;
  const data = new Uint8ClampedArray(width * rows.length * 4);
  rows.forEach((row, y) => {
    Array.from(row).forEach((symbol, x) => {
      const pixel = RING_PIXELS[symbol];
      if (pixel === undefined) throw new Error(`Unknown pixel symbol ${symbol}`);
      data.set(pixel, (y * width + x) * 4);
    });
  });
  return { width, height: rows.length, data };
}

/** The input bytes with the given pixels replaced, to compare a whole output at once. */
function withPixels(image: RgbaImage, changes: readonly (readonly [number, number, readonly number[]])[]): Uint8ClampedArray {
  const data = Uint8ClampedArray.from(image.data);
  for (const [x, y, rgba] of changes) data.set(rgba, (y * image.width + x) * 4);
  return data;
}

describe('edgeGroundColor (technical spec v7 §5.5, L72-10 fix round 1)', () => {
  it('returns the ground clearEdgeGround removes: the most frequent opaque border color', () => {
    expect(edgeGroundColor(imageFrom(['.ccc', 'c..c', 'cccc', 'cc.c']))).toEqual({ r: 253, g: 243, b: 211 });
    expect(edgeGroundColor(imageFrom(['xxx', 'x#x', 'xxx']))).toBeUndefined();
  });
});

describe('defringeEdge (technical spec v7 §5.5, L72-10 fix round 1)', () => {
  const HALF_INK = ['xxxxxx', 'xxxxxx', 'xxm###', 'xx####', 'xx####', 'xx####'];

  it('un-blends a 50 % ink ring pixel to ink at half alpha and changes nothing else', () => {
    const input = ringImage(HALF_INK);
    expect(defringeEdge(input, { ground: WHITE }).data).toEqual(withPixels(input, [[2, 2, [40, 40, 40, 128]]]));
  });
  it('un-blends against the purest nearby color, not a second anti-aliased row', () => {
    const input = ringImage(['xxxxxxx', 'xmmmmmx', 'xqqqqqx', 'x#####x', 'x#####x', 'xxxxxxx']);
    const out = defringeEdge(input, { ground: WHITE });
    expect(Array.from(out.data.subarray((1 * 7 + 3) * 4, (1 * 7 + 3) * 4 + 4))).toEqual([40, 40, 40, 128]);
  });
  it('un-blends against the color the pixel was blended with, not a farther one nearby', () => {
    const input = ringImage(['xxxxxxx', 'xxsrrrx', 'xxrrrrx', 'xxrr##x', 'xxrr##x', 'xxxxxxx']);
    const out = defringeEdge(input, { ground: WHITE });
    expect(Array.from(out.data.subarray((1 * 7 + 2) * 4, (1 * 7 + 2) * 4 + 4))).toEqual([229, 60, 60, 127]);
  });
  it('keeps a ring pixel whose foreground is a light part close to the ground', () => {
    const input = ringImage(['xxxxxx', 'xxhggg', 'xxgggg', 'xxgggg', 'xxgggg']);
    expect(defringeEdge(input, { ground: WHITE }).data).toEqual(input.data);
  });
  it('leaves non-ring pixels untouched, including a blend with only a diagonal transparent neighbour', () => {
    const input = ringImage(['#####', '#x###', '##m##', '#####', '#####']);
    expect(defringeEdge(input, { ground: WHITE }).data).toEqual(input.data);
  });
  it('leaves a thin part with no solid pixel nearby untouched', () => {
    const input = ringImage(['xxxxx', 'xmmmx', 'xxxxx']);
    expect(defringeEdge(input, { ground: WHITE }).data).toEqual(input.data);
  });
  it('treats the outside of the image as cleared ground, like the flood-fill seeds', () => {
    const input = ringImage(['mmmm', '####', '####', '####']);
    const out = defringeEdge(input, { ground: WHITE });
    expect(Array.from(out.data.subarray(1 * 4, 1 * 4 + 4))).toEqual([40, 40, 40, 128]);
  });
  it('clears a ring pixel that is pure ground (coverage 0)', () => {
    const input = ringImage(['xxxxxx', 'xx.###', 'xx####', 'xx####', 'xx####']);
    expect(defringeEdge(input, { ground: WHITE }).data).toEqual(withPixels(input, [[2, 1, [255, 255, 255, 0]]]));
  });
  it('returns a new image of the same size and leaves the input untouched', () => {
    const input = ringImage(HALF_INK);
    const before = Uint8ClampedArray.from(input.data);
    const out = defringeEdge(input, { ground: WHITE });
    expect(out).not.toBe(input);
    expect(out.data).not.toBe(input.data);
    expect([out.width, out.height]).toEqual([input.width, input.height]);
    expect(input.data).toEqual(before);
  });
});
