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

/** POV dock root — `data-zone="private"` is a wrapper without `data-player-id`. */
export function tokenFlyoutPovSelector(playerId: string): string {
  return `[data-zone="private-zone"][data-player-id="${escapeSelector(playerId)}"]`;
}

function rectForPlayerResource(kind: ResourceKind, playerId: string): DomRectLite | null {
  const opponentResource = document.querySelector(
    tokenFlyoutResourceSelector(kind, playerId),
  );
  if (opponentResource !== null) {
    return rectOf(opponentResource);
  }
  const opponentSeat = document.querySelector(tokenFlyoutSeatSelector(playerId));
  if (opponentSeat !== null) {
    return rectOf(opponentSeat);
  }
  const selfRoot = document.querySelector(tokenFlyoutPovSelector(playerId));
  if (selfRoot === null) {
    return null;
  }
  return (
    rectOf(selfRoot.querySelector(`[data-resource-kind="${escapeSelector(kind)}"]`)) ??
    rectOf(selfRoot)
  );
}

function rectForPlayerSeatOrPortrait(playerId: string): DomRectLite | null {
  const opponentPortrait = document.querySelector(
    `${tokenFlyoutSeatSelector(playerId)} [data-zone="opponent-portrait"]`,
  );
  const opponentSeat = document.querySelector(tokenFlyoutSeatSelector(playerId));
  const opponent = rectOf(opponentPortrait) ?? rectOf(opponentSeat);
  if (opponent !== null) {
    return opponent;
  }
  const dock = document.querySelector(tokenFlyoutPovSelector(playerId));
  return (
    rectOf(dock?.querySelector('[data-zone="kit-portrait"]') ?? null) ??
    rectOf(dock)
  );
}

function rectForEndpoint(
  endpoint: TokenFlyoutEndpoint,
  kind: ResourceKind,
  preferSeat: boolean,
): DomRectLite | null {
  if (endpoint === 'log') {
    return rectOf(document.querySelector('[data-zone="action-log-panel"]'));
  }
  if (preferSeat) {
    return (
      rectForPlayerSeatOrPortrait(endpoint.playerId) ??
      rectForPlayerResource(kind, endpoint.playerId)
    );
  }
  return rectForPlayerResource(kind, endpoint.playerId);
}

/**
 * Directed token chip (L51-11). Endpoints are the action log or a seat/dock.
 * Seat-to-seat (thief) aims at portraits so the path is readable (L51-13).
 */
