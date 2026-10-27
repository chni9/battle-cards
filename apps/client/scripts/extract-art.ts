/**
 * One-off art extraction — technical spec v7 §5.5 / §4.5 (L72-10).
 *
 * Run: `pnpm --filter @card-battle/client exec tsx scripts/extract-art.ts`.
 *
 * Reads repo `images/` only through the `ui/asset-files.ts` maps (`CARD_FILES[id].base`,
 * `KIT_FILES[id]`), so it never opens a `(dead)`, `Draw.png`, `*_button.png` or activated file.
 * Writes `src/assets/art/{cards,kits}/<id>.png` (31 base cards incl. Roulette, 16 kits incl.
 * Gambler): transparent, trimmed, native resolution. The crop boxes and erase zones drop only
 * the frame and the printed values, because the catalogs own every number (designer
 * 2026-09-21; spec v7 §5.5: printed values are not authoritative). Ground removal is edge
 * flood-fill only (`art-flood-fill.ts`, which owns `GROUND_TOLERANCE`), never a global color
 * key. The old ground the drawings enclose is cleared from hand-placed seeds, one per pocket
 * (`POCKET_SEEDS`, designer 2026-10-27, fix round 3). The two rings along every cleared region
 * are then un-blended from the same ground so no halo of it is left (`defringeEdge`, fix
 * rounds 1 and 2). The two old-ground residues none of that reaches, at the ends of the
 * Reanimation shirt's lower edge, are erased like the printed values (`RESIDUE_ERASE`, fix
 * round 4).
 * Also writes the before/after contact sheet to the gitignored `apps/client/.art-contact-sheet/`
 * for the lot PR.
 */

import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import {
  ACTION_CARD_IDS,
  ATTACK_CARD_IDS,
  KIT_IDS,
  SPECIAL_CARD_IDS,
  type CardId,
  type KitId,
} from '@card-battle/shared';
import sharp, { type OverlayOptions } from 'sharp';

import { CARD_FILES, KIT_FILES } from '../src/ui/asset-files';
import { V7_COLORS } from '../src/ui/palette';
import {
  GROUND_TOLERANCE,
  clearEdgeGround,
  clearSeededGround,
  defringeEdge,
  edgeGroundColor,
  type CropRect,
  type RgbaImage,
} from './art-flood-fill';

/** Fractions of the source width and height. */
interface Box { readonly left: number; readonly top: number; readonly right: number; readonly bottom: number }
/** Attack, action and special faces: inside the frame, below the printed header (ends ≤ 0.143). */
const CARD_BOX: Box = { left: 0.06, top: 0.145, right: 0.94, bottom: 0.96 };
/** Kit faces: below the printed stat block (rows end at 0.347). */
const KIT_BOX: Box = { left: 0.06, top: 0.355, right: 0.94, bottom: 0.96 };
/** Kit fourth stat row (draw yield: x ≤ 0.266, y 0.373–0.445). No kit drawing enters it. */
const KIT_ERASE: readonly Box[] = [{ left: 0.04, top: 0.355, right: 0.28, bottom: 0.45 }];
/** Extra printed rows (top right) and the Super Mirror corner badge, measured per source. */
const CARD_ERASE: Partial<Record<CardId, readonly Box[]>> = {
  imposition: [{ left: 0.7, top: 0.145, right: 0.96, bottom: 0.3 }],
  'points-generator': [{ left: 0.7, top: 0.145, right: 0.96, bottom: 0.26 }],
  'super-absorber': [{ left: 0.7, top: 0.145, right: 0.96, bottom: 0.235 }],
  poison: [{ left: 0.7, top: 0.145, right: 0.96, bottom: 0.235 }],
  roulette: [{ left: 0.58, top: 0.145, right: 0.96, bottom: 0.33 }],
  'super-mirror': [{ left: 0.74, top: 0.8, right: 0.96, bottom: 0.96 }],
};
/**
 * Old-ground residue that neither the defringe rings nor a pocket seed can reach, erased like
 * the printed areas before ground removal (designer 2026-10-27, L72-10 fix round 4). At both
 * ends of the Reanimation shirt's lower edge the 1 px anti-aliased row is a uniform blend, so
 * the ring-2 solid-fill guard in `defringeEdge` keeps it, and its pixels are 26 to 128 from the
 * ground, too far for a seed. `defringeEdge` then un-blends the new edge around each box.
 * Exact pixels of the 365 × 530 `Reanimation.png`: row 374, x 109–113 and 252–255; row 375,
 * x 110–111 and 254–255.
 */
