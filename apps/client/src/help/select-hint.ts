/**
 * First-real-game hint selector — technical spec v6 §5.2 / L46-02.
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
  /** True only for attack Incoming (not Spy / Thief / persistents). */
  readonly hasIncomingAttack: boolean;
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
 * Locked 2026-08-26: one undismissed topic, highest first.
 * On turn: incoming (attacks only) → your-turn → draw → shop → resources → hidden-kit.
 * Off turn: incoming (attacks only) → hidden-kit.
 */
export function selectHint(input: SelectHintInput): HintId | null {
  if (!shouldShowFirstGameHints(input) || input.skipAll) {
    return null;
  }

  if (input.hasIncomingAttack && isOpen(input.dismissed, 'incoming')) {
    return 'incoming';
  }

  if (!input.isMyTurn) {
    if (input.hasUnspiedLivingOpponent && isOpen(input.dismissed, 'hidden-kit')) {
      return 'hidden-kit';
    }
    return null;
  }

  if (isOpen(input.dismissed, 'your-turn')) {
    return 'your-turn';
  }
  if (isOpen(input.dismissed, 'draw')) {
    return 'draw';
  }
  if (isOpen(input.dismissed, 'shop')) {
    return 'shop';
  }
  if (isOpen(input.dismissed, 'resources')) {
    return 'resources';
  }
  if (input.hasUnspiedLivingOpponent && isOpen(input.dismissed, 'hidden-kit')) {
    return 'hidden-kit';
  }
  return null;
}

export type HintDismissCause =
  | 'playing-intent'
  | 'draw'
  | 'open-shop'
  | 'inspect-opponent'
  | 'incoming-cleared';

export function hintIdsDismissedBy(
  cause: HintDismissCause,
  ctx: { hasIncomingAttack: boolean },
): readonly HintId[] {
  switch (cause) {
    case 'playing-intent':
      return ctx.hasIncomingAttack ? ['your-turn', 'incoming'] : ['your-turn'];
    case 'draw':
      return ctx.hasIncomingAttack
        ? ['your-turn', 'draw', 'incoming']
        : ['your-turn', 'draw'];
    case 'open-shop':
      return ['shop'];
    case 'inspect-opponent':
      return ['hidden-kit'];
    case 'incoming-cleared':
      return ['incoming'];
  }
}
