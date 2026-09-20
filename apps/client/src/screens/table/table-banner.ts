/**
 * Table banner cues — L51-06 / technical spec v6 §5.1.
 * Presentation only. Attack tone matches L39 `threatToneFor`.
 */

import type { PendingEffectView, PendingSentenceView } from '@card-battle/shared';

import {
  incomingTargetingYouIds,
  isPersistentPresentationId,
  newIncomingThreats,
} from '../../fx/incoming-threat-diff';
import { threatToneFor } from '../../fx/threat-tone';

export const TABLE_BANNER_MS = 1600;

export type TableBannerCue = 'turn' | 'attacked' | 'dead' | 'won';

export const TABLE_BANNER_COPY: Record<TableBannerCue, string> = {
  turn: 'Your turn',
  attacked: 'You are being attacked',
  dead: 'You are dead',
  won: 'You won!',
};

export function isFlashierBanner(cue: TableBannerCue): boolean {
  return cue === 'attacked' || cue === 'dead';
}

export interface TableBannerInput {
  isMyTurn: boolean;
  isEliminated: boolean;
  youWon: boolean;
  pendingEffects: readonly PendingEffectView[];
  you: string;
}

export interface TableBannerWatch {
  seeded: boolean;
  wasMyTurn: boolean;
  wasEliminated: boolean;
  wasWon: boolean;
  seenIncomingIds: ReadonlySet<string>;
}

export function formatSentenceBanner(remainingOwnerTurns: number): string {
  const unit = remainingOwnerTurns === 1 ? 'turn' : 'turns';
  return `${String(remainingOwnerTurns)} ${unit} before Sentence!`;
}

/**
 * One line per live Sentence, soonest first. Empty when none are ticking.
 */
export function sentenceBannerLines(
  pendingSentences: readonly PendingSentenceView[],
): string[] {
  if (pendingSentences.length === 0) {
    return [];
  }

  return [...pendingSentences]
    .sort((left, right) => left.remainingOwnerTurns - right.remainingOwnerTurns)
    .map((entry) => formatSentenceBanner(entry.remainingOwnerTurns));
}

export interface SentenceBannerInput {
  pendingSentences: readonly PendingSentenceView[];
  currentTurnPlayerId: string | null;
  turnSequence: number;
  isEliminated: boolean;
  youWon: boolean;
}

export interface SentenceBannerWatch {
  seeded: boolean;
  turnKey: string;
  pendingKey: string;
}

export function emptySentenceBannerWatch(): SentenceBannerWatch {
  return { seeded: false, turnKey: '', pendingKey: '' };
}

function sentenceTurnKey(currentTurnPlayerId: string | null, turnSequence: number): string {
  return `${currentTurnPlayerId ?? 'none'}:${String(turnSequence)}`;
}

/**
 * Flash on every table turn while a Sentence ticks, and when the first
 * countdown appears mid-turn (the play). Skip dead / won POV.
 */
export function nextSentenceBannerLines(
  prev: SentenceBannerWatch,
  input: SentenceBannerInput,
): { lines: string[]; next: SentenceBannerWatch } {
  const lines = sentenceBannerLines(input.pendingSentences);
  const pendingKey = lines.join('\n');
  const turnKey = sentenceTurnKey(input.currentTurnPlayerId, input.turnSequence);
  const next: SentenceBannerWatch = { seeded: true, turnKey, pendingKey };

  if (input.youWon || input.isEliminated || lines.length === 0) {
    return { lines: [], next };
  }

  if (!prev.seeded) {
    return { lines, next };
  }

  const appeared = prev.pendingKey.length === 0 && pendingKey.length > 0;
  const newTurn = prev.turnKey !== turnKey;
  if (appeared || newTurn) {
    return { lines, next };
  }

  return { lines: [], next };
}

export function emptyTableBannerWatch(): TableBannerWatch {
  return {
    seeded: false,
    wasMyTurn: false,
    wasEliminated: false,
    wasWon: false,
    seenIncomingIds: new Set(),
  };
}

/**
 * POV won: finished `winnerPlayerId`, or sole living seat during play.
 * Dead and won never queue together.
 */
export function povHasWon(
  players: readonly { id: string; isYou: boolean; isEliminated: boolean }[],
  you: string,
  finishedWinner: boolean,
): boolean {
  if (finishedWinner) {
    return true;
  }
  const self = players.find((player) => player.isYou);
  if (self?.isEliminated === true) {
    return false;
  }
  const alive = players.filter((player) => !player.isEliminated);
  return alive.length === 1 && alive[0]?.id === you;
}

export function nextTableBannerCues(
  prev: TableBannerWatch,
  input: TableBannerInput,
): { cues: TableBannerCue[]; next: TableBannerWatch } {
  const currentIncoming = incomingTargetingYouIds(input.pendingEffects, input.you);
  if (!prev.seeded) {
    const cues: TableBannerCue[] = [];
    if (input.youWon) {
      cues.push('won');
    } else if (input.isEliminated) {
      // EndScreen remounts the table on finish; first paint is the death cue.
      cues.push('dead');
    } else if (input.isMyTurn) {
      cues.push('turn');
    }
    return {
      cues,
      next: {
        seeded: true,
        wasMyTurn: input.isMyTurn,
        wasEliminated: input.isEliminated,
        wasWon: input.youWon,
        seenIncomingIds: currentIncoming,
      },
    };
  }

  const cues: TableBannerCue[] = [];
  if (!prev.wasWon && input.youWon) {
    cues.push('won');
  }
  if (!prev.wasEliminated && input.isEliminated && !input.youWon) {
    cues.push('dead');
  }

  const fresh = newIncomingThreats(prev.seenIncomingIds, input.pendingEffects, input.you);
  for (const effect of fresh) {
    if (isPersistentPresentationId(effect.id)) {
      continue;
    }
    if (threatToneFor(effect.cardId) === 'attack') {
      cues.push('attacked');
    }
  }

  if (
    !prev.wasMyTurn &&
    input.isMyTurn &&
    !input.isEliminated &&
    !input.youWon
  ) {
    cues.push('turn');
  }

  return {
    cues,
    next: {
      seeded: true,
      wasMyTurn: input.isMyTurn,
      wasEliminated: input.isEliminated,
      wasWon: input.youWon,
      seenIncomingIds: currentIncoming,
    },
  };
}
