/**
 * The landscape-compact hand card size — technical spec v7 §5.4 (card sizes), §6.4 (landscape-compact
 * keeps every card readable with the hand scrolling inside itself); DESIGN.md › Card › Size contract,
 * "hand size rule" (L75-03). Pure: no React, no DOM.
 */

/** The Card `hand` clamp floor (`ui/card/card.tsx`): a hand card is never narrower. */
export const HAND_CARD_MIN_W_PX = 64;

/** The Card `hand` clamp ceiling. */
export const HAND_CARD_MAX_W_PX = 120;

/** Card height / width (`ui/card/card.tsx`: height = `--card-w` × 1.5). L75-13 reads it. */
export const HAND_CARD_ASPECT = 1.5;

/** A landscape hand card is this share of the visible height tall: at 390 px the arena keeps about 176 px under the top row (L75-03). */
const LANDSCAPE_HAND_CARD_HEIGHT_SHARE = 0.25;

/**
 * Landscape-compact: the hand card width (px) bound to the visible height (§5.4, §6.4), so a card
 * (1.5× tall) and the fan's vertical padding fit the shared bottom row. Clamped to the Card `hand`
 * clamp, [`HAND_CARD_MIN_W_PX`, `HAND_CARD_MAX_W_PX`]: 65 px at 390 px tall, the 64 px floor at 375 px.
 */
export function heightBoundHandCardWidthPx(visibleHeightPx: number): number {
  return Math.min(
    HAND_CARD_MAX_W_PX,
    Math.max(HAND_CARD_MIN_W_PX, Math.floor((visibleHeightPx * LANDSCAPE_HAND_CARD_HEIGHT_SHARE) / HAND_CARD_ASPECT)),
  );
}
