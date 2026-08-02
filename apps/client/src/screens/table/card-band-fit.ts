/**
 * Pure layout math for CardBand — keep React refresh clean on the component file.
 */

export const CARD_BAND_GAP_PX = 6;
export const CARD_BAND_MIN_W = 40;
export const CARD_BAND_MAX_W = 72;
/** Face width / height (matches Card aspect-[3/4]). */
export const CARD_BAND_FACE_ASPECT = 3 / 4;

export interface CardBandFit {
  cardWidth: number;
  /** Max cards visible at once (all of them, or one page). */
  pageSize: number;
}

/**
 * Pick the largest card width that fits `count` cards in at most 2 rows.
 * If that still needs width < min, paginate at min width × 2 rows.
 */
export function fitCardBand(
  count: number,
  width: number,
  height: number,
): CardBandFit {
  if (count <= 0 || width <= 0 || height <= 0) {
    return { cardWidth: CARD_BAND_MIN_W, pageSize: 1 };
  }

  for (const rows of [1, 2] as const) {
    const rowGaps = CARD_BAND_GAP_PX * (rows - 1);
    const rowHeight = (height - rowGaps) / rows;
    if (rowHeight <= 0) {
      continue;
    }
    const fromHeight = rowHeight * CARD_BAND_FACE_ASPECT;
    const cols = Math.ceil(count / rows);
    const colGaps = CARD_BAND_GAP_PX * Math.max(0, cols - 1);
    const fromWidth = (width - colGaps) / cols;
    const cardWidth = Math.min(CARD_BAND_MAX_W, fromHeight, fromWidth);
    if (cardWidth >= CARD_BAND_MIN_W - 0.01) {
      return { cardWidth, pageSize: count };
    }
  }

  const cols = Math.max(
    1,
    Math.floor((width + CARD_BAND_GAP_PX) / (CARD_BAND_MIN_W + CARD_BAND_GAP_PX)),
  );
  const pageSize = Math.max(1, cols * 2);
  return { cardWidth: CARD_BAND_MIN_W, pageSize };
}
