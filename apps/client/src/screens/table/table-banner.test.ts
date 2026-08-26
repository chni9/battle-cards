/**
 * Table banner trigger helpers — L51-06.
 */

import { describe, expect, it } from 'vitest';

import type { CardId, PendingEffectView } from '@card-battle/shared';

import {
  emptyTableBannerWatch,
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

  it('skips dead on first paint when already eliminated', () => {
    const { cues } = nextTableBannerCues(emptyTableBannerWatch(), {
      isMyTurn: false,
      isEliminated: true,
      youWon: false,
      pendingEffects: [],
      you: 'me',
    });
    expect(cues).toEqual([]);
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