const RESIDUE_ERASE: Partial<Record<CardId, readonly Box[]>> = {
  reanimation: [
    { left: 109 / 365, top: 374 / 530, right: 114 / 365, bottom: 375 / 530 }, // left end
    { left: 110 / 365, top: 375 / 530, right: 112 / 365, bottom: 376 / 530 },
    { left: 252 / 365, top: 374 / 530, right: 256 / 365, bottom: 375 / 530 }, // right end
    { left: 254 / 365, top: 375 / 530, right: 256 / 365, bottom: 376 / 530 },
  ],
};
/**
 * One seed inside each enclosed old-ground pocket, as fractions of the crop box (designer
 * 2026-10-27: remove what is left of the old card grounds inside the drawings). Found by a
 * detector over every opaque region within `GROUND_TOLERANCE` of an asset's ground, then
 * sorted by hand; the regions that are drawing parts (eye glints, the Tax minus, the
 * Regeneration plus, blood-drop highlights) and the two 1 px Points Generator pixels (left as
 * near-transparent blue tints by `defringeEdge`) have no seed. Never a global color key: it
 * would eat those parts, the skulls and the Ghost.
 */
const POCKET_SEEDS: Partial<Record<CardId | KitId, readonly { x: number; y: number }[]>> = {
  'strong-attack': [{ x: 0.522, y: 0.552 }], // diamond between the guards
  mirror: [{ x: 0.5, y: 0.263 }], // hanger triangle
  cloning: [
    { x: 0.699, y: 0.288 }, // upper tail stripe
    { x: 0.606, y: 0.36 }, // loop stripes, top to bottom
    { x: 0.5, y: 0.436 },
    { x: 0.397, y: 0.513 },
    { x: 0.301, y: 0.582 }, // lower tail stripe
  ],
  block: [{ x: 0.403, y: 0.388 }, { x: 0.593, y: 0.529 }], // both halves of the disc
  reanimation: [{ x: 0.674, y: 0.214 }, { x: 0.5, y: 0.714 }], // band by the brim, crescent under the shoulders
  'mega-attack': [{ x: 0.5, y: 0.58 }, { x: 0.556, y: 0.677 }], // nose, tooth gap closed by the knife
  untouchable: [{ x: 0.326, y: 0.696 }, { x: 0.671, y: 0.696 }], // both lenses
  specialist: [{ x: 0.5, y: 0.516 }], // gear hole
  duplicator: [{ x: 0.385, y: 0.524 }], // sliver under the arrow
};
const EXCLUDED_SOURCE = /\(dead\)|^Draw\.png$|_button\.png$/;
const IMAGES_DIR = new URL('../../../images/', import.meta.url);
const ART_DIR = new URL('../src/assets/art/', import.meta.url);
const SHEET_FILE = new URL('../.art-contact-sheet/contact-sheet.png', import.meta.url);
const SHEET_COLUMNS = 6, TILE_WIDTH = 120, TILE_HEIGHT = 174, GAP = 8, LABEL_HEIGHT = 20;

type ArtFolder = 'cards' | 'kits';

interface Job {
  readonly id: CardId | KitId;
  readonly folder: ArtFolder;
  readonly source: string;
  readonly box: Box;
  readonly erase: readonly Box[];
  readonly pockets: readonly { readonly x: number; readonly y: number }[];
}

interface Extracted {
  readonly job: Job;
  readonly sourcePath: string;
  readonly outputPath: string;
}

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 } as const;

