/**
 * Place a first-game hint card next to its `data-hint-anchor` (L46-02).
 * No rings or arrows — coordinates only.
 */

export interface HintBox {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  readonly height: number;
}

export interface HintPoint {
  readonly top: number;
  readonly left: number;
}

export interface PlaceHintOptions {
  /** Default `below`. Hand / Specials use `beside` so a tall dock section cannot dump the card. */
  readonly prefer?: 'below' | 'above' | 'beside';
}

const GAP = 8;

export function placeHintCard(
  anchor: HintBox,
  card: Pick<HintBox, 'width' | 'height'>,
  viewport: Pick<HintBox, 'width' | 'height'>,
  options: PlaceHintOptions = {},
): HintPoint {
  const prefer = options.prefer ?? 'below';
  const belowTop = anchor.top + anchor.height + GAP;
  const aboveTop = anchor.top - card.height - GAP;
  const belowFits = belowTop + card.height <= viewport.height - GAP;
  const aboveFits = aboveTop >= GAP;
  const beside = besidePoint(anchor, card, viewport);

  let top: number;
  let left: number;

  if (prefer === 'beside') {
    if (beside !== null) {
      return clampPoint(beside, card, viewport);
    }
    if (aboveFits) {
      top = aboveTop;
      left = anchor.left;
    } else if (belowFits) {
      top = belowTop;
      left = anchor.left;
    } else {
      top = anchor.top;
      left = GAP;
    }
  } else if (prefer === 'above') {
    if (aboveFits) {
      top = aboveTop;
      left = anchor.left;
    } else if (belowFits) {
      top = belowTop;
      left = anchor.left;
    } else if (beside !== null) {
      return clampPoint(beside, card, viewport);
    } else {
      top = Math.max(GAP, anchor.top);
      left = GAP;
    }
  } else if (belowFits) {
    top = belowTop;
    left = anchor.left;
  } else if (aboveFits) {
    top = aboveTop;
    left = anchor.left;
  } else if (beside !== null) {
    return clampPoint(beside, card, viewport);
  } else {
    top = Math.max(GAP, anchor.top);
    left = anchor.left + anchor.width + GAP;
  }

  return clampPoint({ top, left }, card, viewport);
}

/**
 * Left or right of the anchor, vertically centered. Null when neither side fits.
 * A full-width dock section returns null — callers must not use it as the Hand
 * / Specials anchor (designer 2026-08-29).
 */
function besidePoint(
  anchor: HintBox,
  card: Pick<HintBox, 'width' | 'height'>,
  viewport: Pick<HintBox, 'width' | 'height'>,
): HintPoint | null {
  const top = anchor.top + (anchor.height - card.height) / 2;
  const right = anchor.left + anchor.width + GAP;
  const left = anchor.left - card.width - GAP;
  const rightFits = right + card.width <= viewport.width - GAP;
  const leftFits = left >= GAP;
  if (!rightFits && !leftFits) {
    return null;
  }
  if (rightFits && leftFits) {
    const spaceRight = viewport.width - (anchor.left + anchor.width);
    const spaceLeft = anchor.left;
    return { top, left: spaceRight >= spaceLeft ? right : left };
  }
  return { top, left: rightFits ? right : left };
}

function clampPoint(
  point: HintPoint,
  card: Pick<HintBox, 'width' | 'height'>,
  viewport: Pick<HintBox, 'width' | 'height'>,
): HintPoint {
  return {
    top: clamp(point.top, GAP, viewport.height - card.height - GAP),
    left: clamp(point.left, GAP, viewport.width - card.width - GAP),
  };
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}
