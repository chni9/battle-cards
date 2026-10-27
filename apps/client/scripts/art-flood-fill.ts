/**
 * Ground removal for the V7 art extraction — technical spec v7 §5.5 (L72-10).
 *
 * The ground is removed by edge flood-fill, never by a global color key: a light part of a
 * drawing that matches the ground color (a blade highlight, an eye glint, a region enclosed by
 * an outline) survives unless the fill can reach it from the border through ground-colored
 * pixels. `clearEdgeGround` writes only alpha; every color channel is kept.
 *
 * `clearSeededGround` then clears the enclosed old-ground pockets the designer asked to remove,
 * each from a hand-placed seed (designer 2026-10-27, L72-10 fix round 3). It throws on a seed
 * that is not ground, so it can never erase drawing.
 *
 * `defringeEdge` finally un-blends the old ground out of the two pixel rings along every
 * cleared region: the opaque pixels next to it (or to the image edge), and the opaque pixels
 * next to those, guarded so a solid fill is never touched. Their anti-aliasing mixed the drawing
 * with the old ground, which reads as a light halo on the V7 dark grounds. It never reaches past
 * the second ring (L72-10 fix rounds 1 and 2, docs/agent/decisions.md 2026-10-26 and
 * 2026-10-27).
 */

/**
 * The extraction's ground tolerance (Euclidean RGB). The closest drawing fill to its ground is
 * 21.5 from it (#e6e6e6 on kit pink #f6dade), ground noise is at most 2.2, and the Attack Thief
 * residue is 13.1. `defringeEdge` derives its thresholds from the same value.
 */
export const GROUND_TOLERANCE = 16;

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

/** A pixel inside an enclosed old-ground pocket, in image coordinates. */
export interface PocketSeed {
  readonly x: number;
  readonly y: number;
}

/**
 * Clears the enclosed old-ground pockets that `seeds` sit in (designer 2026-10-27, L72-10 fix
 * round 3). Edge flood-fill cannot reach a pocket the drawing encloses, and a global color key
 * would also eat drawing parts that share the ground color (eye whites, skulls, the Ghost), so
 * each pocket is named by a seed placed by hand. From each seed the fill spreads 4-connected
 * through the opaque pixels within `tolerance` (Euclidean RGB, inclusive) of `ground` and sets
 * their alpha to 0. It never crosses a transparent pixel or another color, so it stays inside
 * the pocket. Only alpha is written, on a copy; the input is untouched.
 *
 * Throws when a seed is outside the image, transparent, or not ground within the tolerance: a
 * misplaced seed must fail loudly instead of erasing drawing.
 */
export function clearSeededGround(
  image: RgbaImage,
  seeds: readonly PocketSeed[],
  options: { readonly ground: Rgb; readonly tolerance: number },
): RgbaImage {
  const { width, height } = image;
  const data = new Uint8ClampedArray(image.data);
  const { ground, tolerance } = options;

  const isGround = (x: number, y: number): boolean => {
    if (x < 0 || y < 0 || x >= width || y >= height) return false;
    const offset = (y * width + x) * 4;
    if ((image.data[offset + 3] ?? 0) === 0) return false;
    const distance = Math.hypot(
      (image.data[offset] ?? 0) - ground.r,
      (image.data[offset + 1] ?? 0) - ground.g,
      (image.data[offset + 2] ?? 0) - ground.b,
    );
    return distance <= tolerance;
  };
  for (const seed of seeds) {
    if (!Number.isInteger(seed.x) || !Number.isInteger(seed.y) || !isGround(seed.x, seed.y)) {
      throw new Error(`Pocket seed ${seed.x},${seed.y} is not ground within ${tolerance}`);
    }
  }

  // Explicit stack, no recursion; each pixel is pushed at most once (marked when pushed).
  const visited = new Uint8Array(width * height);
  const stack = new Int32Array(width * height);
  let top = 0;
  const push = (x: number, y: number): void => {
    if (!isGround(x, y) || visited[y * width + x] === 1) return;
    visited[y * width + x] = 1;
    stack[top] = y * width + x;
    top += 1;
  };

  for (const seed of seeds) push(seed.x, seed.y);
  while (top > 0) {
    top -= 1;
    const pixel = stack[top] ?? 0;
    data[pixel * 4 + 3] = 0;
    const x = pixel % width;
    const y = (pixel - x) / width;
    push(x - 1, y);
    push(x + 1, y);
    push(x, y - 1);
    push(x, y + 1);
  }

  return { width, height, data };
}

