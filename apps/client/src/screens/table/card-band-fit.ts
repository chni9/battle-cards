/**
 * Pure layout math for CardBand — keep React refresh clean on the component file.
 *
 * Face cards use `aspect-[2/3]` art plus a name line (`Card detail="face"`), so height
 * is not a pure aspect ratio — always reserve label chrome or faces crop.
 */

export const CARD_BAND_GAP_PX = 6;
/** Preferred minimum when space allows; may shrink below this to avoid cropping. */
export const CARD_BAND_MIN_W = 40;
export const CARD_BAND_MAX_W = 72;
/** Absolute floor — below this, paginate rather than unreadably tiny faces. */
export const CARD_BAND_ABS_MIN_W = 24;
/**
 * Tailwind `aspect-[2/3]` on the art = width/height.
 * Face also adds a name line + button padding — see `faceCardHeight`.
 */
export const CARD_BAND_IMAGE_ASPECT = 2 / 3;
const FACE_LABEL_PX = 12;
const FACE_PAD_PX = 4;

export interface CardBandFit {
  cardWidth: number;
  /** Max cards visible at once (all of them, or one page). */
  pageSize: number;
}

/** Total pixel height of one face card at the given width. */
export function faceCardHeight(width: number): number {
  return width / CARD_BAND_IMAGE_ASPECT + FACE_LABEL_PX + FACE_PAD_PX;
}

/** Max width whose full face (art + name) fits in `rowHeight`. */
export function maxWidthForRowHeight(rowHeight: number): number {
  const forArt = rowHeight - FACE_LABEL_PX - FACE_PAD_PX;
  if (forArt <= 0) {
    return 0;
  }
  return forArt * CARD_BAND_IMAGE_ASPECT;
}

/**
 * Largest card width that fits `count` cards in at most 2 rows without cropping.
 * Shrinks below the preferred min when needed; paginates only under the absolute floor.
 */
export function fitCardBand(
  count: number,
  width: number,
  height: number,
): CardBandFit {
  if (count <= 0 || width <= 0 || height <= 0) {
    return { cardWidth: CARD_BAND_ABS_MIN_W, pageSize: 1 };
  }

  let best: CardBandFit | null = null;

  for (const rows of [1, 2] as const) {
    const rowGaps = CARD_BAND_GAP_PX * (rows - 1);
    const rowHeight = (height - rowGaps) / rows;
    if (rowHeight <= 0) {
      continue;
    }
    const fromHeight = maxWidthForRowHeight(rowHeight);
    if (fromHeight < 1) {
      continue;
    }
    const cols = Math.ceil(count / rows);
    const colGaps = CARD_BAND_GAP_PX * Math.max(0, cols - 1);
    const fromWidth = (width - colGaps) / cols;
    const cardWidth = Math.min(CARD_BAND_MAX_W, fromHeight, fromWidth);
    if (cardWidth < 1) {
      continue;
    }
    /* Prefer keeping all cards visible whenever width stays readable. */
    if (cardWidth < CARD_BAND_ABS_MIN_W - 0.01 && count > 1) {
      /* Still a valid no-crop fit — keep as candidate; pagination may beat it. */
    }
    const candidate: CardBandFit = { cardWidth, pageSize: count };
    if (
      best === null ||
      candidate.cardWidth > best.cardWidth ||
      (Math.abs(candidate.cardWidth - best.cardWidth) < 0.01 && rows === 1)
    ) {
      best = candidate;
    }
  }

  if (best !== null && best.cardWidth >= CARD_BAND_ABS_MIN_W - 0.01) {
    return best;
  }

  /* Paginate at a width that still fully fits in two rows (or one if shorter). */
  const rowsForPage: 1 | 2 = height >= faceCardHeight(CARD_BAND_ABS_MIN_W) * 2 + CARD_BAND_GAP_PX ? 2 : 1;
  const rowGaps = CARD_BAND_GAP_PX * (rowsForPage - 1);
  const rowHeight = (height - rowGaps) / rowsForPage;
  const cardWidth = Math.min(
    CARD_BAND_MAX_W,
    Math.max(1, maxWidthForRowHeight(rowHeight)),
    width,
  );
  const cols = Math.max(
    1,
    Math.floor((width + CARD_BAND_GAP_PX) / (cardWidth + CARD_BAND_GAP_PX)),
  );
  const pageSize = Math.max(1, cols * rowsForPage);

  /* If a non-paginated tiny fit shows more cards than one page, prefer pagination
     only when it actually reduces overflow pressure (pageSize < count). */
  if (best !== null && pageSize >= count) {
    return best;
  }
  return { cardWidth, pageSize };
}
