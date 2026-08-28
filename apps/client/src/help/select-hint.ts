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
  /** True for action Thief or a special `*-thief` Incoming (not Spy). */
  readonly hasIncomingThief: boolean;
  /** POV is choosing an elimination reward (sub-choice). */
  readonly hasRewardChoice: boolean;
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
 * Locked 2026-08-26, extended 2026-08-28: one undismissed topic, highest first.
 * Reward (while POV is choosing) → incoming attack → incoming thief → (on turn)
 * your-turn → draw → hand → specials → shop → resources → hidden-kit.
 * Off turn after threats: hidden-kit.
 */
export function selectHint(input: SelectHintInput): HintId | null {
  if (!shouldShowFirstGameHints(input) || input.skipAll) {
    return null;
  }

  if (input.hasRewardChoice && isOpen(input.dismissed, 'reward')) {
    return 'reward';
  }

  if (input.hasIncomingAttack && isOpen(input.dismissed, 'incoming')) {
    return 'incoming';
  }
  if (input.hasIncomingThief && isOpen(input.dismissed, 'incoming-thief')) {
    return 'incoming-thief';
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
  if (isOpen(input.dismissed, 'hand')) {
    return 'hand';
  }
  if (isOpen(input.dismissed, 'specials')) {
    return 'specials';
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
  | 'inspect-hand'
  | 'inspect-special'
  | 'incoming-cleared'
  | 'incoming-thief-cleared'
  | 'confirm-reward';

export interface HintDismissContext {
  readonly hasIncomingAttack: boolean;
  readonly hasIncomingThief: boolean;
}

function actingIds(ctx: HintDismissContext): HintId[] {
  const ids: HintId[] = ['your-turn'];
  if (ctx.hasIncomingAttack) {
    ids.push('incoming');
  }
  if (ctx.hasIncomingThief) {
    ids.push('incoming-thief');
  }
  return ids;
}

export function hintIdsDismissedBy(
  cause: HintDismissCause,
  ctx: HintDismissContext,
): readonly HintId[] {
  switch (cause) {
    case 'playing-intent':
      return actingIds(ctx);
    case 'draw':
      return [...actingIds(ctx), 'draw'];
    case 'open-shop':
      return ['shop'];
    case 'inspect-opponent':
      return ['hidden-kit'];
    case 'inspect-hand':
      return ['hand'];
    case 'inspect-special':
      return ['specials'];
    case 'incoming-cleared':
      return ['incoming'];
    case 'incoming-thief-cleared':
      return ['incoming-thief'];
    case 'confirm-reward':
      return ['reward'];
  }
}
