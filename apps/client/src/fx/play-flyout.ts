/**
 * Helpers to stage play / token / buy-sell flyouts without delaying intents.
 */

import type { CardId } from '@card-battle/shared';

import { getCardArtUrl, getCardBackUrl, getResourceIconUrl, type ResourceKind } from '../design/asset-lookup';
import type { DomRectLite } from './table-fx-types';

function rectOf(el: Element | null): DomRectLite | null {
  if (el === null) {
    return null;
  }
  const r = el.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) {
    return null;
  }
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

function tokenRect(center: DomRectLite, size = 28): DomRectLite {
  return {
    left: center.left + center.width / 2 - size / 2,
    top: center.top + center.height / 2 - size / 2,
    width: size,
    height: size,
  };
}

export function measurePlayFlyout(
  instanceId: string,
  cardId: CardId,
  isUpgraded: boolean,
): { artUrl: string; from: DomRectLite; to: DomRectLite } | null {
  const from =
    rectOf(document.querySelector(`[data-instance-id="${CSS.escape(instanceId)}"]`)) ??
    rectOf(document.querySelector('[data-zone="hand"]')) ??
    rectOf(document.querySelector('[data-zone="dock"]'));
  const to =
    rectOf(document.querySelector('[data-zone="pending"]')) ??
    rectOf(document.querySelector('[data-zone="felt"]'));
  if (from === null || to === null) {
    return null;
  }
  return {
    artUrl: getCardArtUrl(cardId, { isUpgraded }),
    from,
    to,
  };
}

/**
 * Token chip flyout — gain: action log → resource; loss: resource → action log.
 * Callers enqueue one event per unit of |Δ| with staggered delayMs.
 */
export function measureTokenFlyout(
  kind: ResourceKind,
  direction: 'gain' | 'loss',
  index = 0,
): { artUrl: string; from: DomRectLite; to: DomRectLite } | null {
  const resourceEl =
    document.querySelector(
      `[data-zone="resources"] [data-resource-kind="${CSS.escape(kind)}"]`,
    ) ?? document.querySelector(`[data-resource-kind="${CSS.escape(kind)}"]`);
  const logEl = document.querySelector('[data-zone="action-log-panel"]');
  const resource = rectOf(resourceEl);
  const log = rectOf(logEl);
  if (resource === null || log === null) {
    return null;
  }
  // Slight fan so stacked chips are readable before/while staggering.
  const fanX = (index % 3) * 5 - 5;
  const fanY = Math.floor(index / 3) * 4;
  const logChip = tokenRect(log, 32);
  const resourceChip = tokenRect(resource, 24);
  const fromBase = direction === 'gain' ? logChip : resourceChip;
  const toBase = direction === 'gain' ? resourceChip : logChip;
  return {
    artUrl: getResourceIconUrl(kind),
    from: {
      left: fromBase.left + fanX,
      top: fromBase.top + fanY,
      width: fromBase.width,
      height: fromBase.height,
    },
    to: {
      left: toBase.left + fanX * 0.4,
      top: toBase.top + fanY * 0.4,
      width: toBase.width,
      height: toBase.height,
    },
  };
}

/** Buy card: from Buy control toward hand. */
export function measureBuyCardFlyout(
  cardId: CardId,
  isUpgraded = false,
): { artUrl: string; from: DomRectLite; to: DomRectLite } | null {
  const from =
    rectOf(document.querySelector('[data-zone="economy-bar"]')) ??
    rectOf(document.querySelector('[data-zone="economy"]'));
  const to =
    rectOf(document.querySelector('[data-zone="hand"]')) ??
    rectOf(document.querySelector('[data-zone="card-band"]'));
  if (from === null || to === null) {
    return null;
  }
  return {
    artUrl: getCardArtUrl(cardId, { isUpgraded }),
    from: {
      left: from.left + from.width / 2 - 36,
      top: from.top - 12,
      width: 72,
      height: 108,
    },
    to: {
      left: to.left + to.width / 2 - 40,
      top: to.top + 8,
      width: 80,
      height: 120,
    },
  };
}

/** Buy special (unknown id until state arrives): verso special → hand. */
export function measureBuySpecialFlyout(): {
  artUrl: string;
  from: DomRectLite;
  to: DomRectLite;
} | null {
  const from =
    rectOf(document.querySelector('[data-zone="economy-bar"]')) ??
    rectOf(document.querySelector('[data-zone="economy"]'));
  const to =
    rectOf(document.querySelector('[data-zone="specials"]')) ??
    rectOf(document.querySelector('[data-zone="card-band"]')) ??
    rectOf(document.querySelector('[data-zone="hand"]'));
  if (from === null || to === null) {
    return null;
  }
  return {
    artUrl: getCardBackUrl('special'),
    from: {
      left: from.left + from.width / 2 - 36,
      top: from.top - 12,
      width: 72,
      height: 108,
    },
    to: {
      left: to.left + to.width / 2 - 40,
      top: to.top + 8,
      width: 80,
      height: 120,
    },
  };
}

/** Sell card: from held instance toward economy. */
export function measureSellCardFlyout(
  instanceId: string,
  cardId: CardId,
  isUpgraded: boolean,
): { artUrl: string; from: DomRectLite; to: DomRectLite } | null {
  const from =
    rectOf(document.querySelector(`[data-instance-id="${CSS.escape(instanceId)}"]`)) ??
    rectOf(document.querySelector('[data-zone="hand"]'));
  const to =
    rectOf(document.querySelector('[data-zone="economy-bar"]')) ??
    rectOf(document.querySelector('[data-zone="economy"]'));
  if (from === null || to === null) {
    return null;
  }
  return {
    artUrl: getCardArtUrl(cardId, { isUpgraded }),
    from,
    to: {
      left: to.left + to.width / 2 - 28,
      top: to.top - 8,
      width: 56,
      height: 84,
    },
  };
}

/** Targeting cue: pulse/highlight the source opponent seat (L39-05). */
export function measureTargetingCue(
  fromPlayerId: string,
  toPlayerId: string,
): { from: DomRectLite; to: DomRectLite } | null {
  void toPlayerId;
  const from =
    rectOf(document.querySelector(`[data-player-id="${CSS.escape(fromPlayerId)}"]`)) ??
    rectOf(document.querySelector(`[data-seat="${CSS.escape(fromPlayerId)}"]`));
  if (from === null) {
    return null;
  }
  // `to` kept for the event shape; pulse only uses `from` (opponent seat).
  return { from, to: from };
}
