/**
 * Sub-choice pick heuristics — steal, pool-pick, special-pick, reanimation kit (L29-08).
 */

import { describe, expect, it } from 'vitest';

import type {
  CardInstance,
  PlayingStateView,
  PrivateSelfView,
  PublicConnectionView,
  PublicPlayerView,
} from '@card-battle/shared';

import { createRng } from '../engine/rng';
import {
  pickPoolInstanceIds,
  pickReanimationKitId,
  pickSpecialCardId,
  pickStealInstanceId,
} from './sub-choice-picks';

const CONNECTED: PublicConnectionView = {
  status: 'connected',
  disconnectedAt: null,
  automaticTurnsTaken: 0,
  consecutiveTimeouts: 0,
};

function baseSelf(overrides: Partial<PrivateSelfView> = {}): PrivateSelfView {
  return {
    lives: 10,
    shield: 0,
    shieldIsUpgraded: false,
    points: 20,
    upgradePoints: 0,
    kitId: 'assassin',
    hand: [],
    specialCards: [],
    activePersistentEffects: [],
    attackBlockCharges: 0,
    ...overrides,
  };
}

function player(
  id: string,
  isYou: boolean,
  extras: Partial<PublicPlayerView> = {},
): PublicPlayerView {
  return {
    id,
    nickname: id,
    isEliminated: false,
    isYou,
    isBot: true,
    botDifficulty: 'hard',
    connection: CONNECTED,
    activePersistentEffects: [],
    activeShield: null,
    blockTurnsRemaining: 0,
    blockAttacksForbidden: false,
    activeAttackBlock: null,
    duplicationActive: false,
    pendingReanimation: null,
    absorbWindowOpen: false,
    ...extras,
  };
}

function view(overrides: Partial<PlayingStateView> = {}): PlayingStateView {
  return {
    phase: 'playing',
    you: 'you',
    gameCode: 'TEST',
    currentTurnPlayerId: 'you',
    turnSequence: 1,
    turnOrder: ['you', 'victim'],
    turnDeadlineMs: null,
    players: [player('you', true), player('victim', false)],
    self: baseSelf(),
    pendingEffects: [],
    actionLog: [],
    pool: [],
    playKind: 'classic',
    tutorialIndex: null,
    ...overrides,
  };
}

describe('pickStealInstanceId (L29-08)', () => {
  it('prefers an upgraded attack over a base attack, a special or a plain action', () => {
    const victimView = view({
      players: [
        player('you', true),
        player('victim', false, {
          spied: {
            kitId: 'assassin',
            hand: [
              { instanceId: 'basic-1', cardId: 'basic-attack', isUpgraded: false },
              { instanceId: 'strong-1', cardId: 'strong-attack', isUpgraded: true },
              { instanceId: 'shield-1', cardId: 'shield', isUpgraded: false },
            ],
            specialCards: [{ instanceId: 'poi-1', cardId: 'poison', isUpgraded: false }],
          },
        }),
      ],
    });
    const eligible = ['basic-1', 'strong-1', 'shield-1', 'poi-1'];
    expect(pickStealInstanceId(victimView, eligible, createRng('steal-pref'))).toBe('strong-1');
  });

  it('prefers a special over a plain action when no attack is eligible', () => {
    const victimView = view({
      players: [
        player('you', true),
        player('victim', false, {
          spied: {
            kitId: 'assassin',
            hand: [{ instanceId: 'shield-1', cardId: 'shield', isUpgraded: false }],
            specialCards: [{ instanceId: 'poi-1', cardId: 'poison', isUpgraded: false }],
          },
        }),
      ],
    });
    const eligible = ['shield-1', 'poi-1'];
    expect(pickStealInstanceId(victimView, eligible, createRng('steal-special'))).toBe('poi-1');
  });

  it('falls back to rng when no player is spied', () => {
    const noIntelView = view();
    const eligible = ['a', 'b', 'c'];
    const picked = pickStealInstanceId(noIntelView, eligible, createRng('steal-fallback'));
    expect(eligible).toContain(picked);
  });

  it('throws on an empty candidate list', () => {
    expect(() => pickStealInstanceId(view(), [], createRng('steal-empty'))).toThrow(RangeError);
  });
});

describe('pickPoolInstanceIds (L29-08)', () => {
  const poolCards: CardInstance[] = [
    { instanceId: 'action-1', cardId: 'shield', isUpgraded: false },
    { instanceId: 'attack-base-1', cardId: 'basic-attack', isUpgraded: false },
    { instanceId: 'attack-up-1', cardId: 'strong-attack', isUpgraded: true },
    { instanceId: 'special-1', cardId: 'poison', isUpgraded: false },
  ];

  it('returns every eligible card when maxCount covers them all', () => {
    const eligible = poolCards.map((card) => card.instanceId);
    const picked = pickPoolInstanceIds(poolCards, eligible, 4, createRng('pool-all'));
    expect(new Set(picked)).toEqual(new Set(eligible));
  });

  it('prefers specials, then upgraded attacks, then attacks, then actions', () => {
    const eligible = poolCards.map((card) => card.instanceId);
    const picked = pickPoolInstanceIds(poolCards, eligible, 2, createRng('pool-pref'));
    expect(picked).toEqual(['special-1', 'attack-up-1']);
  });

  it('returns nothing for maxCount 0 or an empty eligible set', () => {
    expect(pickPoolInstanceIds(poolCards, [], 4, createRng('pool-empty'))).toEqual([]);
    expect(
      pickPoolInstanceIds(poolCards, poolCards.map((c) => c.instanceId), 0, createRng('pool-zero')),
    ).toEqual([]);
  });
});

describe('pickSpecialCardId (L29-08)', () => {
  it('picks the highest-preference eligible special', () => {
    expect(
      pickSpecialCardId(['reanimation', 'poison', 'mega-attack'], createRng('special-pref')),
    ).toBe('mega-attack');
  });

  it('throws on an empty candidate list', () => {
    expect(() => pickSpecialCardId([], createRng('special-empty'))).toThrow(RangeError);
  });
});

describe('pickReanimationKitId (L29-08)', () => {
  it('prefers the highest starting lives', () => {
    expect(
      pickReanimationKitId(['duplicator', 'indestructible', 'assassin'], createRng('kit-lives')),
    ).toBe('indestructible');
  });

  it('breaks a lives tie with rng among equal-lives, equal-draw kits', () => {
    // untouchable / scientific / assassin are all (10 lives, 1 draw).
    const picked = pickReanimationKitId(
      ['untouchable', 'scientific', 'assassin'],
      createRng('kit-tie'),
    );
    expect(['untouchable', 'scientific', 'assassin']).toContain(picked);
  });

  it('throws on an empty candidate list', () => {
    expect(() => pickReanimationKitId([], createRng('kit-empty'))).toThrow(RangeError);
  });
});
