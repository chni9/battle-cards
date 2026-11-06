/**
 * First-game hints on the arena — technical spec v7 §6.12 (the L46 selector, gates and storage),
 * §6.3 and Appendix A Q66 (a base-Spied seat counts as kit hidden), §6.7 (the card hides under
 * sheets); Lot 75 plan A.9.1 (L75-06).
 *
 * The state lives in `ArenaScreenInner`, so a mode change keeps it. `selectHint` runs
 * `shouldShowFirstGameHints` on `playKind`, so a tutorial room never selects a hint: keep that gate,
 * the tutorial callouts share `Z_INDEX.hint` (K6). `note` is a no-op in a tutorial (V2; L46-03).
 */

import type { PlayingStateView, SubChoiceRequiredPayload } from '@card-battle/shared';
import { useState } from 'react';

import { INCOMING_THIEF_HINT_BODY } from '../../help/hint-copy';
import { applyHintPatch, readHintState } from '../../ui/help-storage';
import type { HintId } from '../../ui/hint-ids';
import { useSheetStackState } from '../../ui/primitives/sheet-stack-context';
import { earliestIncomingThief, incomingAttackTargetingYouIds, incomingThiefTargetingYouIds } from '../../view-model/incoming-threat-diff';
import type { PovMode, SeatModel } from '../../view-model/seats';
import { hintIdsDismissedBy, selectHint, type HintDismissCause } from '../../view-model/select-hint';

export interface ArenaHintsInput {
  readonly view: PlayingStateView;
  readonly readOnly: boolean;
  /** `strip.pov`: only 'seated' shows hints. */
  readonly pov: PovMode;
  /** `strip.isActive`. */
  readonly isMyTurn: boolean;
  /** `seatsModel.seats`. */
  readonly seats: readonly SeatModel[];
  readonly subChoice: SubChoiceRequiredPayload | null;
}

export interface ArenaHints {
  readonly hintId: HintId | null;
  /** L75-07: the earliest-queued incoming thief's body, present only when hintId === 'incoming-thief'. */
  readonly body?: string;
  readonly dialogOpen: boolean;
  readonly note: (cause: HintDismissCause) => void;
  readonly onGotIt: () => void;
  readonly onSkipAll: () => void;
}

const NO_THREAT = { hasIncomingAttack: false, hasIncomingThief: false } as const;

export function useArenaHints({ view, readOnly, pov, isMyTurn, seats, subChoice }: ArenaHintsInput): ArenaHints {
  const [hintState, setHintState] = useState(readHintState);
  const stack = useSheetStackState();
  const tutorial = view.playKind === 'tutorial';
  const hasIncomingAttack = incomingAttackTargetingYouIds(view.pendingEffects, view.you).size > 0;
  const hasIncomingThief = incomingThiefTargetingYouIds(view.pendingEffects, view.you).size > 0;

  // The threat edge (L46-01): an attack or thief Incoming that leaves the view dismisses its hint. The seed is
  // the mount value, so nothing is dismissed on mount. Render-phase, as `use-pov-elimination.ts`; never an effect.
  const [seenThreats, setSeenThreats] = useState({ attack: hasIncomingAttack, thief: hasIncomingThief });
  if (seenThreats.attack !== hasIncomingAttack || seenThreats.thief !== hasIncomingThief) {
    setSeenThreats({ attack: hasIncomingAttack, thief: hasIncomingThief });
    if (!tutorial) {
      const ids = [
        ...(seenThreats.attack && !hasIncomingAttack ? hintIdsDismissedBy('incoming-cleared', NO_THREAT) : []),
        ...(seenThreats.thief && !hasIncomingThief ? hintIdsDismissedBy('incoming-thief-cleared', NO_THREAT) : []),
      ];
      if (ids.length > 0) setHintState((prev) => applyHintPatch(prev, { ids }));
    }
  }

  const hintId = selectHint({
    playKind: view.playKind,
    readOnly,
    selfEliminated: pov !== 'seated',
    isMyTurn: isMyTurn && !readOnly && pov === 'seated',
    skipAll: hintState.skipAll,
    dismissed: hintState.dismissed,
    hasIncomingAttack,
    hasIncomingThief,
    hasRewardChoice: subChoice?.kind === 'elimination-reward',
    // Q66: the arena's kit-hidden seats, so a base Spy shows resources and the hidden-kit hint stays.
    hasUnspiedLivingOpponent: seats.some((seat) => seat.kitHidden),
  });

  // V2's `hintDialogOpen` (K1): any read-only sheet, a minimized blocking sheet, or a sub-choice other than
  // the reward the hint itself is about.
  const rewardHintVisible = hintId === 'reward' && subChoice?.kind === 'elimination-reward';
  const dialogOpen =
    stack.entries.some((entry) => entry.mode === 'read-only' || entry.minimized) ||
    (subChoice !== null && !rewardHintVisible);

  const note = (cause: HintDismissCause): void => {
    if (tutorial) return;
    setHintState((prev) => applyHintPatch(prev, { ids: hintIdsDismissedBy(cause, { hasIncomingAttack, hasIncomingThief }) }));
  };
  const onGotIt = (): void => {
    if (hintId === null) return;
    setHintState((prev) => applyHintPatch(prev, { ids: [hintId] }));
  };
  const onSkipAll = (): void => {
    setHintState((prev) => applyHintPatch(prev, { skipAll: true }));
  };
  const thief = hintId === 'incoming-thief' ? earliestIncomingThief(view.pendingEffects, view.you) : null;
  return { hintId, ...(thief !== null ? { body: INCOMING_THIEF_HINT_BODY[thief] } : {}), dialogOpen, note, onGotIt, onSkipAll };
}
