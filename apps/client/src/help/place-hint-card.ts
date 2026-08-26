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

const GAP = 8;

export function placeHintCard(
  anchor: HintBox,
  card: Pick<HintBox, 'width' | 'height'>,
  viewport: Pick<HintBox, 'width' | 'height'>,
): HintPoint {
  let top = anchor.top + anchor.height + GAP;
  let left = anchor.left;

  if (top + card.height > viewport.height - GAP) {
    top = anchor.top - card.height - GAP;
  }

  if (top < GAP) {
    top = Math.max(GAP, anchor.top);
    left = anchor.left + anchor.width + GAP;
    if (left + card.width > viewport.width - GAP) {
      left = anchor.left - card.width - GAP;
    }
  }

  left = clamp(left, GAP, viewport.width - card.width - GAP);
  top = clamp(top, GAP, viewport.height - card.height - GAP);
  return { top, left };
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) {
    return min;
  }
  return Math.min(Math.max(value, min), max);
}
