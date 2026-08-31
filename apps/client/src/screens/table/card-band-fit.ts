/**
 * Pure layout math for CardBand — wrap + vertical scroll, never shrink below 64px.
 * Height no longer shrinks width (Lot 53 / technical spec v6 §6.2).
 */

export const CARD_BAND_GAP_PX = 6;
/** Preferred minimum when space allows. Floor is 64 (Lot 53). */
export const CARD_BAND_MIN_W = 64;
export const CARD_BAND_MAX_W = 96;
/** Absolute floor — wrap and scroll rather than unreadably tiny faces. */
export const CARD_BAND_ABS_MIN_W = 64;
/**
 * Tailwind `aspect-[2/3]` on the art = width/height.
 * Face also adds a name line + button padding — see `faceCardHeight`.
 */
export const CARD_BAND_IMAGE_ASPECT = 2 / 3;
const FACE_LABEL_PX = 12;
const FACE_PAD_PX = 4;

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

/**
 * Card width that fits as many columns as possible at ≥ 64px, growing toward 96
 * when the band is wide. Height is ignored — the band scrolls instead of shrinking.
 */
export function fitCardBand(count: number, width: number): CardBandFit {
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
