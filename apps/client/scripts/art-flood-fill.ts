/**
 * Edge flood-fill ground removal — technical spec v7 §5.5 (L72-10).
 * Only pixels connected to the border by a 4-neighbour path are cleared.
 * Never a global color key: an enclosed light region stays.
 */

export interface RgbaImage {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

/** Pixel region inside an image. `extract-art.ts` passes this to sharp's extract. */
export interface CropRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

interface Rgb {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

/** Top row, bottom row, then the side columns, each pixel once. */
function borderIndices(width: number, height: number): number[] {
  const indices: number[] = [];
  if (width === 0 || height === 0) return indices;
  const seen = new Uint8Array(width * height);
  const push = (x: number, y: number): void => {
    const index = y * width + x;
    if (seen[index] === 1) return;
    seen[index] = 1;
    indices.push(index);
  };
  for (let x = 0; x < width; x += 1) {
    push(x, 0);
    if (height > 1) push(x, height - 1);
  }
  for (let y = 1; y < height - 1; y += 1) {
    push(0, y);
    if (width > 1) push(width - 1, y);
  }
  return indices;
}

/**
 * Most frequent opaque border RGB. A tie keeps the color that reached the
 * winning count first. No opaque border pixel means there is no ground color
 * (only already-transparent pixels count as ground).
 */
function groundColor(data: Uint8ClampedArray, width: number, height: number): Rgb | undefined {
  const counts = new Map<number, number>();
  let bestKey = -1;
  let bestCount = 0;
  for (const index of borderIndices(width, height)) {
    const offset = index * 4;
    const alpha = data[offset + 3] ?? 0;
    if (alpha === 0) continue;
    const r = data[offset] ?? 0;
    const g = data[offset + 1] ?? 0;
    const b = data[offset + 2] ?? 0;
    const key = (r << 16) | (g << 8) | b;
    const count = (counts.get(key) ?? 0) + 1;
    counts.set(key, count);
    if (count > bestCount) {
      bestCount = count;
      bestKey = key;
    }
  }
  if (bestKey < 0) return undefined;
  return { r: (bestKey >> 16) & 255, g: (bestKey >> 8) & 255, b: bestKey & 255 };
}

function isGround(
  data: Uint8ClampedArray,
  offset: number,
  ground: Rgb | undefined,
  tolerance: number,
): boolean {
  if ((data[offset + 3] ?? 0) === 0) return true;
  if (ground === undefined) return false;
  const dr = (data[offset] ?? 0) - ground.r;
  const dg = (data[offset + 1] ?? 0) - ground.g;
  const db = (data[offset + 2] ?? 0) - ground.b;
  return Math.hypot(dr, dg, db) <= tolerance;
}

const NEIGHBOR_DELTAS = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
] as const;

export function clearEdgeGround(
  image: RgbaImage,
  options: { readonly tolerance: number },
): RgbaImage {
  const { width, height } = image;
  const data = new Uint8ClampedArray(image.data);
  const ground = groundColor(data, width, height);
  const visited = new Uint8Array(width * height);
  const stack: number[] = [];
  for (const index of borderIndices(width, height)) {
    if (!isGround(data, index * 4, ground, options.tolerance)) continue;
    visited[index] = 1;
    stack.push(index);
  }
  while (stack.length > 0) {
    const index = stack.pop();
    if (index === undefined) break;
    data[index * 4 + 3] = 0;
    const x = index % width;
    const y = (index - x) / width;
    for (const [dx, dy] of NEIGHBOR_DELTAS) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const next = ny * width + nx;
      if (visited[next] === 1) continue;
      if (!isGround(data, next * 4, ground, options.tolerance)) continue;
      visited[next] = 1;
      stack.push(next);
    }
  }
  return { width, height, data };
}
