/**
 * One-off art extraction — technical spec v7 §5.5 / §4.5.
 * Reads `images/` only through `ui/asset-files.ts`. Crop boxes and erase zones
 * drop the frame and the printed values; the catalogs own every number
 * (designer 2026-09-21). Run:
 * `pnpm --filter @card-battle/client exec tsx scripts/extract-art.ts`.
 */

import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ACTION_CARD_IDS, ATTACK_CARD_IDS, KIT_IDS, SPECIAL_CARD_IDS, type CardId } from '@card-battle/shared';
import sharp from 'sharp';

import { clearEdgeGround, type CropRect, type RgbaImage } from './art-flood-fill';
import { CARD_FILES, KIT_FILES } from '../src/ui/asset-files';
import { V7_COLORS } from '../src/ui/palette';

/** Fractions of the source width and height. */
interface Box {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/** Closest drawing fill to its ground: 21.5 (#e6e6e6 on kit pink #f6dade); noise ≤ 2.2; Attack Thief residue 13.1. */
const GROUND_TOLERANCE = 16;
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
const EXCLUDED_SOURCE = /\(dead\)|^Draw\.png$|_button\.png$/;
const IMAGES_DIR = new URL('../../../images/', import.meta.url);
const ART_DIR = new URL('../src/assets/art/', import.meta.url);
const SHEET_FILE = new URL('../.art-contact-sheet/contact-sheet.png', import.meta.url);
const SHEET_COLUMNS = 6;
const TILE_WIDTH = 120;
const TILE_HEIGHT = 174;
const GAP = 8;
const LABEL_HEIGHT = 20;
const CELL_WIDTH = 2 * TILE_WIDTH + 3 * GAP;
const CELL_HEIGHT = TILE_HEIGHT + LABEL_HEIGHT + 2 * GAP;

const imagesDir = fileURLToPath(IMAGES_DIR);
const artDir = fileURLToPath(ART_DIR);

interface Job {
  readonly id: string;
  readonly folder: 'cards' | 'kits';
  readonly sourceName: string;
  readonly box: Box;
  readonly erase: readonly Box[];
}

function jobs(): readonly Job[] {
  const cardIds = [...ATTACK_CARD_IDS, ...ACTION_CARD_IDS, ...SPECIAL_CARD_IDS];
  // KIT_IDS is a fixed-length tuple, so the comparison needs a widened number to stay a runtime guard.
  const kitCount: number = KIT_IDS.length;
  if (cardIds.length !== 31 || kitCount !== 16) {
    throw new Error(`Expected 31 cards and 16 kits, got ${cardIds.length} and ${kitCount}`);
  }
  const cardJobs: Job[] = cardIds.map((id) => ({
    id,
    folder: 'cards',
    sourceName: CARD_FILES[id].base,
    box: CARD_BOX,
    erase: CARD_ERASE[id] ?? [],
  }));
  const kitJobs: Job[] = KIT_IDS.map((id) => ({
    id,
    folder: 'kits',
    sourceName: KIT_FILES[id],
    box: KIT_BOX,
    erase: KIT_ERASE,
  }));
  const all = [...cardJobs, ...kitJobs];
  for (const job of all) {
    if (EXCLUDED_SOURCE.test(job.sourceName)) {
      throw new Error(`Excluded art source: ${job.sourceName}`);
    }
  }
  return all;
}

function boxRect(box: Box, width: number, height: number): CropRect {
  const left = Math.round(box.left * width);
  const top = Math.round(box.top * height);
  const rectWidth = Math.round(box.right * width) - left;
  const rectHeight = Math.round(box.bottom * height) - top;
  if (
    left < 0
    || top < 0
    || rectWidth <= 0
    || rectHeight <= 0
    || left + rectWidth > width
    || top + rectHeight > height
  ) {
    throw new Error(`Crop box is outside the image (${width}×${height})`);
  }
  return { left, top, width: rectWidth, height: rectHeight };
}

/** Sets alpha to 0 inside each box. RGB is left untouched. */
function eraseAlpha(data: Uint8ClampedArray, width: number, height: number, boxes: readonly Box[]): void {
  for (const box of boxes) {
    const rect = boxRect(box, width, height);
    for (let y = rect.top; y < rect.top + rect.height; y += 1) {
      for (let x = rect.left; x < rect.left + rect.width; x += 1) {
        data[(y * width + x) * 4 + 3] = 0;
      }
    }
  }
}

function cropImage(image: RgbaImage, rect: CropRect): RgbaImage {
  const data = new Uint8ClampedArray(rect.width * rect.height * 4);
  for (let y = 0; y < rect.height; y += 1) {
    const src = ((rect.top + y) * image.width + rect.left) * 4;
    data.set(image.data.subarray(src, src + rect.width * 4), y * rect.width * 4);
  }
  return { width: rect.width, height: rect.height, data };
}

function opaqueBounds(image: RgbaImage, id: string): CropRect {
  let left = image.width;
  let top = image.height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if ((image.data[(y * image.width + x) * 4 + 3] ?? 0) === 0) continue;
      if (x < left) left = x;
      if (y < top) top = y;
      if (x > right) right = x;
      if (y > bottom) bottom = y;
    }
  }
  if (right < left || bottom < top) {
    throw new Error(`${id}: nothing left after ground removal`);
  }
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

