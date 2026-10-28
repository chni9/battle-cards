/**
 * Opponent seat resource visibility — L51-08.
 */

import { describe, expect, it } from 'vitest';

import {
  opponentHasLiveResourceIcons,
  opponentKitIsVisible,
  opponentResourceDisplay,
} from './opponent-seat-resources';

const snapshot = {
  lives: 12,
  points: 9,
  upgradePoints: 2,
  shield: 4,
  turnSequence: 3,
};

describe('opponent seat resources (L51-08)', () => {
  it('shows unknown for unspied and for a pre-Lot-69 snapshot fixture, never snapshot totals', () => {
    expect(opponentResourceDisplay({})).toEqual({ known: false });
    expect(
      opponentResourceDisplay({
        spied: {
          kitId: 'scientific',
          hand: [],
          specialCards: [],
          resourcesSnapshot: snapshot,
        },
      }),
    ).toEqual({ known: false });
    expect(opponentKitIsVisible({ spied: {
      kitId: 'scientific',
      hand: [],
      specialCards: [],
      resourcesSnapshot: snapshot,
    } })).toBe(true);
    expect(opponentHasLiveResourceIcons({})).toBe(false);
  });

  it('uses live upgraded Spy numbers and death reveal', () => {
    expect(
      opponentResourceDisplay({
        spied: {
          kitId: 'scientific',
          hand: [],
          specialCards: [],
          lives: 8,
          points: 3,
          upgradePoints: 1,
          shield: 0,
          resourcesSnapshot: snapshot,
        },
      }),
    ).toEqual({
      known: true,
      values: { lives: 8, points: 3, upgradePoints: 1, shield: 0 },
    });
    expect(
      opponentResourceDisplay({
        eliminationReveal: {
          kitId: 'kamikaze',
          hand: [],
          specialCards: [],
          lives: 0,
          points: 5,
          upgradePoints: 0,
          shield: 2,
          shieldIsUpgraded: false,
          turnSequence: 9,
        },
      }).known,
    ).toBe(true);
  });
});
