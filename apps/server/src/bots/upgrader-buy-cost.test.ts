/**
 * Absorber spend proxy — per-kit UP buy cost (#V4-28 follow-up).
 */

import { describe, expect, it } from 'vitest';

import type {
  PlayingStateView,
  PrivateSelfView,
  PublicConnectionView,
  PublicPlayerView,
} from '@card-battle/shared';

import { lastCompleteTurnSpendByActor } from './policy-internals';

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
  nickname: string,
  isYou: boolean,
  extras: Partial<PublicPlayerView> = {},
): PublicPlayerView {
  return {
    id,
    nickname,
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
  const self = overrides.self ?? baseSelf();
  const base: PlayingStateView = {
    phase: 'playing',
    you: 'bot-a',
    gameCode: 'TEST',
    currentTurnPlayerId: 'bot-a',
    turnSequence: 5,
    turnOrder: ['bot-a', 'bot-b'],
    turnDeadlineMs: null,
    players: [player('bot-a', 'Alpha', true), player('bot-b', 'Bravo', false)],
    self,
    pendingEffects: [],
    actionLog: [],
    pool: [],
    playKind: 'classic',
    tutorialIndex: null,
  };
  return { ...base, ...overrides, self: overrides.self ?? base.self };
}

describe('lastCompleteTurnSpendByActor UP buy cost', () => {
  it('counts Upgrader self buy at 5', () => {
    const result = lastCompleteTurnSpendByActor(
      view({
        self: baseSelf({ kitId: 'upgrader' }),
        actionLog: [
          {
            kind: 'actionPlayed',
            actorPlayerId: 'bot-a',
            action: 'buyUpgradePoint',
            turnSequence: 2,
          },
        ],
      }),
    );
    expect(result.points.get('bot-a')).toBe(5);
  });

  it('counts unspied opponent buy at global 10', () => {
    const result = lastCompleteTurnSpendByActor(
      view({
        actionLog: [
          {
            kind: 'actionPlayed',
            actorPlayerId: 'bot-b',
            action: 'buyUpgradePoint',
            turnSequence: 2,
          },
        ],
      }),
    );
    expect(result.points.get('bot-b')).toBe(10);
  });

  it('counts Spy-revealed Upgrader opponent buy at 5', () => {
    const result = lastCompleteTurnSpendByActor(
      view({
        players: [
          player('bot-a', 'Alpha', true),
          player('bot-b', 'Bravo', false, {
            spied: {
              kitId: 'upgrader',
              hand: [],
              specialCards: [],
            },
          }),
        ],
        actionLog: [
          {
            kind: 'actionPlayed',
            actorPlayerId: 'bot-b',
            action: 'buyUpgradePoint',
            turnSequence: 2,
          },
        ],
      }),
    );
    expect(result.points.get('bot-b')).toBe(5);
  });
});
