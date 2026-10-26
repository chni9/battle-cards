/** Edge flood-fill ground removal — technical spec v7 §5.5 (L72-10). Enclosed light regions survive. */
import { describe, expect, it } from 'vitest';

import { GROUND_TOLERANCE, clearEdgeGround, defringeEdge, edgeGroundColor, type RgbaImage } from './art-flood-fill';

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

/** Fix round 2 fixtures: `RING_PIXELS` plus a 3-way blend, light fills near the threshold and near-ink fills. */
const ROUND2_PIXELS: Readonly<Record<string, readonly [number, number, number, number]>> = {
  ...RING_PIXELS,
  k: [195, 153, 153, 255], // white, red and ink mixed: no single color explains it within the residual
  u: [241, 241, 241, 255], // 'v' or 'w' over white at about 50 %
  v: [226, 226, 226, 255], // light fill 50.2 from white: above 3 x 16
  w: [228, 228, 228, 255], // light fill 46.8 from white: below 3 x 16
  n: [44, 44, 44, 255], // ink fill 6.9 from ink: a solid fill (within 16 / 2)
  p: [47, 47, 47, 255], // 12.1 from ink: a blend with a little ground
};

function round2Image(rows: readonly string[]): RgbaImage {
  const width = rows[0]?.length ?? 0;
  const data = new Uint8ClampedArray(width * rows.length * 4);
  rows.forEach((row, y) => {
    Array.from(row).forEach((symbol, x) => {
      const pixel = ROUND2_PIXELS[symbol];
      if (pixel === undefined) throw new Error(`Unknown pixel symbol ${symbol}`);
      data.set(pixel, (y * width + x) * 4);
    });
  });
  return { width, height: rows.length, data };
}

const pixelOf = (image: RgbaImage, x: number, y: number): number[] =>
  Array.from(image.data.subarray((y * image.width + x) * 4, (y * image.width + x) * 4 + 4));

describe('defringeEdge thresholds (technical spec v7 §5.5, L72-10 fix round 2)', () => {
  const fifteen = { ground: WHITE, tolerance: 15 } as const;
  const sixteen = { ground: WHITE, tolerance: 16 } as const;

  it('falls back to the smallest residual when no nearby color explains the pixel as a blend', () => {
    const input = round2Image(['xxxxxxx', 'xxkrrrx', 'xxrr##x', 'xxrr##x', 'xxxxxxx']);
    expect(pixelOf(defringeEdge(input, sixteen), 2, 1)).toEqual([108, 6, 6, 104]);
  });
  it('un-blends a foreground just above three times the tolerance from the ground', () => {
    const input = round2Image(['xxxxxx', 'xxxxxx', 'xxuvvv', 'xxvvvv', 'xxvvvv', 'xxvvvv']);
    expect(pixelOf(defringeEdge(input, sixteen), 2, 2)).toEqual([226, 226, 226, 123]);
  });
  it('keeps a foreground just under three times the tolerance from the ground as a light part', () => {
    const input = round2Image(['xxxxxx', 'xxxxxx', 'xxuwww', 'xxwwww', 'xxwwww', 'xxwwww']);
    expect(defringeEdge(input, sixteen).data).toEqual(input.data);
  });
  it('derives the light-part threshold from the tolerance, which defaults to GROUND_TOLERANCE', () => {
    const input = round2Image(['xxxxxx', 'xxxxxx', 'xxuwww', 'xxwwww', 'xxwwww', 'xxwwww']);
    expect(pixelOf(defringeEdge(input, fifteen), 2, 2)).toEqual([228, 228, 228, 132]);
    expect(GROUND_TOLERANCE).toBe(16);
    expect(defringeEdge(input, { ground: WHITE }).data).toEqual(defringeEdge(input, sixteen).data);
  });
});

describe('defringeEdge second ring (technical spec v7 §5.5, L72-10 fix round 2)', () => {
  const options = { ground: WHITE, tolerance: 16 } as const;
  const STAIR = ['xxx#####', 'xxx#####', 'xxx#####', '###m####', '########', '########', '########', '########'];

  it('un-blends a stair-corner pixel that touches the cleared region only diagonally', () => {
    expect(pixelOf(defringeEdge(round2Image(STAIR), options), 3, 3)).toEqual([40, 40, 40, 128]);
  });
  it('un-blends a second anti-aliased row against the solid core', () => {
    const input = round2Image(['xxxxxxx', 'xmmmmmx', 'xqqqqqx', 'x#####x', 'x#####x', 'x#####x', 'x#####x', 'xxxxxxx']);
    expect(pixelOf(defringeEdge(input, options), 3, 2)).toEqual([40, 40, 40, 191]);
  });
  it('leaves a second-ring pixel within half the tolerance of a core neighbour as a solid fill', () => {
    const input = round2Image(['xxxxxxx', 'x#####x', 'x#np##x', 'x#####x', 'x#####x', 'x#####x', 'x#####x', 'xxxxxxx']);
    const out = defringeEdge(input, options);
    expect(pixelOf(out, 2, 2)).toEqual([44, 44, 44, 255]);
    expect(pixelOf(out, 3, 2)).toEqual([40, 40, 40, 247]);
  });
  it('leaves a thin part with no core pixel untouched', () => {
    const input = round2Image(['xxxxxxx', 'x#####x', 'x#mmm#x', 'x#####x', 'xxxxxxx']);
    expect(defringeEdge(input, options).data).toEqual(input.data);
  });
  it('changes nothing beyond the second ring and leaves the input untouched', () => {
    const input = round2Image(STAIR);
    const before = Uint8ClampedArray.from(input.data);
    const out = defringeEdge(input, options);
    expect(input.data).toEqual(before);
    expect(out.data).toEqual(withPixels(input, [[3, 3, [40, 40, 40, 128]]]));
  });
});
