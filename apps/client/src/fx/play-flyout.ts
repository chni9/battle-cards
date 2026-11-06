/**
 * Helpers to stage play / token / buy-sell flyouts without delaying intents.
 * Anchors are arena elements in every layout mode (L75-08).
 */

import type { CardId } from '@card-battle/shared';

import { getCardArtUrl, getCardBackUrl, getResourceIconUrl, type ResourceKind } from '../ui/asset-lookup';
import { readVisualViewportBox } from '../ui/visual-viewport';
import {
  ACTION_LOG_PANEL_ZONE,
  DECK_CARD_FLYOUT_HEIGHT,
  DECK_CARD_FLYOUT_WIDTH,
  escapeSelector,
  LOG_COLLAPSED_ZONE,
  tokenFlyoutPovSelector,
  tokenFlyoutResourceSelector,
  tokenFlyoutSeatSelector,
} from '../ui/fx-anchors';
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

/**
 * The part of `rect` inside the visible viewport. A rect with nothing visible is returned as it is,
 * so an anchor that is off-screen keeps the endpoint it had.
 */
function clipToViewport(rect: DomRectLite | null): DomRectLite | null {
  if (rect === null) {
    return null;
  }
  const box = readVisualViewportBox();
  const left = Math.max(rect.left, box.offsetLeft);
  const top = Math.max(rect.top, box.offsetTop);
  const right = Math.min(rect.left + rect.width, box.offsetLeft + box.width);
  const bottom = Math.min(rect.top + rect.height, box.offsetTop + box.height);
  return right > left && bottom > top ? { left, top, width: right - left, height: bottom - top } : rect;
}

/**
 * For each selector in order, every match in document order: the first element whose client rect
 * is non-zero; else null. A mounted but zero-size element (a collapsed panel, a depth-hidden log
 * sheet) never wins over a visible fallback (L75-08, R6).
 */
export function queryFirstVisible(selectors: readonly string[]): Element | null {
  for (const selector of selectors) {
    for (const candidate of document.querySelectorAll(selector)) {
      if (visibleClientRect(candidate) !== null) {
        return candidate;
      }
    }
  }
  return null;
}

/**
 * The log endpoint: the first visible of the panel and the always-rendered ticker or toggle
 * (`log-collapsed`) — a collapsed panel's toggle, never a zero-size list (L53-07, L75-08, R6).
 */
export function queryActionLogAnchor(): Element | null {
  return queryFirstVisible([
    `[data-zone="${ACTION_LOG_PANEL_ZONE}"]`,
    `[data-zone="${LOG_COLLAPSED_ZONE}"]`,
  ]);
}

/** The plate: V7 has no collapsed Incoming (R6). */
export function queryIncomingAnchor(): Element | null {
  return document.querySelector('[data-zone="pending"]');
}

function tokenRect(center: DomRectLite, size = 28): DomRectLite {
  return {
    left: center.left + center.width / 2 - size / 2,
    top: center.top + center.height / 2 - size / 2,
    width: size,
    height: size,
  };
}

/** Seat, else the POV's self strip. */
export function queryPlayerFxAnchor(playerId: string): Element | null {
  return (
    document.querySelector(tokenFlyoutSeatSelector(playerId)) ??
    document.querySelector(tokenFlyoutPovSelector(playerId)) ??
    document.querySelector(`[data-player-id="${escapeSelector(playerId)}"]`) ??
    document.querySelector(`[data-seat="${escapeSelector(playerId)}"]`)
  );
}

/**
 * Resolution flash: the first visible element carrying the effect id (the arrow label or the plate
 * badge), else the visible plate, else the plate element (V7 has no Incoming button, R6; A.7.1).
 */
