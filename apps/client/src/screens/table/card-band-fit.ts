/**
 * Pure layout math for CardBand — one shared size, one row, horizontal scroll.
 * Width follows row height so the full face (art + name) stays visible (L53-07 /
 * technical spec v6 §6.2).
 */

export const CARD_BAND_GAP_PX = 6;
/**
 * Preferred floor when the row is tall enough. Designer 2026-09-01: the
 * previous 40/88 pair still filled the dock. Shrink below rather than crop.
 */
export const CARD_BAND_MIN_W = 22;
export const CARD_BAND_MAX_W = 48;
/** Floor used by collapse budgeting when height is unknown. */
export const CARD_BAND_ABS_MIN_W = 22;
/** Below this stacked-row width, Hand and Specials sit side by side. */
export const CARD_BAND_COMFORT_W = 32;
/**
 * Tailwind `aspect-[2/3]` on the art = width/height.
 * Face also adds a name line + button padding — see `faceCardHeight`.
 */
export const CARD_BAND_IMAGE_ASPECT = 2 / 3;
/** 10px name + mt-0.5 + border/line-box slack — keep this ≥ the rendered name line. */
const FACE_LABEL_PX = 20;
const FACE_PAD_PX = 12;
/** Hand + Specials labels in the band. */
export const CARD_BAND_LABEL_PX = 18;
export const CARD_BAND_SECTION_GAP_PX = 4;

export interface CardBandFit {
  cardWidth: number;
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

/** Height available for one card row inside a CardBand of `bandHeight`. */
export function cardBandRowHeight(
  bandHeight: number,
  specialsCount: number,
): number {
  const labels = CARD_BAND_LABEL_PX * 2;
  const emptySpecials = specialsCount === 0 ? CARD_BAND_LABEL_PX : 0;
  const rows = specialsCount > 0 ? 2 : 1;
  return Math.max(
    1,
    Math.floor((bandHeight - labels - emptySpecials - CARD_BAND_SECTION_GAP_PX) / rows),
  );
}

/**
 * Stacked Hand-over-Specials would make faces unreadably thin. Use one shared
 * row height (sections sit side by side) instead.
 */
export function cardBandSideBySide(
  bandHeight: number,
  specialsCount: number,
): boolean {
  if (specialsCount === 0 || bandHeight <= 0) {
    return false;
  }
  const split = cardBandRowHeight(bandHeight, specialsCount);
  return maxWidthForRowHeight(split) < CARD_BAND_COMFORT_W;
}

export function cardBandFitRowHeight(
  bandHeight: number,
  specialsCount: number,
): number {
  if (cardBandSideBySide(bandHeight, specialsCount)) {
    return Math.max(1, bandHeight - CARD_BAND_LABEL_PX - CARD_BAND_SECTION_GAP_PX);
  }
  return cardBandRowHeight(bandHeight, specialsCount);
}

/**
 * Shared card width: never taller than `rowHeight`, never above MAX.
 * Extra cards overflow horizontally — this helper does not wrap or paginate.
 */
export function fitCardBand(
  count: number,
  width: number,
  rowHeight = 0,
): CardBandFit {
  if (rowHeight > 0) {
    const noCrop = maxWidthForRowHeight(rowHeight);
    return { cardWidth: Math.max(1, Math.min(CARD_BAND_MAX_W, noCrop)) };
  }
  if (count <= 0 || width <= 0) {
    return { cardWidth: CARD_BAND_ABS_MIN_W };
  }
  const cols = Math.max(
    1,
    Math.floor((width + CARD_BAND_GAP_PX) / (CARD_BAND_ABS_MIN_W + CARD_BAND_GAP_PX)),
  );
  const usedCols = Math.min(count, cols);
  const colGaps = CARD_BAND_GAP_PX * Math.max(0, usedCols - 1);
  const fromWidth = (width - colGaps) / usedCols;
  const cardWidth = Math.min(
    CARD_BAND_MAX_W,
    Math.max(CARD_BAND_ABS_MIN_W, fromWidth),
  );
  return { cardWidth };
}
