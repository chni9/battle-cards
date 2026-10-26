/**
 * Ground removal for the V7 art extraction — technical spec v7 §5.5 (L72-10).
 *
 * The ground is removed by edge flood-fill only, never by a global color key: a light
 * part of a drawing that matches the ground color (a blade highlight, an eye glint, a
 * region enclosed by an outline) survives unless the fill can reach it from the border
 * through ground-colored pixels. `clearEdgeGround` writes only alpha; every color channel
 * is kept.
 *
 * `defringeEdge` then un-blends the old ground out of the boundary ring only: the opaque
 * pixels next to the cleared region (or the image edge). Their anti-aliasing mixed the
 * drawing with the old ground, which reads as a 1 px light halo on the V7 dark grounds.
 * It stays edge-based and never touches a pixel away from the cleared region, so enclosed
 * old-ground regions stay as they are (L72-10 fix round 1, docs/agent/decisions.md
 * 2026-10-26).
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

/** An 8-bit RGB color. */
export interface Rgb {
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

/**
 * The ground color `clearEdgeGround` removes from `image`: the most frequent non-transparent
 * border color, or `undefined` when the whole border is transparent. Read it from the image
 * before the fill, because the fill clears the border.
 */
export function edgeGroundColor(image: RgbaImage): Rgb | undefined {
  return groundColor(image, borderPixels(image.width, image.height));
}

/**
 * Window searched for a ring pixel's foreground. The drawings are flat fills whose
 * anti-aliasing spans at most two pixels across an edge, so a solid pixel of the shape the
 * ring pixel belongs to lies within two pixels of it.
 */
const FOREGROUND_RADIUS = 2;
/**
 * How far (Euclidean RGB) a ring pixel may sit from the line between the ground and a
 * candidate color and still count as a blend of the two: the same noise allowance as the
 * extraction's ground tolerance. It rejects a nearby color the pixel was not blended with,
 * such as an ink outline next to a red fill, which would wrongly lower its alpha and tint it.
 */
const BLEND_RESIDUAL = 16;
/**
 * A foreground closer than this to the ground (three times the ground tolerance) is a light
 * drawing part: a blend of two colors that close reads as part of the light shape, not as a
 * halo, and the pixels within the tolerance are already cleared, so there is too little range
 * left to recover a coverage. Such ring pixels are left untouched (Ghost, Curse, Scientist's
 * flask, Assassin's blade edge, Attack Thief's white card at 45.6 from the cream ground).
 */
const LIGHT_PART_DISTANCE = 48;

interface Candidate {
  readonly dr: number;
  readonly dg: number;
  readonly db: number;
  readonly lengthSquared: number;
  readonly residual: number;
}

/** `value` clamped to [0, 1]. */
const unit = (value: number): number => Math.min(1, Math.max(0, value));

/**
 * Removes the old ground from the boundary ring left by `clearEdgeGround`, so an edge reads
 * cleanly on any ground (L72-10 fix round 1, spec v7 §5.5). Returns a new image.
 *
 * The ring is the opaque pixels with a 4-neighbour of alpha 0 or outside the image (the fill
 * seeds from the border, so it treats the outside as ground). Every other pixel, and the
 * input, is left untouched. Each ring pixel C is modelled as a blend of the ground G and a
 * foreground F taken from the opaque non-ring pixels within `FOREGROUND_RADIUS`: among the
 * candidates within `BLEND_RESIDUAL` of the line G-F, the one farthest from G. A second
 * anti-aliased row is also such a blend but sits closer to G, so it never wins over the solid
 * color. With no such candidate, the one with the smallest residual is used. With no
 * candidate at all, or F within `LIGHT_PART_DISTANCE` of G, the pixel stays as it is. Then
 * a = clamp(dot(C - G, F - G) / |F - G|^2, 0, 1), alpha becomes round(a * alpha) and the
 * color clamp(G + (C - G) / a), which composites back to C over G. The ring is computed from
 * the input in one pass, so the order of processing never matters.
 */
export function defringeEdge(image: RgbaImage, options: { readonly ground: Rgb }): RgbaImage {
  const { width, height } = image;
  const source = image.data;
  const data = new Uint8ClampedArray(source);
  const { ground } = options;

  const transparentAt = (x: number, y: number): boolean =>
    x < 0 || y < 0 || x >= width || y >= height || (source[(y * width + x) * 4 + 3] ?? 0) === 0;
  const ring = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (transparentAt(x, y)) continue;
      if (transparentAt(x - 1, y) || transparentAt(x + 1, y) || transparentAt(x, y - 1) || transparentAt(x, y + 1)) {
        ring[y * width + x] = 1;
      }
    }
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixel = y * width + x;
      if (ring[pixel] !== 1) continue;
      const offset = pixel * 4;
      const cr = (source[offset] ?? 0) - ground.r;
      const cg = (source[offset + 1] ?? 0) - ground.g;
      const cb = (source[offset + 2] ?? 0) - ground.b;

      let blend: Candidate | undefined;
      let closest: Candidate | undefined;
      for (let dy = -FOREGROUND_RADIUS; dy <= FOREGROUND_RADIUS; dy += 1) {
        for (let dx = -FOREGROUND_RADIUS; dx <= FOREGROUND_RADIUS; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (transparentAt(nx, ny) || ring[ny * width + nx] === 1) continue;
          const near = (ny * width + nx) * 4;
          const dr = (source[near] ?? 0) - ground.r;
          const dg = (source[near + 1] ?? 0) - ground.g;
          const db = (source[near + 2] ?? 0) - ground.b;
          const lengthSquared = dr * dr + dg * dg + db * db;
          if (lengthSquared === 0) continue;
          const fit = unit((cr * dr + cg * dg + cb * db) / lengthSquared);
          const residual = Math.hypot(cr - fit * dr, cg - fit * dg, cb - fit * db);
          const candidate: Candidate = { dr, dg, db, lengthSquared, residual };
          if (residual <= BLEND_RESIDUAL && (blend === undefined || lengthSquared > blend.lengthSquared)) {
            blend = candidate;
          }
          if (closest === undefined || residual < closest.residual) closest = candidate;
        }
      }

      const foreground = blend ?? closest;
      if (foreground === undefined || Math.sqrt(foreground.lengthSquared) < LIGHT_PART_DISTANCE) continue;
      const coverage = unit((cr * foreground.dr + cg * foreground.dg + cb * foreground.db) / foreground.lengthSquared);
      const alpha = Math.round(coverage * (source[offset + 3] ?? 0));
      if (alpha === 0) {
        data[offset + 3] = 0;
        continue;
      }
      data[offset] = Math.round(ground.r + cr / coverage);
      data[offset + 1] = Math.round(ground.g + cg / coverage);
      data[offset + 2] = Math.round(ground.b + cb / coverage);
      data[offset + 3] = alpha;
    }
  }

  return { width, height, data };
}