/**
 * Window searched for a ring pixel's foreground. The drawings are flat fills whose
 * anti-aliasing spans at most two pixels across an edge, so a solid pixel of the shape the
 * ring pixel belongs to lies within two pixels of it.
 */
const FOREGROUND_RADIUS = 2;
/**
 * A foreground closer to the ground than this many tolerances is a light drawing part: a
 * blend of two colors that close reads as part of the light shape, not as a halo, and the
 * pixels within one tolerance are already cleared, so there is too little range left to
 * recover a coverage. Such ring pixels are left untouched (Ghost, Curse, Scientist's flask,
 * Assassin's blade edge, Attack Thief's white card at 45.6 from the cream ground).
 */
const LIGHT_PART_TOLERANCES = 3;

/** Ring membership: 1 next to the cleared region, 2 next to ring 1, 0 core or transparent. */
const FIRST_RING = 1;
const SECOND_RING = 2;

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
 * Removes the old ground from the two rings along the region `clearEdgeGround` cleared, so an
 * edge reads cleanly on any ground (L72-10 fix rounds 1 and 2, spec v7 §5.5). Returns a new
 * image; the input is never written.
 *
 * Ring 1 is the opaque pixels with a 4-neighbour of alpha 0 or outside the image (the fill
 * seeds from the border, so it treats the outside as ground). Ring 2 is the other opaque
 * pixels with a 4-neighbour in ring 1: the second anti-aliased row, and the stair-corner
 * pixels that touch the cleared region only diagonally. Every other pixel is left untouched,
 * so enclosed old-ground regions stay.
 *
 * Each ring pixel C is modelled as a blend of the ground G and a foreground F taken from the
 * opaque pixels within `FOREGROUND_RADIUS`: outside ring 1 for a ring 1 pixel, outside both
 * rings (the core) for a ring 2 pixel. Among the candidates within `tolerance` of the line
 * G-F, F is the one farthest from G, so a blended row never wins over the solid color and a
 * nearby color the pixel was not blended with is rejected. With no such candidate, F is the
 * candidate with the smallest residual (a corner where two colors meet the ground). With no
 * candidate at all (a thin part), or F within `LIGHT_PART_TOLERANCES` tolerances of G, the
 * pixel stays as it is. A ring 2 pixel within half the tolerance of a core 8-neighbour is a
 * solid fill and stays as it is too. Then a = clamp(dot(C - G, F - G) / |F - G|^2, 0, 1),
 * alpha becomes round(a * alpha) and the color clamp(G + (C - G) / a), which composites back
 * to C over G. The rings, the guard and every foreground are read only from the input, never
 * from the copy being written, so the order of processing never matters.
 *
 * Ring 1 still takes its foreground from ring 2 as well: excluding ring 2 would leave the
 * first ring of every part under five pixels wide without a candidate and bring its halo back.
 */
