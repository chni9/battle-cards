/**
 * First-real-game hint selector — technical spec v6 §5.2 / L46.
 * View facts only. Never recommends a legal card.
 */

import type { PlayKind } from '@card-battle/shared';

import type { HintId } from './hint-ids';

export interface SelectHintInput {
  readonly playKind: PlayKind;
  readonly readOnly: boolean;
  readonly selfEliminated: boolean;
  readonly isMyTurn: boolean;
  readonly skipAll: boolean;
  readonly dismissed: readonly HintId[];
  readonly hasRealIncoming: boolean;
  readonly hasUnspiedLivingOpponent: boolean;
}

export function shouldShowFirstGameHints(
  input: Pick<SelectHintInput, 'playKind' | 'readOnly' | 'selfEliminated'>,
): boolean {
  return input.playKind === 'classic' && !input.readOnly && !input.selfEliminated;
}

function isOpen(dismissed: readonly HintId[], id: HintId): boolean {
  return !dismissed.includes(id);
}

/**
 * L46-01 stub: Classic alive + your turn → `your-turn`.
 * L46-02 replaces this with the locked best-action table.
 */
export function selectHint(input: SelectHintInput): HintId | null {
  if (!shouldShowFirstGameHints(input) || input.skipAll) {
    return null;
  }
  if (input.isMyTurn && isOpen(input.dismissed, 'your-turn')) {
    return 'your-turn';
  }
  return null;
}
