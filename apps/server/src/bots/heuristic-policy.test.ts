/**
 * Heuristic policy — technical spec v3 §4.4 (L16-04).
 */

import { describe, expect, it } from 'vitest';

import type {
  PlayingStateView,
  PrivateSelfView,
  PublicConnectionView,
  PublicPlayerView,
} from '@card-battle/shared';

import { createRng } from '../engine/rng';
import type { TurnAction } from '../engine/turn/perform-action';
import { decide, pickEliminationRewards, pickMirrorRedirect } from './heuristic-policy';

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
    ...extras,
  };
}

function baseView(overrides: Partial<PlayingStateView> = {}): PlayingStateView {
  const self = overrides.self ?? baseSelf();
  const base: PlayingStateView = {
    phase: 'playing',
    you: 'bot-a',
    gameCode: 'TEST',
    currentTurnPlayerId: 'bot-a',
    turnSequence: 3,
    turnOrder: ['bot-a', 'bot-b'],
    turnDeadlineMs: null,
    players: [player('bot-a', 'Alpha', true), player('bot-b', 'Bravo', false)],
    self,
    pendingEffects: [],
    actionLog: [],
  };
  return { ...base, ...overrides, self: overrides.self ?? base.self };
}

describe('heuristic decide (L16-04)', () => {
  it('always returns a member of the action list', () => {
    const view = baseView({
      self: baseSelf({
        hand: [{ instanceId: 'atk-1', cardId: 'basic-attack', isUpgraded: false }],
      }),
    });
    const actions: TurnAction[] = [
      { type: 'draw' },
      { type: 'playCard', instanceId: 'atk-1', targetPlayerId: 'bot-b' },
    ];
    const pick = decide(view, actions, createRng('policy-member'));
    expect(actions).toContainEqual(pick);
  });

  it('is deterministic for the same view and seed', () => {
    const view = baseView({
      self: baseSelf({
        hand: [
          { instanceId: 'atk-1', cardId: 'strong-attack', isUpgraded: false },
          { instanceId: 'sh-1', cardId: 'shield', isUpgraded: false },
        ],
        points: 30,
      }),
    });
    const actions: TurnAction[] = [
      { type: 'draw' },
      { type: 'playCard', instanceId: 'atk-1', targetPlayerId: 'bot-b' },
      { type: 'playCard', instanceId: 'sh-1' },
      { type: 'buyUpgradePoint' },
    ];
    const a = decide(view, actions, createRng('policy-det'));
    const b = decide(view, actions, createRng('policy-det'));
    expect(a).toEqual(b);
  });

  it('Kamikaze never picks base Suicide', () => {
    const view = baseView({
      self: baseSelf({
        kitId: 'kamikaze',
        specialCards: [{ instanceId: 'su-1', cardId: 'suicide', isUpgraded: false }],
      }),
    });
    const actions: TurnAction[] = [
      { type: 'draw' },
      { type: 'playCard', instanceId: 'su-1' },
    ];
    expect(decide(view, actions, createRng('policy-suicide'))).toEqual({ type: 'draw' });
  });

  it('prefers lethal Spy-confirmed attack over draw', () => {
    const view = baseView({
      self: baseSelf({
        hand: [{ instanceId: 'sa-1', cardId: 'super-attack', isUpgraded: false }],
        points: 20,
      }),
      players: [
        player('bot-a', 'Alpha', true),
        player('bot-b', 'Bravo', false, {
          spied: {
            kitId: 'scientific',
            hand: [],
            specialCards: [],
            lives: 5,
            points: 0,
            upgradePoints: 0,
            shield: 0,
          },
        }),
      ],
    });
    const actions: TurnAction[] = [
      { type: 'draw' },
      { type: 'playCard', instanceId: 'sa-1', targetPlayerId: 'bot-b' },
    ];
    expect(decide(view, actions, createRng('policy-lethal'))).toEqual({
      type: 'playCard',
      instanceId: 'sa-1',
      targetPlayerId: 'bot-b',
    });
  });

  it('under threat prefers Mirror when legal', () => {
    const view = baseView({
      self: baseSelf({
        lives: 2,
        hand: [
          { instanceId: 'm1', cardId: 'mirror', isUpgraded: false },
          { instanceId: 'atk-1', cardId: 'basic-attack', isUpgraded: false },
        ],
      }),
      pendingEffects: [
        {
          id: 'eff-1',
          sourcePlayerId: 'bot-b',
          targetPlayerId: 'bot-a',
          cardId: 'super-attack',
          isUpgraded: false,
          queuedAt: 1,
          damageMultiplier: 1,
        },
      ],
    });
    const actions: TurnAction[] = [
      { type: 'draw' },
      { type: 'playCard', instanceId: 'm1' },
      { type: 'playCard', instanceId: 'atk-1', targetPlayerId: 'bot-b' },
    ];
    expect(decide(view, actions, createRng('policy-survive'))).toEqual({
      type: 'playCard',
      instanceId: 'm1',
    });
  });

  it('pickMirrorRedirect chooses a living non-source target', () => {
    const view = baseView({
      turnOrder: ['bot-a', 'bot-b', 'bot-c'],
      players: [
        player('bot-a', 'Alpha', true),
        player('bot-b', 'Bravo', false),
        player('bot-c', 'Charlie', false),
      ],
      pendingEffects: [
        {
          id: 'eff-1',
          sourcePlayerId: 'bot-b',
          targetPlayerId: 'bot-a',
          cardId: 'basic-attack',
          isUpgraded: false,
          queuedAt: 0,
          damageMultiplier: 1,
        },
      ],
    });
    const pick = pickMirrorRedirect(view, createRng('mirror-pick'));
    expect(pick).toEqual({ pendingEffectId: 'eff-1', newTargetPlayerId: 'bot-c' });
  });

  it('pickEliminationRewards prefers lives below half lifeLimit', () => {
    const view = baseView({ self: baseSelf({ lives: 5, points: 0 }) });
    const picks = pickEliminationRewards(view, [], 25, createRng('reward-lives'));
    expect(picks).toEqual([{ type: 'lives' }, { type: 'lives' }]);
  });
});
