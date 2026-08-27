/**
 * Helpers to stage play / token / buy-sell flyouts without delaying intents.
 */

import type { CardId } from '@card-battle/shared';

import { getCardArtUrl, getCardBackUrl, getResourceIconUrl, type ResourceKind } from '../design/asset-lookup';
import type { DomRectLite, TokenFlyoutEndpoint } from './table-fx-types';

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

function escapeSelector(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
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
 * Optional `playerId` scopes the resource origin to an opponent seat (L51-09).
 * Callers enqueue one event per unit of |Δ| with staggered delayMs.
 */
export function tokenFlyoutResourceSelector(
  kind: ResourceKind,
  playerId?: string,
): string {
  if (playerId !== undefined) {
    return `[data-zone="opponent-seat"][data-player-id="${escapeSelector(playerId)}"] [data-resource-kind="${escapeSelector(kind)}"]`;
  }
  return `[data-zone="resources"] [data-resource-kind="${escapeSelector(kind)}"]`;
}

export function tokenFlyoutSeatSelector(playerId: string): string {
  return `[data-zone="opponent-seat"][data-player-id="${escapeSelector(playerId)}"]`;
}

function rectForPlayerResource(kind: ResourceKind, playerId: string): DomRectLite | null {
  const opponentResource = document.querySelector(
    tokenFlyoutResourceSelector(kind, playerId),
  );
  const opponentSeat = document.querySelector(tokenFlyoutSeatSelector(playerId));
  if (opponentResource !== null || opponentSeat !== null) {
    return rectOf(opponentResource) ?? rectOf(opponentSeat);
  }
  const selfResource = document.querySelector(
    `[data-zone="private"][data-player-id="${escapeSelector(playerId)}"] [data-resource-kind="${escapeSelector(kind)}"]`,
  );
  const selfZone = document.querySelector(
    `[data-zone="private"][data-player-id="${escapeSelector(playerId)}"]`,
  );
  return rectOf(selfResource) ?? rectOf(selfZone);
}

function rectForEndpoint(
  endpoint: TokenFlyoutEndpoint,
  kind: ResourceKind,
): DomRectLite | null {
  if (endpoint === 'log') {
    return rectOf(document.querySelector('[data-zone="action-log-panel"]'));
  }
  return rectForPlayerResource(kind, endpoint.playerId);
}

function fannedChip(
  base: DomRectLite,
  index: number,
  size: number,
  fanScale: number,
): DomRectLite {
  const fanX = (index % 3) * 5 - 5;
  const fanY = Math.floor(index / 3) * 4;
  const chip = tokenRect(base, size);
  return {
    left: chip.left + fanX * fanScale,
    top: chip.top + fanY * fanScale,
    width: chip.width,
    height: chip.height,
  };
}

/**
 * Directed token chip (L51-11). Endpoints are the action log or a seat/dock.
 */
export function measureDirectedTokenFlyout(
  kind: ResourceKind,
  from: TokenFlyoutEndpoint,
  to: TokenFlyoutEndpoint,
  index = 0,
): { artUrl: string; from: DomRectLite; to: DomRectLite } | null {
  const fromRect = rectForEndpoint(from, kind);
  const toRect = rectForEndpoint(to, kind);
  if (fromRect === null || toRect === null) {
    return null;
  }
  const fromSize = from === 'log' ? 32 : 24;
  const toSize = to === 'log' ? 32 : 24;
  return {
    artUrl: getResourceIconUrl(kind),
    from: fannedChip(fromRect, index, fromSize, 1),
    to: fannedChip(toRect, index, toSize, 0.4),
  };
}

export function measureTokenFlyout(
  kind: ResourceKind,
  direction: 'gain' | 'loss',
  index = 0,
  playerId?: string,
): { artUrl: string; from: DomRectLite; to: DomRectLite } | null {
  if (playerId !== undefined) {
    return measureDirectedTokenFlyout(
      kind,
      direction === 'gain' ? 'log' : { playerId },
      direction === 'gain' ? { playerId } : 'log',
      index,
    );
  }
  const resourceEl = document.querySelector(tokenFlyoutResourceSelector(kind));
  const logEl = document.querySelector('[data-zone="action-log-panel"]');
  const resourceRect = rectOf(resourceEl);
  const log = rectOf(logEl);
  if (resourceRect === null || log === null) {
    return null;
  }
  const fromBase = direction === 'gain' ? log : resourceRect;
  const toBase = direction === 'gain' ? resourceRect : log;
  const fromSize = direction === 'gain' ? 32 : 24;
  const toSize = direction === 'gain' ? 24 : 32;
  return {
    artUrl: getResourceIconUrl(kind),
    from: fannedChip(fromBase, index, fromSize, 1),
    to: fannedChip(toBase, index, toSize, 0.4),
  };
}

/** Opponent sold-card ghost: seat portrait → action log (L51-11). */
export function measureOpponentCardLogFlyout(
  playerId: string,
  artUrl: string,
): { artUrl: string; from: DomRectLite; to: DomRectLite } | null {
  const from = rectOf(document.querySelector(tokenFlyoutSeatSelector(playerId)));
  const log = rectOf(document.querySelector('[data-zone="action-log-panel"]'));
  if (from === null || log === null) {
    return null;
  }
  return {
    artUrl,
    from: {
      left: from.left + from.width / 2 - 36,
      top: from.top + from.height / 2 - 54,
      width: 72,
      height: 108,
    },
    to: {
      left: log.left + log.width / 2 - 32,
      top: log.top + 12,
      width: 64,
      height: 96,
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
