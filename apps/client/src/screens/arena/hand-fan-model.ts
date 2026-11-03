/**
 * Hand fan model — technical spec v7 §5.4 (an unplayable card), §6.1 item 4 (hand order),
 * Q38 (a walk-in holds nothing) and Q60 (the empty states); Lot 74 plan Appendix A `card-band`
 * (L74-07).
 *
 * Pure: the order, the unplayable state and the selection come from the L73 view-model
 * (`cardActions`) and the open sheets, so the component renders and never decides (golden rule 8).
 */

import { isSharedAttackCardId, type CardInstance, type PlayingStateView } from '@card-battle/shared';

import type { ActionContext } from '../../view-model/action-lock';
import { DISABLED_REASON_COPY, type DisabledReason } from '../../view-model/action-reasons';
import { cardActions, type CardActionsModel } from '../../view-model/card-actions';
import type { ArenaSheet, ArenaSheetsState } from './arena-sheets';
import type { CardSheetSource } from './card-sheet-source';

export type HandCardSource = Extract<CardSheetSource, { kind: 'hand' | 'special' }>;

export interface HandFanCard {
  readonly source: HandCardSource;
  /** `cardActions(view, { zone, instance }, ctx)`; L74-12 reads `canDrag` and `drop`. */
  readonly actions: CardActionsModel;
  /** Use disabled for a card-specific reason (spec v7 §5.4): never off-turn or while locked. */
  readonly unplayable: boolean;
  /** `DISABLED_REASON_COPY[reason]` when `unplayable`, else null. */
  readonly description: string | null;
}

export interface HandFanModel {
  /** Attacks, then actions, each in `view.self.hand` order (§6.1 item 4). Empty for a walk-in. */
  readonly hand: readonly HandFanCard[];
  /** `view.self.specialCards` order. Empty for a walk-in. */
  readonly specials: readonly HandFanCard[];
}

/** V2 `card-band.tsx` captions and empty texts, verbatim. */
export const HAND_GROUP_COPY = {
  hand: { label: 'Hand', empty: 'Empty' },
  specials: { label: 'Specials', empty: 'None' },
} as const;

/**
 * True for every `DisabledReason` except the lock reasons. `cardActions` ranks the lock above
 * every other reason, so a card-specific one only shows on the POV's own turn with nothing locked.
 */
export function isCardSpecificUseReason(reason: DisabledReason): boolean {
  return reason !== 'not-your-turn' && reason !== 'actions-locked';
}

function handFanCard(
  view: PlayingStateView,
  ctx: ActionContext,
  zone: HandCardSource['kind'],
  instance: CardInstance,
): HandFanCard {
  const actions = cardActions(view, { zone, instance }, ctx);
  const reason = actions.actions.find((action) => action.kind === 'use')?.reason ?? null;
  const unplayable = reason !== null && isCardSpecificUseReason(reason);
  return {
    source: { kind: zone, instance },
    actions,
    unplayable,
    description: unplayable ? DISABLED_REASON_COPY[reason] : null,
  };
}

/**
 * A walk-in's `self` is filler (Q38), so it shows nothing. The server routes every special to
 * `specialCards` (`transferCardInstance`), so the hand holds only shared attacks and actions, and
 * sorting by family keeps each family in hand order.
 */
export function handFanModel(view: PlayingStateView, ctx: ActionContext): HandFanModel {
  if (view.isSpectator === true) {
    return { hand: [], specials: [] };
  }
  const { hand, specialCards } = view.self;
  const attacks = hand.filter((instance) => isSharedAttackCardId(instance.cardId));
  const actions = hand.filter((instance) => !isSharedAttackCardId(instance.cardId));
  return {
    hand: [...attacks, ...actions].map((instance) => handFanCard(view, ctx, 'hand', instance)),
    specials: specialCards.map((instance) => handFanCard(view, ctx, 'special', instance)),
  };
}

interface HandCardSheet {
  readonly kind: 'card';
  readonly source: HandCardSource;
}

function isHandCardSheet(sheet: ArenaSheet): sheet is HandCardSheet {
  return sheet.kind === 'card' && (sheet.source.kind === 'hand' || sheet.source.kind === 'special');
}

/** The newest open `card` sheet whose source is `hand` or `special`, else null. */
export function selectedHandInstanceId(state: ArenaSheetsState): string | null {
  return state.open.findLast(isHandCardSheet)?.source.instance.instanceId ?? null;
}
