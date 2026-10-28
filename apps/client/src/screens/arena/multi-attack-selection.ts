/**
 * Assassin multi-attack selection — technical spec v7 §6.6.2 (an explicit target per row), §13
 * Q44 (Cancel drops the selection); Appendix A `assassin-multi-attack`,
 * `table-multi-attack-target-eligibility`; L74-11.
 *
 * Pure: the copy, the toggle and pick reducers, and the payload. Which rows exist and which seats
 * a row may aim at come only from the `MultiAttackModel` (`view-model/card-actions.ts`); nothing
 * here decides legality (golden rule 8). Several rows may pick one seat (golden rule 1).
 */

import type { PlayMultipleAttacksPayload } from '@card-battle/shared';

import type { MultiAttackModel } from '../../view-model/card-actions';

/** V2 `screens/table/card-actions.tsx`: the entry button, the dialog title and its hint, verbatim. */
export const MULTI_ATTACK_ENTRY_LABEL = 'Multi-attack';
export const MULTI_ATTACK_TITLE = 'Assassin multi-attack';
export const MULTI_ATTACK_HINT = 'Select at least two attack cards and a target each.';

/** V2 verbatim, so the disabled button reads 'Play 0 attacks' or 'Play 1 attacks' too. */
export function playAttacksLabel(count: number): string {
  return `Play ${String(count)} attacks`;
}

export interface MultiAttackPick {
  readonly instanceId: string;
  /** Null until the player taps a seat for this row: no row has a default target (Q17). */
  readonly targetPlayerId: string | null;
}

/** Toggled rows in toggle order; the payload lists them in hand (row) order. */
export type MultiAttackSelection = readonly MultiAttackPick[];

export const EMPTY_MULTI_ATTACK_SELECTION: MultiAttackSelection = [];

/** A new row appends with no target; toggling a row off drops its target with it. */
export function toggleMultiAttackRow(selection: MultiAttackSelection, instanceId: string): MultiAttackSelection {
  return selection.some((pick) => pick.instanceId === instanceId)
    ? selection.filter((pick) => pick.instanceId !== instanceId)
    : [...selection, { instanceId, targetPlayerId: null }];
}

/** A target only lands on a toggled row; any other call returns `selection` itself. */
export function pickMultiAttackTarget(
  selection: MultiAttackSelection,
  instanceId: string,
  targetPlayerId: string,
): MultiAttackSelection {
  if (!selection.some((pick) => pick.instanceId === instanceId)) {
    return selection;
  }
  return selection.map((pick) => (pick.instanceId === instanceId ? { instanceId, targetPlayerId } : pick));
}

/**
 * The picks whose row is still in the model, in row (hand) order. A target that left the row's
 * seat set (a seat turned Invisible or fell between two views) reads null, so the payload never
 * aims at a seat the model no longer offers.
 */
export function selectedMultiAttackRows(
  model: MultiAttackModel,
  selection: MultiAttackSelection,
): readonly MultiAttackPick[] {
  return model.rows.flatMap((row) => {
    const pick = selection.find((entry) => entry.instanceId === row.instance.instanceId);
    if (pick === undefined) {
      return [];
    }
    const { targetPlayerId } = pick;
    return [
      {
        instanceId: pick.instanceId,
        targetPlayerId: targetPlayerId !== null && row.seatIds.includes(targetPlayerId) ? targetPlayerId : null,
      },
    ];
  });
}

/** Null below the model's minimum, or while a toggled row has no live target. */
export function multiAttackPayload(
  model: MultiAttackModel,
  selection: MultiAttackSelection,
): PlayMultipleAttacksPayload | null {
  const rows = selectedMultiAttackRows(model, selection);
  if (rows.length < model.minAttacks) {
    return null;
  }
  const attacks = rows.flatMap(({ instanceId, targetPlayerId }) =>
    targetPlayerId === null ? [] : [{ instanceId, targetPlayerId }],
  );
  return attacks.length === rows.length ? { attacks } : null;
}