/** Every base card in catalog order, then every kit; the 31 + 16 of spec v7 §5.5. */
function buildJobs(): Job[] {
  const cards = [...ATTACK_CARD_IDS, ...ACTION_CARD_IDS, ...SPECIAL_CARD_IDS].map(
    (id): Job => ({
      id,
      folder: 'cards',
      source: CARD_FILES[id].base,
      box: CARD_BOX,
      erase: [...(CARD_ERASE[id] ?? []), ...(RESIDUE_ERASE[id] ?? [])],
      pockets: POCKET_SEEDS[id] ?? [],
    }),
  );
  const kits = KIT_IDS.map(
    (id): Job => ({
      id,
      folder: 'kits',
      source: KIT_FILES[id],
      box: KIT_BOX,
      erase: KIT_ERASE,
      pockets: POCKET_SEEDS[id] ?? [],
    }),
  );
  if (cards.length !== 31 || kits.length !== 16) {
    throw new Error(`Expected 31 cards and 16 kits, got ${cards.length} and ${kits.length}`);
  }
  const jobs = [...cards, ...kits];
  const excluded = jobs.find((job) => EXCLUDED_SOURCE.test(job.source));
  if (excluded !== undefined) throw new Error(`${excluded.id}: excluded source ${excluded.source}`);
  return jobs;
}

/** A fractional box in pixels of a `width` × `height` source. */
function rectFor(box: Box, width: number, height: number): CropRect {
  const left = Math.round(box.left * width);
  const top = Math.round(box.top * height);
  return { left, top, width: Math.round(box.right * width) - left, height: Math.round(box.bottom * height) - top };
}

/** A copy of `image` with alpha 0 inside every erase box; color channels are kept. */
function erase(image: RgbaImage, boxes: readonly Box[]): RgbaImage {
  const data = new Uint8ClampedArray(image.data);
  for (const box of boxes) {
    const rect = rectFor(box, image.width, image.height);
    for (let y = Math.max(0, rect.top); y < Math.min(image.height, rect.top + rect.height); y += 1) {
      for (let x = Math.max(0, rect.left); x < Math.min(image.width, rect.left + rect.width); x += 1) {
        data[(y * image.width + x) * 4 + 3] = 0;
      }
    }
  }
  return { width: image.width, height: image.height, data };
}

function crop(image: RgbaImage, rect: CropRect): RgbaImage {
  const data = new Uint8ClampedArray(rect.width * rect.height * 4);
  for (let y = 0; y < rect.height; y += 1) {
    const from = ((rect.top + y) * image.width + rect.left) * 4;
    data.set(image.data.subarray(from, from + rect.width * 4), y * rect.width * 4);
  }
  return { width: rect.width, height: rect.height, data };
}

/** The bounds of the pixels with alpha > 0, or `undefined` when none is left. */
function opaqueBounds(image: RgbaImage): CropRect | undefined {
  let minX = image.width, minY = image.height, maxX = -1, maxY = -1;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if ((image.data[(y * image.width + x) * 4 + 3] ?? 0) === 0) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < 0) return undefined;
  return { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

async function extract(job: Job): Promise<Extracted> {
  const sourcePath = fileURLToPath(new URL(job.source, IMAGES_DIR));
  const outputPath = fileURLToPath(new URL(`${job.folder}/${job.id}.png`, ART_DIR));
  const { data, info } = await sharp(sourcePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.channels !== 4 || data.byteLength !== info.width * info.height * 4) {
    throw new Error(`${job.id}: expected 8-bit RGBA from ${job.source}, got ${info.channels} channels`);
  }
  const source: RgbaImage = {
    width: info.width,
    height: info.height,
    data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength),
  };
  const erased = erase(source, job.erase);
  const cropped = crop(erased, rectFor(job.box, source.width, source.height));
  const ground = edgeGroundColor(cropped);
  if (ground === undefined) throw new Error(`${job.id}: no opaque ground on the crop border`);
  const cleared = clearEdgeGround(cropped, { tolerance: GROUND_TOLERANCE });
  const seeds = job.pockets.map(({ x, y }) => ({
    x: Math.floor(x * cleared.width),
    y: Math.floor(y * cleared.height),
  }));
  const opened = clearSeededGround(cleared, seeds, { ground, tolerance: GROUND_TOLERANCE });
  const art = defringeEdge(opened, { ground, tolerance: GROUND_TOLERANCE });
  const bounds = opaqueBounds(art);
  if (bounds === undefined) throw new Error(`${job.id}: nothing left after ground removal`);
  await sharp(art.data, { raw: { width: art.width, height: art.height, channels: 4 } })
    .extract(bounds)
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
  console.log(`art/${job.folder}/${job.id}.png ${bounds.width}×${bounds.height} ← ${job.source}`);
  return { job, sourcePath, outputPath };
}

