/**
 * Helpers to stage play / token / buy-sell flyouts without delaying intents.
 */

import type { CardId } from '@card-battle/shared';

import { getCardArtUrl, getCardBackUrl, getResourceIconUrl, type ResourceKind } from '../design/asset-lookup';
import type { DomRectLite, TokenFlyoutEndpoint } from './table-fx-types';

/** Skip `display:none` / unmounted chrome — zero-size rects are not destinations. */
export function visibleClientRect(el: Element | null): DomRectLite | null {
  if (el === null) {
    return null;
  }
  const r = el.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) {
    return null;
  }
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

function rectOf(el: Element | null): DomRectLite | null {
  return visibleClientRect(el);
}

function escapeSelector(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Collapsed felt chrome still mounts a button (L53-07). Flyouts aim at that
 * button when the panel / seat / Incoming strip is unmounted.
 */
export const ACTION_LOG_PANEL_ZONE = 'action-log-panel';
export const LOG_COLLAPSED_ZONE = 'log-collapsed';
export const OPPONENTS_COLLAPSED_ZONE = 'opponents-collapsed';
export const INCOMING_PENDING_ZONE = 'incoming-pending';
export const INCOMING_COLLAPSED_ZONE = 'incoming-collapsed';

export function queryActionLogAnchor(): Element | null {
  return (
    document.querySelector(`[data-zone="${ACTION_LOG_PANEL_ZONE}"]`) ??
    document.querySelector(`[data-zone="${LOG_COLLAPSED_ZONE}"]`)
  );
}

export function queryOpponentsCollapsedAnchor(): Element | null {
  return document.querySelector(`[data-zone="${OPPONENTS_COLLAPSED_ZONE}"]`);
}

export function queryIncomingAnchor(): Element | null {
  return (
    document.querySelector(`[data-zone="${INCOMING_PENDING_ZONE}"]`) ??
    document.querySelector(`[data-zone="${INCOMING_COLLAPSED_ZONE}"]`)
  );
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

/** Seat, POV dock, or the Opponents collapsed button. */
export function queryPlayerFxAnchor(playerId: string): Element | null {
  return (
    document.querySelector(tokenFlyoutSeatSelector(playerId)) ??
    document.querySelector(tokenFlyoutPovSelector(playerId)) ??
    document.querySelector(`[data-player-id="${escapeSelector(playerId)}"]`) ??
    document.querySelector(`[data-seat="${escapeSelector(playerId)}"]`) ??
    queryOpponentsCollapsedAnchor()
  );
}

/** Resolution flash: live chip, visible Waiting strip, else Incoming button. */
export function queryPendingFlashAnchor(effectId: string): Element | null {
  const chip = document.querySelector(
    `[data-pending-id="${escapeSelector(effectId)}"]`,
  );
  if (rectOf(chip) !== null) {
    return chip;
  }
  const pending = document.querySelector('[data-zone="pending"]');
  if (rectOf(pending) !== null) {
    return pending;
  }
  return queryIncomingAnchor();
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
  if (selfRoot !== null) {
    return (
      rectOf(selfRoot.querySelector(`[data-resource-kind="${escapeSelector(kind)}"]`)) ??
      rectOf(selfRoot)
    );
  }
  return rectOf(queryOpponentsCollapsedAnchor());
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
  const self =
    rectOf(dock?.querySelector('[data-zone="kit-portrait"]') ?? null) ??
    rectOf(dock);
  if (self !== null) {
    return self;
  }
  return rectOf(queryOpponentsCollapsedAnchor());
}

function rectForEndpoint(
  endpoint: TokenFlyoutEndpoint,
  kind: ResourceKind,
  preferSeat: boolean,
): DomRectLite | null {
  if (endpoint === 'log') {
    return rectOf(queryActionLogAnchor());
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
  const dock = document.querySelector(tokenFlyoutPovSelector(playerId));
  if (dock !== null) {
    const self =
      rectOf(document.querySelector('[data-zone="hand"]')) ??
      rectOf(document.querySelector('[data-zone="card-band"]')) ??
      rectOf(dock);
    if (self !== null) {
      return sizedRect(self, DECK_CARD_FLYOUT_WIDTH, DECK_CARD_FLYOUT_HEIGHT);
    }
  }
  const collapsed = rectOf(queryOpponentsCollapsedAnchor());
  if (collapsed === null) {
    return null;
  }
  return sizedRect(collapsed, DECK_CARD_FLYOUT_WIDTH, DECK_CARD_FLYOUT_HEIGHT);
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
  const resourceRect = rectOf(resourceEl);
  const log = rectOf(queryActionLogAnchor());
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

/** Targeting cue: pulse the source seat, or the Opponents button when collapsed (L39-05 / L53-07). */
export function measureIncomingCollapsedCue(): DomRectLite | null {
  return rectOf(document.querySelector(`[data-zone="${INCOMING_COLLAPSED_ZONE}"]`));
}

export function measureTargetingCue(
  fromPlayerId: string,
  toPlayerId: string,
): { from: DomRectLite; to: DomRectLite } | null {
  void toPlayerId;
  const from = rectOf(queryPlayerFxAnchor(fromPlayerId));
  if (from === null) {
    return null;
  }
  // `to` kept for the event shape; pulse only uses `from` (seat or collapsed button).
  return { from, to: from };
}