export function defringeEdge(
  image: RgbaImage,
  options: { readonly ground: Rgb; readonly tolerance?: number },
): RgbaImage {
  const { width, height } = image;
  const source = image.data;
  const data = new Uint8ClampedArray(source);
  const { ground } = options;
  const tolerance = options.tolerance ?? GROUND_TOLERANCE;
  // A blend may sit off the ground-foreground line by the same noise allowance as the ground.
  const blendResidual = tolerance;
  const lightPartDistance = LIGHT_PART_TOLERANCES * tolerance;
  // Half the tolerance is well above source noise (2.2), so a solid fill matches its core,
  // while a second-ring pixel holding a visible share of ground differs from it by more.
  const solidFillDistance = tolerance / 2;

  const transparentAt = (x: number, y: number): boolean =>
    x < 0 || y < 0 || x >= width || y >= height || (source[(y * width + x) * 4 + 3] ?? 0) === 0;
  const ring = new Uint8Array(width * height);
  const ringAt = (x: number, y: number): number =>
    x < 0 || y < 0 || x >= width || y >= height ? 0 : (ring[y * width + x] ?? 0);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (transparentAt(x, y)) continue;
      if (transparentAt(x - 1, y) || transparentAt(x + 1, y) || transparentAt(x, y - 1) || transparentAt(x, y + 1)) {
        ring[y * width + x] = FIRST_RING;
      }
    }
  }
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (transparentAt(x, y) || ringAt(x, y) !== 0) continue;
      if (
        ringAt(x - 1, y) === FIRST_RING ||
        ringAt(x + 1, y) === FIRST_RING ||
        ringAt(x, y - 1) === FIRST_RING ||
        ringAt(x, y + 1) === FIRST_RING
      ) {
        ring[y * width + x] = SECOND_RING;
      }
    }
  }
  /** Opaque and outside ring 1, or outside both rings when `coreOnly`. */
  const candidateAt = (x: number, y: number, coreOnly: boolean): boolean =>
    !transparentAt(x, y) && (coreOnly ? ringAt(x, y) === 0 : ringAt(x, y) !== FIRST_RING);
  const offsetDistance = (offset: number, x: number, y: number): number => {
    const near = (y * width + x) * 4;
    return Math.hypot(
      (source[offset] ?? 0) - (source[near] ?? 0),
      (source[offset + 1] ?? 0) - (source[near + 1] ?? 0),
      (source[offset + 2] ?? 0) - (source[near + 2] ?? 0),
    );
  };

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const pixel = y * width + x;
      const membership = ring[pixel] ?? 0;
      if (membership === 0) continue;
      const coreOnly = membership === SECOND_RING;
      const offset = pixel * 4;

      if (coreOnly) {
        let solid = false;
        for (let dy = -1; dy <= 1 && !solid; dy += 1) {
          for (let dx = -1; dx <= 1 && !solid; dx += 1) {
            if ((dx !== 0 || dy !== 0) && candidateAt(x + dx, y + dy, true)) {
              solid = offsetDistance(offset, x + dx, y + dy) <= solidFillDistance;
            }
          }
        }
        if (solid) continue;
      }

      const cr = (source[offset] ?? 0) - ground.r;
      const cg = (source[offset + 1] ?? 0) - ground.g;
      const cb = (source[offset + 2] ?? 0) - ground.b;
      let blend: Candidate | undefined;
      let closest: Candidate | undefined;
      for (let dy = -FOREGROUND_RADIUS; dy <= FOREGROUND_RADIUS; dy += 1) {
        for (let dx = -FOREGROUND_RADIUS; dx <= FOREGROUND_RADIUS; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (!candidateAt(nx, ny, coreOnly)) continue;
          const near = (ny * width + nx) * 4;
          const dr = (source[near] ?? 0) - ground.r;
          const dg = (source[near + 1] ?? 0) - ground.g;
          const db = (source[near + 2] ?? 0) - ground.b;
          const lengthSquared = dr * dr + dg * dg + db * db;
          if (lengthSquared === 0) continue;
          const fit = unit((cr * dr + cg * dg + cb * db) / lengthSquared);
          const residual = Math.hypot(cr - fit * dr, cg - fit * dg, cb - fit * db);
          const candidate: Candidate = { dr, dg, db, lengthSquared, residual };
          if (residual <= blendResidual && (blend === undefined || lengthSquared > blend.lengthSquared)) {
            blend = candidate;
          }
          if (closest === undefined || residual < closest.residual) closest = candidate;
        }
      }

      const foreground = blend ?? closest;
      if (foreground === undefined || Math.sqrt(foreground.lengthSquared) < lightPartDistance) continue;
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
