/**
 * Zone names, flyout sizes and selector builders shared by the table FX measuring
 * code. Extracted from `fx/play-flyout.ts` so the anchors live beside the other
 * non-component `ui/` helpers (technical spec v7 §4.1, L72-03); the DOM measuring
 * stays in `fx/play-flyout.ts`.
 */

import type { ResourceKind } from './asset-lookup';

/**
 * The log endpoint: the panel while it is visible, else the always-rendered ticker or toggle
 * (`log-collapsed`). L75-08 retired the V2 collapsed opponents and Incoming zones (R6).
 */
export const ACTION_LOG_PANEL_ZONE = 'action-log-panel';
export const LOG_COLLAPSED_ZONE = 'log-collapsed';

/** Buy/sell card ghost size — small enough to read, not a full hand face (L51-13). */
export const DECK_CARD_FLYOUT_WIDTH = 48;
export const DECK_CARD_FLYOUT_HEIGHT = 72;

export function escapeSelector(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Token chip flyout — gain: action log → resource; loss: resource → action log.
 * Optional `playerId` scopes the resource origin to an opponent seat (L51-09).
 * Callers enqueue one event per unit of |Δ| with staggered delayMs.
 * Point chips stop at `MAX_POINT_FLYOUTS` so a huge gain cannot stall the table.
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