export function measureDirectedTokenFlyout(
  kind: ResourceKind,
  from: TokenFlyoutEndpoint,
  to: TokenFlyoutEndpoint,
  index = 0,
): { artUrl: string; from: DomRectLite; to: DomRectLite } | null {
  const seatToSeat = from !== 'log' && to !== 'log';
  const fromRect = rectForEndpoint(from, kind, seatToSeat);
  const toRect = rectForEndpoint(to, kind, seatToSeat);
  if (fromRect === null || toRect === null) {
    return null;
  }
  // Log-origin chips are 40px for readability. Overlay chrome is asCard-only
  // (L51-14) — this size must not paint a white tile around the icon.
  // Same size both ends so spend and gain stay readable mid-crossing (L51-16).
  const fromSize = 40;
  const toSize = 40;
  return {
    artUrl: getResourceIconUrl(kind),
    from: fannedChip(fromRect, index, fromSize, 1),
    to: fannedChip(toRect, index, toSize, 0.4),
  };
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

/** Buy/sell card ghost size — small enough to read, not a full hand face (L51-13). */
export const DECK_CARD_FLYOUT_WIDTH = 48;
export const DECK_CARD_FLYOUT_HEIGHT = 72;

function sizedRect(center: DomRectLite, width: number, height: number): DomRectLite {
  return {
    left: center.left + center.width / 2 - width / 2,
    top: center.top + center.height / 2 - height / 2,
    width,
    height,
  };
}

/**
 * Visual table center — midpoint of the pending strip and the card band so the
 * ghost sits on the felt, not on the action-log column (L51-13).
 */
export function measureFeltCenterRect(): DomRectLite | null {
  const pending = rectOf(document.querySelector('[data-zone="pending"]'));
  const hand =
    rectOf(document.querySelector('[data-zone="card-band"]')) ??
    rectOf(document.querySelector('[data-zone="hand"]')) ??
    rectOf(document.querySelector('[data-zone="dock"]'));
  if (pending !== null && hand !== null) {
    const cx =
      (pending.left + pending.width / 2 + hand.left + hand.width / 2) / 2;
    const cy =
      (pending.top + pending.height / 2 + hand.top + hand.height / 2) / 2;
    return {
      left: cx - DECK_CARD_FLYOUT_WIDTH / 2,
      top: cy - DECK_CARD_FLYOUT_HEIGHT / 2,
      width: DECK_CARD_FLYOUT_WIDTH,
      height: DECK_CARD_FLYOUT_HEIGHT,
    };
  }
  const felt = rectOf(document.querySelector('[data-zone="felt"]'));
  if (felt !== null) {
    return sizedRect(felt, DECK_CARD_FLYOUT_WIDTH, DECK_CARD_FLYOUT_HEIGHT);
  }
  if (pending === null) {
    return null;
  }
  return sizedRect(pending, DECK_CARD_FLYOUT_WIDTH, DECK_CARD_FLYOUT_HEIGHT);
}

function rectForPlayerSeat(playerId: string): DomRectLite | null {
  const opponentPortrait = document.querySelector(
    `${tokenFlyoutSeatSelector(playerId)} [data-zone="opponent-portrait"]`,
  );
  const opponentSeat = document.querySelector(tokenFlyoutSeatSelector(playerId));
  const opponent = rectOf(opponentPortrait) ?? rectOf(opponentSeat);
  if (opponent !== null) {
    return sizedRect(opponent, DECK_CARD_FLYOUT_WIDTH, DECK_CARD_FLYOUT_HEIGHT);
  }
  const hand =
    rectOf(document.querySelector('[data-zone="hand"]')) ??
    rectOf(document.querySelector('[data-zone="card-band"]'));
  const dock = document.querySelector(tokenFlyoutPovSelector(playerId));
  const self = hand ?? rectOf(dock);
  if (self === null) {
    return null;
  }
  return sizedRect(self, DECK_CARD_FLYOUT_WIDTH, DECK_CARD_FLYOUT_HEIGHT);
}

/**
 * Buy: felt center → seat. Sell: seat → felt center.
 * Unspied art is a verso supplied by the caller (L51-13).
 */
export function measureDeckCardFlyout(
  playerId: string,
  artUrl: string,
  direction: 'buy' | 'sell',
): { artUrl: string; from: DomRectLite; to: DomRectLite } | null {
  const center = measureFeltCenterRect();
  const seat = rectForPlayerSeat(playerId);
  if (center === null || seat === null) {
    return null;
  }
  if (direction === 'buy') {
    return { artUrl, from: center, to: seat };
  }
  return { artUrl, from: seat, to: center };
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
  const fromSize = 40;
  const toSize = 40;
  return {
    artUrl: getResourceIconUrl(kind),
    from: fannedChip(fromBase, index, fromSize, 1),
    to: fannedChip(toBase, index, toSize, 0.4),
  };
}

/**
 * Played card: hand/seat → felt pending center (L51-16).
 * Same destination as buy/sell ghosts. Playing is a card leaving the hand;
 * L51-13 dropped the oversized log flyout, not the transfer itself.
 */
export function measurePlayCardGhost(
  playerId: string,
  artUrl: string,
  instanceId?: string,
): { artUrl: string; from: DomRectLite; to: DomRectLite } | null {
  const instanceRect =
    instanceId === undefined
      ? null
      : rectOf(document.querySelector(`[data-instance-id="${CSS.escape(instanceId)}"]`));
  const from =
    instanceRect !== null
      ? sizedRect(instanceRect, DECK_CARD_FLYOUT_WIDTH, DECK_CARD_FLYOUT_HEIGHT)
      : rectForPlayerSeat(playerId);
  const to = measureFeltCenterRect();
  if (from === null || to === null) {
    return null;
  }
  return { artUrl, from, to };
}

/** Buy card: felt center → hand (L51-13). */
export function measureBuyCardFlyout(
  cardId: CardId,
  isUpgraded = false,
): { artUrl: string; from: DomRectLite; to: DomRectLite } | null {
  const from = measureFeltCenterRect();
  const hand =
    rectOf(document.querySelector('[data-zone="hand"]')) ??
    rectOf(document.querySelector('[data-zone="card-band"]'));
  if (from === null || hand === null) {
    return null;
  }
  return {
    artUrl: getCardArtUrl(cardId, { isUpgraded }),
    from,
    to: sizedRect(hand, DECK_CARD_FLYOUT_WIDTH, DECK_CARD_FLYOUT_HEIGHT),
  };
}

/** Buy special (unknown id until state arrives): verso special, center → specials. */
export function measureBuySpecialFlyout(): {
  artUrl: string;
  from: DomRectLite;
  to: DomRectLite;
} | null {
  const from = measureFeltCenterRect();
  const dest =
    rectOf(document.querySelector('[data-zone="specials"]')) ??
    rectOf(document.querySelector('[data-zone="card-band"]')) ??
    rectOf(document.querySelector('[data-zone="hand"]'));
  if (from === null || dest === null) {
    return null;
  }
  return {
    artUrl: getCardBackUrl('special'),
    from,
    to: sizedRect(dest, DECK_CARD_FLYOUT_WIDTH, DECK_CARD_FLYOUT_HEIGHT),
  };
}

/** Sell card: held instance → felt center (L51-13). */
export function measureSellCardFlyout(
  instanceId: string,
  cardId: CardId,
  isUpgraded: boolean,
): { artUrl: string; from: DomRectLite; to: DomRectLite } | null {
  const origin =
    rectOf(document.querySelector(`[data-instance-id="${CSS.escape(instanceId)}"]`)) ??
    rectOf(document.querySelector('[data-zone="hand"]'));
  const to = measureFeltCenterRect();
  if (origin === null || to === null) {
    return null;
  }
  return {
    artUrl: getCardArtUrl(cardId, { isUpgraded }),
    from: sizedRect(origin, DECK_CARD_FLYOUT_WIDTH, DECK_CARD_FLYOUT_HEIGHT),
    to,
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