async function extractJob(job: Job): Promise<string> {
  const sourcePath = path.join(imagesDir, job.sourceName);
  const loaded = await sharp(sourcePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (loaded.info.channels !== 4) {
    throw new Error(`${job.id}: expected 4 channels, got ${loaded.info.channels}`);
  }
  const { width, height } = loaded.info;
  const full = Uint8ClampedArray.from(loaded.data);
  eraseAlpha(full, width, height, job.erase);
  const cropped = cropImage({ width, height, data: full }, boxRect(job.box, width, height));
  const cleared = clearEdgeGround(cropped, { tolerance: GROUND_TOLERANCE });
  const bounds = opaqueBounds(cleared, job.id);
  const outPath = path.join(artDir, job.folder, `${job.id}.png`);
  await sharp(Buffer.from(cleared.data), {
    raw: { width: cleared.width, height: cleared.height, channels: 4 },
  })
    .extract(bounds)
    .png({ compressionLevel: 9 })
    .toFile(outPath);
  console.log(`art/${job.folder}/${job.id}.png ${bounds.width}×${bounds.height} ← ${job.sourceName}`);
  return outPath;
}

const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 } as const;

function checkerboardSvg(): Buffer {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE_WIDTH}" height="${TILE_HEIGHT}">`
    + '<defs><pattern id="checker" width="16" height="16" patternUnits="userSpaceOnUse">'
    + '<rect width="8" height="8" fill="#ffffff"/>'
    + '<rect x="8" y="8" width="8" height="8" fill="#ffffff"/>'
    + '<rect x="8" width="8" height="8" fill="#c8c8c8"/>'
    + '<rect y="8" width="8" height="8" fill="#c8c8c8"/>'
    + '</pattern></defs>'
    + '<rect width="100%" height="100%" fill="url(#checker)"/>'
    + '</svg>',
  );
}

function labelSvg(text: string): Buffer {
  const escaped = text.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      default: return '&apos;';
    }
  });
  const width = 2 * TILE_WIDTH + GAP;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${LABEL_HEIGHT}">`
    + `<text x="0" y="14" fill="${V7_COLORS.text}" font-size="12" font-family="sans-serif">${escaped}</text>`
    + '</svg>',
  );
}

async function containTile(input: string): Promise<Buffer> {
  return sharp(input)
    .resize(TILE_WIDTH, TILE_HEIGHT, { fit: 'contain', background: TRANSPARENT })
    .png()
    .toBuffer();
}

interface SheetItem {
  readonly id: string;
  readonly folder: 'cards' | 'kits';
  readonly sourcePath: string;
  readonly outPath: string;
}

async function writeSheet(items: readonly SheetItem[]): Promise<void> {
  const rows = Math.ceil(items.length / SHEET_COLUMNS);
  const sheet = sharp({
    create: {
      width: SHEET_COLUMNS * CELL_WIDTH,
      height: rows * CELL_HEIGHT,
      channels: 4,
      background: V7_COLORS.panel,
    },
  });
  const checker = checkerboardSvg();
  const layers: { input: Buffer; top: number; left: number }[] = [];
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (item === undefined) continue;
    const column = index % SHEET_COLUMNS;
    const row = Math.floor(index / SHEET_COLUMNS);
    const cellX = column * CELL_WIDTH;
    const cellY = row * CELL_HEIGHT;
    const tileTop = cellY + GAP;
    const before = await containTile(item.sourcePath);
    const artTile = await containTile(item.outPath);
    const after = await sharp(checker).composite([{ input: artTile, top: 0, left: 0 }]).png().toBuffer();
    layers.push(
      { input: before, top: tileTop, left: cellX + GAP },
      { input: after, top: tileTop, left: cellX + GAP + TILE_WIDTH + GAP },
      { input: labelSvg(`${item.folder}/${item.id}`), top: tileTop + TILE_HEIGHT, left: cellX + GAP },
    );
  }
  await sheet.composite(layers).png({ compressionLevel: 9 }).toFile(fileURLToPath(SHEET_FILE));
}

async function main(): Promise<void> {
  await mkdir(path.join(artDir, 'cards'), { recursive: true });
  await mkdir(path.join(artDir, 'kits'), { recursive: true });
  await mkdir(path.dirname(fileURLToPath(SHEET_FILE)), { recursive: true });
  const items: SheetItem[] = [];
  for (const job of jobs()) {
    const outPath = await extractJob(job);
    items.push({
      id: job.id,
      folder: job.folder,
      sourcePath: path.join(imagesDir, job.sourceName),
      outPath,
    });
  }
  await writeSheet(items);
  console.log(
    'Extracted 31 cards and 16 kits. Contact sheet: apps/client/.art-contact-sheet/contact-sheet.png',
  );
}

await main();
