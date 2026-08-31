/**
 * Felt chrome collapse — Lot 53 / technical spec v6 §6.2 / L53-07.
 * When the dock cannot keep an uncropped hand row, hide Incoming then log
 * then opponents. Short viewports collapse all three so Dialogs are usable.
 */

import { CARD_BAND_ABS_MIN_W, faceCardHeight } from './card-band-fit';

export const FELT_COLLAPSE_BUTTON_PX = 36;
export const FELT_OPPONENT_ROW_PX = 112;
export const FELT_LOG_MIN_PX = 56;
export const FELT_PENDING_NONEMPTY_PX = 72;
export const DOCK_HEADER_PX = 40;
export const DOCK_INCOMING_PX = 64;
export const DOCK_RESOURCES_PX = 40;
export const DOCK_ECONOMY_PX = 48;
export const DOCK_GAP_PX = 8;
/** 844×390 and other short phone heights — force all chrome into Dialogs. */
export const SHORT_VIEWPORT_COLLAPSE_PX = 500;

export interface FeltCollapse {
  incoming: boolean;
  actionLog: boolean;
  opponents: boolean;
}

export interface FeltCollapseInput {
  feltHeight: number;
  opponentRowHeight: number;
  pendingHeight: number;
  logHeight: number;
  dockMinHeight: number;
  incomingDockHeight: number;
  buttonHeight: number;
  viewportHeight?: number;
}

export function dockMinHeightPx(specialsCount: number): number {
  const hand = faceCardHeight(CARD_BAND_ABS_MIN_W);
  const specials = specialsCount === 0 ? 20 : faceCardHeight(CARD_BAND_ABS_MIN_W);
  return (
    DOCK_HEADER_PX +
    hand +
    specials +
    DOCK_RESOURCES_PX +
    DOCK_ECONOMY_PX +
    DOCK_GAP_PX * 4
  );
}

export function planFeltCollapse(input: FeltCollapseInput): FeltCollapse {
  const viewportHeight = input.viewportHeight ?? 0;
  if (viewportHeight > 0 && viewportHeight <= SHORT_VIEWPORT_COLLAPSE_PX) {
    return {
      incoming: true,
      actionLog: true,
      opponents: true,
    };
  }

  const result: FeltCollapse = {
    incoming: false,
    actionLog: false,
    opponents: false,
  };
  if (input.feltHeight <= 0) {
    return result;
  }

  const used = (flags: FeltCollapse): number => {
    const dock =
      input.dockMinHeight + (flags.incoming ? 0 : input.incomingDockHeight);
    const opponents = flags.opponents
      ? input.buttonHeight
      : input.opponentRowHeight;
    const pending = flags.incoming ? 0 : input.pendingHeight;
    const log = flags.actionLog ? input.buttonHeight : input.logHeight;
    return opponents + pending + log + dock;
  };

  while (used(result) > input.feltHeight + 0.5) {
    const incomingSaves =
      !result.incoming &&
      (input.incomingDockHeight > 0 || input.pendingHeight > 0);
    if (incomingSaves) {
      result.incoming = true;
      continue;
    }
    if (!result.actionLog) {
      result.actionLog = true;
      continue;
    }
    if (!result.opponents && input.opponentRowHeight > 0) {
      result.opponents = true;
      continue;
    }
    break;
  }
  return result;
}

export function feltCollapseFromCounts(input: {
  feltHeight: number;
  opponentCount: number;
  incomingCount: number;
  waitingCount: number;
  specialsCount: number;
  viewportHeight?: number;
}): FeltCollapse {
  const pendingHeight =
    input.waitingCount === 0 ? 0 : FELT_PENDING_NONEMPTY_PX;
  const incomingDockHeight =
    input.incomingCount === 0 ? 0 : DOCK_INCOMING_PX;
  const opponentRowHeight =
    input.opponentCount === 0 ? 0 : FELT_OPPONENT_ROW_PX;
  const logHeight = Math.max(FELT_LOG_MIN_PX, input.feltHeight * 0.15);
  return planFeltCollapse({
    feltHeight: input.feltHeight,
    opponentRowHeight,
    pendingHeight,
    logHeight,
    dockMinHeight: dockMinHeightPx(input.specialsCount),
    incomingDockHeight,
    buttonHeight: FELT_COLLAPSE_BUTTON_PX,
    ...(input.viewportHeight !== undefined
      ? { viewportHeight: input.viewportHeight }
      : {}),
  });
}
