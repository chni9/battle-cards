/**
 * Dock labels and pure helpers — technical spec v7 §6.1 item 5, §6.12, §11; L58-09 (a single spy
 * is preselected), L59-01 (Draw and Unspy keep their V2 spoken names), L64-05; Lot 74 plan
 * Appendix A.8 rulings 4 and 7 (L74-13).
 *
 * The dock itself renders `selfStrip(view, ctx).dock` and adds no rule (golden rule 8): which
 * controls exist and whether each is enabled come from that model. These helpers only name,
 * pulse and pick.
 */

import { costAriaLabel, type StructuredCost } from '../../ui/structured-cost';
import { DRAW_ACTION_LABEL, UNSPY_ACTION_LABEL } from '../../view-model/chrome-labels';
import type { DockModel, UnspyControl } from '../../view-model/self-strip';

/** V2's word label, verbatim (`private-zone.tsx`); the button moved to the dock in V7 (§6.1 item 5). */
export const ACTIVATE_DUPLICATION_LABEL = 'Activate duplication';
/** V2's Unspy confirm label, verbatim (`unspy-dialog.tsx`). */
export const UNSPY_CONFIRM_LABEL = 'Confirm';
/** V2's word, verbatim (`screens/table/economy-bar.tsx`). */
export const STATS_ACTION_LABEL = 'Stats';

/** `Draw, plus 1 pt` / `Draw, plus 37 pts`: ruling 4 keeps V2's `costAriaLabel` words. */
export function drawAriaLabel(gain: number): string {
  return `${DRAW_ACTION_LABEL}, ${costAriaLabel({ kind: 'points', amount: gain }, 'gain')}`;
}

/** `Unspy, minus 10 pts`. */
export function unspyAriaLabel(cost: StructuredCost): string {
  return `${UNSPY_ACTION_LABEL}, ${costAriaLabel(cost, 'cost')}`;
}

/**
 * Changes at every own turn start and payout change; null off-turn (L59-01, L64-05). V2 pulsed only
 * when the turn came back from another seat; a Block chain gives the same POV the next turn, and
 * `turnSequence` still moves, so it pulses too.
 */
export function drawPulseKey(input: {
  readonly isMyTurn: boolean;
  readonly turnSequence: number;
  readonly gain: number;
}): string | null {
  return input.isMyTurn ? `${String(input.turnSequence)}:${String(input.gain)}` : null;
}

/**
 * The pick while it is still a living spy, else the single spy (L58-09), else null. A spy that
 * died or stopped spying while the sheet was open drops out of `spyIds`, so a stale pick never
 * reaches Confirm.
 */
export function resolvedSpyId(control: UnspyControl, picked: string | null): string | null {
  return picked !== null && control.spyIds.includes(picked) ? picked : control.preselectedSpyId;
}

/**
 * Any entry, Stats included: a walk-in's finished-board dock is Stats alone (Q38, §6.12). A walk-in
 * on a live board has every entry null, so it has no dock at all.
 */
export function dockHasControls(model: DockModel): boolean {
  return (
    model.draw !== null || model.shop !== null || model.unspy !== null || model.duplication !== null || model.stats
  );
}