/** An 8 px #ffffff / #c8c8c8 checkerboard, so transparency reads on the contact sheet. */
function checkerboardSvg(width: number, height: number): Buffer {
  const squares: string[] = [];
  for (let y = 0; y < height; y += 8) {
    for (let x = (y / 8) % 2 === 0 ? 8 : 0; x < width; x += 16) {
      squares.push(`<rect x="${x}" y="${y}" width="8" height="8" fill="#c8c8c8"/>`);
    }
  }
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
      `<rect width="${width}" height="${height}" fill="#ffffff"/>${squares.join('')}</svg>`,
  );
}

function labelSvg(text: string, width: number): Buffer {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${LABEL_HEIGHT}">` +
      `<text x="0" y="14" font-family="sans-serif" font-size="12" fill="${V7_COLORS.text}">${text}</text></svg>`,
  );
}

function tile(input: string): Promise<Buffer> {
  return sharp(input).resize(TILE_WIDTH, TILE_HEIGHT, { fit: 'contain', background: TRANSPARENT }).png().toBuffer();
}

/** Before (source) and after (extracted, over a checkerboard) per asset, six assets per row. */
async function writeContactSheet(extracted: readonly Extracted[]): Promise<void> {
  const cellWidth = 2 * TILE_WIDTH + 3 * GAP;
  const cellHeight = TILE_HEIGHT + LABEL_HEIGHT + 2 * GAP;
  const rows = Math.ceil(extracted.length / SHEET_COLUMNS);
  const overlays: OverlayOptions[] = [];
  for (const [index, { job, sourcePath, outputPath }] of extracted.entries()) {
    const left = (index % SHEET_COLUMNS) * cellWidth;
    const top = Math.floor(index / SHEET_COLUMNS) * cellHeight;
    const after = await sharp(checkerboardSvg(TILE_WIDTH, TILE_HEIGHT))
      .composite([{ input: await tile(outputPath) }])
      .png()
      .toBuffer();
    overlays.push(
      { input: await tile(sourcePath), left: left + GAP, top: top + GAP },
      { input: after, left: left + 2 * GAP + TILE_WIDTH, top: top + GAP },
      { input: labelSvg(`${job.folder}/${job.id}`, 2 * TILE_WIDTH + GAP), left: left + GAP, top: top + GAP + TILE_HEIGHT },
    );
  }
  await sharp({
    create: { width: SHEET_COLUMNS * cellWidth, height: rows * cellHeight, channels: 4, background: V7_COLORS.panel },
  })
    .composite(overlays)
    .png()
    .toFile(fileURLToPath(SHEET_FILE));
}

async function main(): Promise<void> {
  await mkdir(new URL('cards/', ART_DIR), { recursive: true });
  await mkdir(new URL('kits/', ART_DIR), { recursive: true });
  await mkdir(new URL('./', SHEET_FILE), { recursive: true });
  const extracted: Extracted[] = [];
  for (const job of buildJobs()) extracted.push(await extract(job));
  await writeContactSheet(extracted);
  const count = (folder: ArtFolder): number => extracted.filter(({ job }) => job.folder === folder).length;
  console.log(
    `Extracted ${count('cards')} cards and ${count('kits')} kits. Contact sheet: apps/client/.art-contact-sheet/contact-sheet.png`,
  );
}

await main();
