/**
 * Tap-tap targeting model — technical spec v7 §6.6.2 (Use on a targeted card collapses its sheet
 * into a "Choose a target" bar), §6.6.4 (only a target tap sends), §6.6.5 (valid seats are
 * buttons named "{nickname}, target"; the others are `aria-disabled`); Lot 74 plan Appendix A.5,
 * Review Focus 2 (L74-10).
 *
 * The stored `TargetingState.seatIds` is the set Use offered when targeting began; the bar and the
 * seats always read `liveTargeting`, which re-reads `cardActions` from the current view, so a
 * stale model (the card left the hand, the turn passed, a sub-choice opened) ends targeting
 * instead of letting a later tap send (golden rule 8: legality comes only from the view-model).
 */

import type { PlayingStateView } from '@card-battle/shared';

import type { ActionContext } from '../../view-model/action-lock';
import { cardActions } from '../../view-model/card-actions';
import { arenaSheetKey, type ArenaSheetsState, type TargetingState } from './arena-sheets';
import { liveCardRefFor } from './card-sheet-source';

/** The bar's text (spec v7 §10.6 new string). */
export const CHOOSE_TARGET_LABEL = 'Choose a target';

/** A valid seat's accessible name while targeting (§6.6.5). */
export function targetSeatLabel(nickname: string): string {
  return `${nickname}, target`;
}

/**
 * `sheets.targeting` with the CURRENT model's seats, or null when nothing is targeted, the targeted
 * card sheet is gone, its card left the hand (`liveCardRefFor` gives `read-only`), Use is no longer
 * enabled, or Use no longer routes `target`.
 */
export function liveTargeting(
  view: PlayingStateView,
  ctx: ActionContext,
  sheets: ArenaSheetsState,
): TargetingState | null {
  const { targeting } = sheets;
  if (targeting === null) {
    return null;
  }
  const sheet = sheets.open.find((entry) => entry.kind === 'card' && arenaSheetKey(entry) === targeting.sheetKey);
  if (sheet?.kind !== 'card') {
    return null;
  }
  const ref = liveCardRefFor(sheet.source, view);
  if (ref.zone === 'read-only') {
    return null;
  }
  const model = cardActions(view, ref, ctx);
  const useEnabled = model.actions.some((action) => action.kind === 'use' && action.enabled);
  if (!useEnabled || model.use?.kind !== 'target') {
    return null;
  }
  return { ...targeting, seatIds: model.use.seatIds };
}

/** What `ArenaSeats` needs while targeting: the live seat set and the target tap. */
export interface SeatTargeting {
  /** The targeted sheet's key: a new key moves focus to the first valid seat. */
  readonly key: string;
  readonly seatIds: readonly string[];
  readonly onTarget: (playerId: string) => void;
}

/** One seat while targeting: a valid target taps through, any other seat is inert. */
export type SeatTarget = { readonly kind: 'valid'; readonly onTarget: () => void } | { readonly kind: 'invalid' };

/** Null outside targeting; otherwise `valid` for a listed seat and `invalid` for every other one. */
export function seatTargetFor(targeting: SeatTargeting | undefined, playerId: string): SeatTarget | null {
  if (targeting === undefined) {
    return null;
  }
  if (!targeting.seatIds.includes(playerId)) {
    return { kind: 'invalid' };
  }
  return {
    kind: 'valid',
    onTarget: () => {
      targeting.onTarget(playerId);
    },
  };
}
