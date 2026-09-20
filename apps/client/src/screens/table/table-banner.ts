/**
 * Table banner cues — L51-06 / technical spec v6 §5.1.
 * Presentation only. Attack tone matches L39 `threatToneFor`.
 */

import type { PendingEffectView, SentenceAnnouncementLogEntry } from '@card-battle/shared';

import { formatActionLogEntry } from '../../action-log/action-log';

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

export function emptyTableBannerWatch(): TableBannerWatch {
  return {
    seeded: false,
    wasMyTurn: false,
    wasEliminated: false,
    wasWon: false,
    seenIncomingIds: new Set(),
  };
}

export interface SentenceBannerWatch {
  seeded: boolean;
  seenKeys: ReadonlySet<string>;
}

export function emptySentenceBannerWatch(): SentenceBannerWatch {
  return { seeded: false, seenKeys: new Set() };
}

export function sentenceAnnouncementKey(entry: SentenceAnnouncementLogEntry): string {
  if (entry.kind === 'sentenceFired') {
    return `fire:${String(entry.turnSequence)}:${entry.sourcePlayerId}:${entry.targetPlayerId}`;
  }

  return `cd:${String(entry.turnSequence)}:${entry.sourcePlayerId}:${String(entry.remainingOwnerTurns)}`;
}

export interface SentenceBannerInput {
  announcements: readonly SentenceAnnouncementLogEntry[];
  nicknameOf: (id: string) => string;
  isEliminated: boolean;
  youWon: boolean;
}

/**
 * Flash only when a new public Sentence announcement appears (play, caster
 * decrement, or fire). Skip historical log on first paint. Other seats’ turns
 * add no announcement, so they do not flash.
 */
export function nextSentenceBannerLines(
  prev: SentenceBannerWatch,
  input: SentenceBannerInput,
): { lines: string[]; next: SentenceBannerWatch } {
  const next: SentenceBannerWatch = {
    seeded: true,
    seenKeys: new Set(input.announcements.map(sentenceAnnouncementKey)),
  };

  if (input.youWon || input.isEliminated) {
    return { lines: [], next };
  }

  if (!prev.seeded) {
    return { lines: [], next };
  }

  const lines = input.announcements
    .filter((entry) => !prev.seenKeys.has(sentenceAnnouncementKey(entry)))
    .map((entry) => formatActionLogEntry(entry, input.nicknameOf));
  return { lines, next };
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