export function queryPendingFlashAnchor(effectId: string): Element | null {
  return (
    queryFirstVisible([
      `[data-pending-id="${escapeSelector(effectId)}"]`,
      '[data-zone="pending"]',
    ]) ?? queryIncomingAnchor()
  );
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
  return null;
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
    // The log sheet's `action-log-panel` is its content div, which can be far taller than the sheet
    // body that scrolls it (K12): aim at the part of it the player can see.
    return clipToViewport(rectOf(queryActionLogAnchor()));
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

function sizedRect(center: DomRectLite, width: number, height: number): DomRectLite {
  return {
    left: center.left + center.width / 2 - width / 2,
    top: center.top + center.height / 2 - height / 2,
    width,
    height,
  };
}

/**
 * The plate (§6.1 item 2) replaces the V2 felt centre: card ghosts land on its landing frame
 * (`[data-plate-landing]`, else the plate), else on the felt, else nowhere (L75-08, R6).
 */
export function measureFeltCenterRect(): DomRectLite | null {
  const plate = rectOf(
    queryFirstVisible(['[data-plate-landing]', '[data-zone="pending"]']),
  );
  if (plate !== null) {
    return sizedRect(plate, DECK_CARD_FLYOUT_WIDTH, DECK_CARD_FLYOUT_HEIGHT);
  }
  const felt = rectOf(document.querySelector('[data-zone="felt"]'));
  if (felt !== null) {
    return sizedRect(felt, DECK_CARD_FLYOUT_WIDTH, DECK_CARD_FLYOUT_HEIGHT);
  }
  return null;
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
  return null;
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
 * A card-ghost rect centred on a viewport point: the drop point of a dragged card (L74-17).
 */
function originRect(origin: { readonly x: number; readonly y: number }): DomRectLite {
  return {
    left: origin.x - DECK_CARD_FLYOUT_WIDTH / 2,
    top: origin.y - DECK_CARD_FLYOUT_HEIGHT / 2,
    width: DECK_CARD_FLYOUT_WIDTH,
    height: DECK_CARD_FLYOUT_HEIGHT,
  };
}

/**
 * Played card: hand/seat → felt pending center (L51-16).
 * Same destination as buy/sell ghosts. Playing is a card leaving the hand;
 * L51-13 dropped the oversized log flyout, not the transfer itself.
 * `origin`: the drop point of a dragged card (L74-17); it replaces the instance lookup.
 */
export function measurePlayCardGhost(
  playerId: string,
  artUrl: string,
  instanceId?: string,
  origin?: { readonly x: number; readonly y: number },
): { artUrl: string; from: DomRectLite; to: DomRectLite } | null {
  if (origin !== undefined) {
    const to = measureFeltCenterRect();
    return to === null ? null : { artUrl, from: originRect(origin), to };
  }
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

/**
 * Sell card: held instance → felt center (L51-13).
 * `origin`: the drop point of a dragged card (L74-17); it replaces the instance lookup.
 */
export function measureSellCardFlyout(
  instanceId: string,
  cardId: CardId,
  isUpgraded: boolean,
  origin?: { readonly x: number; readonly y: number },
): { artUrl: string; from: DomRectLite; to: DomRectLite } | null {
  const held =
    origin !== undefined
      ? null
      : (rectOf(document.querySelector(`[data-instance-id="${CSS.escape(instanceId)}"]`)) ??
        rectOf(document.querySelector('[data-zone="hand"]')));
  const from =
    origin !== undefined
      ? originRect(origin)
      : held === null
        ? null
        : sizedRect(held, DECK_CARD_FLYOUT_WIDTH, DECK_CARD_FLYOUT_HEIGHT);
  const to = measureFeltCenterRect();
  if (from === null || to === null) {
    return null;
  }
  return {
    artUrl: getCardArtUrl(cardId, { isUpgraded }),
    from,
    to,
  };
}

/** Targeting cue: pulse the source seat (L39-05; the V2 collapsed-button cue retired, L75-08). */
export function measureTargetingCue(
  fromPlayerId: string,
  toPlayerId: string,
): { from: DomRectLite; to: DomRectLite } | null {
  void toPlayerId;
  const from = rectOf(queryPlayerFxAnchor(fromPlayerId));
  if (from === null) {
    return null;
  }
  // `to` kept for the event shape; pulse only uses `from` (the seat).
  return { from, to: from };
}
