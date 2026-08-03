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
 * Token chip flyout — gain: source → resource row; loss: resource → economy.
 * Used for Draw (points chip), buy/sell UP, and resource deltas.
 */
export function measureTokenFlyout(
  kind: ResourceKind,
  direction: 'gain' | 'loss',
): { artUrl: string; from: DomRectLite; to: DomRectLite } | null {
  const resourceEl =
    document.querySelector(
      `[data-zone="resources"] [data-resource-kind="${CSS.escape(kind)}"]`,
    ) ?? document.querySelector(`[data-resource-kind="${CSS.escape(kind)}"]`);
  const economyEl =
    document.querySelector('[data-zone="economy-bar"]') ??
    document.querySelector('[data-zone="economy"]') ??
    document.querySelector('[data-zone="dock"]');
  const resource = rectOf(resourceEl);
  const economy = rectOf(economyEl);
  if (resource === null || economy === null) {
    return null;
  }
  const from = direction === 'gain' ? tokenRect(economy, 32) : tokenRect(resource, 32);
  const to = direction === 'gain' ? tokenRect(resource, 24) : tokenRect(economy, 24);
  return {
    artUrl: getResourceIconUrl(kind),
    from,
    to,
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
