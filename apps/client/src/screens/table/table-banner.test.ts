/**
 * Table banner trigger helpers — L51-06.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import type { CardId, PendingEffectView, SentenceAnnouncementLogEntry } from '@card-battle/shared';

import { formatActionLogEntry } from '../../action-log/action-log';
import {
  emptySentenceBannerWatch,
  emptyTableBannerWatch,
  nextSentenceBannerLines,
  nextTableBannerCues,
  povHasWon,
  TABLE_BANNER_COPY,
} from './table-banner';

function pending(
  id: string,
  cardId: CardId,
  targetPlayerId: string,
): PendingEffectView {
  return {
    id,
    cardId,
    isUpgraded: false,
    sourcePlayerId: 'opp',
    targetPlayerId,
    queuedAt: 1,
    damageMultiplier: 1,
    redirectedBy: null,
  };
}

describe('table banners (L51-06)', () => {
  it('enqueues seed cues synchronously so Strict Mode cannot drop them', () => {
    const flash = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), 'your-turn-flash.tsx'),
      'utf8',
    );
    expect(flash).toContain('setQueue((current) => [...current, ...cues])');
    expect(flash).toContain('Synchronous enqueue');
    expect(flash).not.toContain('setTimeout(() => {\n      setQueue((current) => [...current, ...cues])');
  });

  it('locks copy including You won! without a space', () => {
    expect(TABLE_BANNER_COPY.turn).toBe('Your turn');
    expect(TABLE_BANNER_COPY.attacked).toBe('You are being attacked');
    expect(TABLE_BANNER_COPY.dead).toBe('You are dead');
    expect(TABLE_BANNER_COPY.won).toBe('You won!');
    expect(TABLE_BANNER_COPY.won).not.toMatch(/You won !/);
  });

  it('never reports won and dead on the same seat', () => {
    expect(
      povHasWon(
        [
          { id: 'me', isYou: true, isEliminated: true },
          { id: 'opp', isYou: false, isEliminated: true },
        ],
        'me',
        false,
      ),
    ).toBe(false);
    expect(
      povHasWon(
        [
          { id: 'me', isYou: true, isEliminated: false },
          { id: 'opp', isYou: false, isEliminated: true },
        ],
        'me',
        true,
      ),
    ).toBe(true);
  });

  it('flashes You won! on first finished paint and skips dead', () => {
    const { cues } = nextTableBannerCues(emptyTableBannerWatch(), {
      isMyTurn: false,
      isEliminated: false,
      youWon: true,
      pendingEffects: [],
      you: 'me',
    });
    expect(cues).toEqual(['won']);
    expect(cues).not.toContain('dead');
  });

  it('flashes You are dead on first finished paint when you lost', () => {
    const { cues } = nextTableBannerCues(emptyTableBannerWatch(), {
      isMyTurn: false,
      isEliminated: true,
      youWon: false,
      pendingEffects: [],
      you: 'me',
    });
    expect(cues).toEqual(['dead']);
    expect(cues).not.toContain('won');
  });

  it('flashes attacked once per new attack-tone Incoming id', () => {
    const first = nextTableBannerCues(emptyTableBannerWatch(), {
      isMyTurn: false,
      isEliminated: false,
      youWon: false,
      pendingEffects: [pending('a', 'basic-attack', 'me')],
      you: 'me',
    });
    expect(first.cues).not.toContain('attacked');

    const second = nextTableBannerCues(first.next, {
      isMyTurn: false,
      isEliminated: false,
      youWon: false,
      pendingEffects: [
        pending('a', 'basic-attack', 'me'),
        pending('b', 'super-attack', 'me'),
      ],
      you: 'me',
    });
    expect(second.cues).toEqual(['attacked']);

    const spy = nextTableBannerCues(second.next, {
      isMyTurn: false,
      isEliminated: false,
      youWon: false,
      pendingEffects: [
        pending('a', 'basic-attack', 'me'),
        pending('b', 'super-attack', 'me'),
        pending('c', 'spy', 'me'),
      ],
      you: 'me',
    });
    expect(spy.cues).toEqual([]);
  });

  it('flashes dead on the elimination edge, not when youWon', () => {
    const seeded = nextTableBannerCues(emptyTableBannerWatch(), {
      isMyTurn: true,
      isEliminated: false,
      youWon: false,
      pendingEffects: [],
      you: 'me',
    });
    const dead = nextTableBannerCues(seeded.next, {
      isMyTurn: false,
      isEliminated: true,
      youWon: false,
      pendingEffects: [],
      you: 'me',
    });
    expect(dead.cues).toEqual(['dead']);

    const wonInstead = nextTableBannerCues(seeded.next, {
      isMyTurn: false,
      isEliminated: true,
      youWon: true,
      pendingEffects: [],
      you: 'me',
    });
    expect(wonInstead.cues).toEqual(['won']);
    expect(wonInstead.cues).not.toContain('dead');
  });

  it('does not ring presentation persistents as attacked', () => {
    const seeded = nextTableBannerCues(emptyTableBannerWatch(), {
      isMyTurn: false,
      isEliminated: false,
      youWon: false,
      pendingEffects: [],
      you: 'me',
    });
    const next = nextTableBannerCues(seeded.next, {
      isMyTurn: false,
      isEliminated: false,
      youWon: false,
      pendingEffects: [pending('persistent:imposition:x', 'imposition', 'me')],
      you: 'me',
    });
    expect(next.cues).toEqual([]);
  });
});

describe('Sentence countdown banners (L63-03)', () => {
  const nick = (id: string): string => (id === 'b' ? 'Bob' : 'Alice');

  function input(
    announcements: readonly SentenceAnnouncementLogEntry[],
    extras: { isEliminated?: boolean; youWon?: boolean } = {},
  ): Parameters<typeof nextSentenceBannerLines>[1] {
    return {
      announcements,
      nicknameOf: nick,
      isEliminated: extras.isEliminated === true,
      youWon: extras.youWon === true,
    };
  }

  it('copies play, decrement, and fire from the public announcement', () => {
    expect(
      formatActionLogEntry(
        {
          kind: 'sentenceCountdown',
          sourcePlayerId: 'a',
          remainingOwnerTurns: 3,
          turnSequence: 1,
        },
        nick,
      ),
    ).toBe('Sentence in 3 turns!');
    expect(
      formatActionLogEntry(
        {
          kind: 'sentenceCountdown',
          sourcePlayerId: 'a',
          remainingOwnerTurns: 2,
          turnSequence: 3,
        },
        nick,
      ),
    ).toBe('2 turns before Sentence!');
    expect(
      formatActionLogEntry(
        {
          kind: 'sentenceFired',
          sourcePlayerId: 'a',
          targetPlayerId: 'b',
          turnSequence: 7,
        },
        nick,
      ),
    ).toBe('Sentence will kill Bob!');
  });

  it('flashes on Sentence play, caster decrement, and fire — not on a later paint of the same log', () => {
    const play: SentenceAnnouncementLogEntry = {
      kind: 'sentenceCountdown',
      sourcePlayerId: 'a',
      remainingOwnerTurns: 3,
      turnSequence: 1,
    };
    const seeded = nextSentenceBannerLines(emptySentenceBannerWatch(), input([]));
    expect(seeded.lines).toEqual([]);

    const appeared = nextSentenceBannerLines(seeded.next, input([play]));
    expect(appeared.lines).toEqual(['Sentence in 3 turns!']);

    const same = nextSentenceBannerLines(appeared.next, input([play]));
    expect(same.lines).toEqual([]);

    const tick: SentenceAnnouncementLogEntry = {
      kind: 'sentenceCountdown',
      sourcePlayerId: 'a',
      remainingOwnerTurns: 2,
      turnSequence: 3,
    };
    const decrement = nextSentenceBannerLines(same.next, input([play, tick]));
    expect(decrement.lines).toEqual(['2 turns before Sentence!']);

    const fire: SentenceAnnouncementLogEntry = {
      kind: 'sentenceFired',
      sourcePlayerId: 'a',
      targetPlayerId: 'b',
      turnSequence: 7,
    };
    const fired = nextSentenceBannerLines(decrement.next, input([play, tick, fire]));
    expect(fired.lines).toEqual(['Sentence will kill Bob!']);
  });

  it('does not flash when the log is unchanged on another player’s turn', () => {
    const play: SentenceAnnouncementLogEntry = {
      kind: 'sentenceCountdown',
      sourcePlayerId: 'a',
      remainingOwnerTurns: 3,
      turnSequence: 1,
    };
    const seeded = nextSentenceBannerLines(emptySentenceBannerWatch(), input([]));
    const shown = nextSentenceBannerLines(seeded.next, input([play]));
    expect(shown.lines).toEqual(['Sentence in 3 turns!']);
    const opponentTurn = nextSentenceBannerLines(shown.next, input([play]));
    expect(opponentTurn.lines).toEqual([]);
  });

  it('flashes play, tick, and fire for eliminated and won POVs', () => {
    const play: SentenceAnnouncementLogEntry = {
      kind: 'sentenceCountdown',
      sourcePlayerId: 'a',
      remainingOwnerTurns: 3,
      turnSequence: 1,
    };
    const tick: SentenceAnnouncementLogEntry = {
      kind: 'sentenceCountdown',
      sourcePlayerId: 'a',
      remainingOwnerTurns: 2,
      turnSequence: 3,
    };
    const fire: SentenceAnnouncementLogEntry = {
      kind: 'sentenceFired',
      sourcePlayerId: 'a',
      targetPlayerId: 'b',
      turnSequence: 7,
    };

    const deadSeed = nextSentenceBannerLines(
      emptySentenceBannerWatch(),
      input([], { isEliminated: true }),
    );
    expect(deadSeed.lines).toEqual([]);
    const deadPlay = nextSentenceBannerLines(
      deadSeed.next,
      input([play], { isEliminated: true }),
    );
    expect(deadPlay.lines).toEqual(['Sentence in 3 turns!']);
    const deadTick = nextSentenceBannerLines(
      deadPlay.next,
      input([play, tick], { isEliminated: true }),
    );
    expect(deadTick.lines).toEqual(['2 turns before Sentence!']);
    const deadFire = nextSentenceBannerLines(
      deadTick.next,
      input([play, tick, fire], { isEliminated: true }),
    );
    expect(deadFire.lines).toEqual(['Sentence will kill Bob!']);

    const wonSeed = nextSentenceBannerLines(
      emptySentenceBannerWatch(),
      input([], { youWon: true }),
    );
    expect(wonSeed.lines).toEqual([]);
    const wonPlay = nextSentenceBannerLines(wonSeed.next, input([play], { youWon: true }));
    expect(wonPlay.lines).toEqual(['Sentence in 3 turns!']);
  });

  it('locks the scary Sentence banner in the Motion flash', () => {
    const flash = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), 'your-turn-flash.tsx'),
      'utf8',
    );
    expect(flash).toContain('data-banner="sentence"');
    expect(flash).toContain('nextSentenceBannerLines');
    expect(flash).toContain('setSentenceQueue');
  });
});
