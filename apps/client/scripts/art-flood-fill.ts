/**
 * Ground removal for the V7 art extraction — technical spec v7 §5.5 (L72-10).
 *
 * The ground is removed by edge flood-fill only, never by a global color key: a light
 * part of a drawing that matches the ground color (a blade highlight, an eye glint, a
 * region enclosed by an outline) survives unless the fill can reach it from the border
 * through ground-colored pixels. Only alpha is ever written; every color channel is kept.
 */

/** Raw 8-bit RGBA pixels, row-major, 4 bytes per pixel. */
export interface RgbaImage {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

/** A pixel region in source coordinates (the rectangle handed to sharp `extract`). */
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

/** Pixel indices of the border, each once: top row, bottom row, then the left and right columns. */
function borderPixels(width: number, height: number): number[] {
  const pixels: number[] = [];
  for (let x = 0; x < width; x += 1) pixels.push(x);
  if (height > 1) for (let x = 0; x < width; x += 1) pixels.push((height - 1) * width + x);
  for (let y = 1; y < height - 1; y += 1) pixels.push(y * width);
  if (width > 1) for (let y = 1; y < height - 1; y += 1) pixels.push(y * width + width - 1);
  return pixels;
}

/**
 * The most frequent RGB among the non-transparent border pixels. On a tie the color that
 * reached the maximum count first wins. `undefined` when the whole border is transparent.
 */
function groundColor(image: RgbaImage, border: readonly number[]): Rgb | undefined {
  const counts = new Map<number, number>();
  let best: number | undefined;
  let bestCount = 0;
  for (const pixel of border) {
    const offset = pixel * 4;
    if ((image.data[offset + 3] ?? 0) === 0) continue;
    const key =
      ((image.data[offset] ?? 0) << 16) |
      ((image.data[offset + 1] ?? 0) << 8) |
      (image.data[offset + 2] ?? 0);
    const count = (counts.get(key) ?? 0) + 1;
    counts.set(key, count);
    if (count > bestCount) {
      best = key;
      bestCount = count;
    }
  }
  if (best === undefined) return undefined;
  return { r: (best >> 16) & 0xff, g: (best >> 8) & 0xff, b: best & 0xff };
}

/**
 * Makes transparent every pixel reachable from the border through ground pixels
 * (4-connected). A ground pixel is already transparent or within `tolerance` (Euclidean
 * RGB distance, inclusive) of the most frequent border color. Returns a new image.
 */
export function clearEdgeGround(image: RgbaImage, options: { readonly tolerance: number }): RgbaImage {
  const { width, height } = image;
  const data = new Uint8ClampedArray(image.data);
  const border = borderPixels(width, height);
  const ground = groundColor(image, border);

  const isGround = (pixel: number): boolean => {
    const offset = pixel * 4;
    if ((image.data[offset + 3] ?? 0) === 0) return true;
    if (ground === undefined) return false;
    const distance = Math.hypot(
      (image.data[offset] ?? 0) - ground.r,
      (image.data[offset + 1] ?? 0) - ground.g,
      (image.data[offset + 2] ?? 0) - ground.b,
    );
    return distance <= options.tolerance;
  };

  // Explicit stack, no recursion: a card crop is ~140k pixels. Each pixel is pushed at most
  // once because it is marked visited when pushed.
  const visited = new Uint8Array(width * height);
  const stack = new Int32Array(width * height);
  let top = 0;
  const push = (pixel: number): void => {
    if (visited[pixel] === 1 || !isGround(pixel)) return;
    visited[pixel] = 1;
    stack[top] = pixel;
    top += 1;
  };

  for (const pixel of border) push(pixel);
  while (top > 0) {
    top -= 1;
    const pixel = stack[top] ?? 0;
    data[pixel * 4 + 3] = 0;
    const x = pixel % width;
    if (x > 0) push(pixel - 1);
    if (x < width - 1) push(pixel + 1);
    if (pixel >= width) push(pixel - width);
    if (pixel < (height - 1) * width) push(pixel + width);
  }

  return { width, height, data };
}
