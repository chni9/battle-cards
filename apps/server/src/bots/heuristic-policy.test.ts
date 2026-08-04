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

  it('cancels equal-damage mutual attack with Basic before drawing', () => {
    const view = baseView({
      self: baseSelf({
        lives: 10,
        points: 20,
        hand: [{ instanceId: 'basic-1', cardId: 'basic-attack', isUpgraded: false }],
      }),
      pendingEffects: [
        {
          id: 'eff-1',
          sourcePlayerId: 'bot-b',
          targetPlayerId: 'bot-a',
          cardId: 'basic-attack',
          isUpgraded: false,
          queuedAt: 1,
          damageMultiplier: 1,
        },
      ],
    });
    const actions: TurnAction[] = [
      { type: 'draw' },
      { type: 'playCard', instanceId: 'basic-1', targetPlayerId: 'bot-b' },
    ];
    expect(decide(view, actions, createRng('mutual-cancel'))).toEqual({
      type: 'playCard',
      instanceId: 'basic-1',
      targetPlayerId: 'bot-b',
    });
  });

  it('cancels weaker incoming Strong with Super before drawing', () => {
    const view = baseView({
      self: baseSelf({
        lives: 10,
        points: 20,
        hand: [{ instanceId: 'super-1', cardId: 'super-attack', isUpgraded: false }],
      }),
      pendingEffects: [
        {
          id: 'eff-1',
          sourcePlayerId: 'bot-b',
          targetPlayerId: 'bot-a',
          cardId: 'strong-attack',
          isUpgraded: false,
          queuedAt: 1,
          damageMultiplier: 1,
        },
      ],
    });
    const actions: TurnAction[] = [
      { type: 'draw' },
      { type: 'playCard', instanceId: 'super-1', targetPlayerId: 'bot-b' },
    ];
    expect(decide(view, actions, createRng('stronger-cancel'))).toEqual({
      type: 'playCard',
      instanceId: 'super-1',
      targetPlayerId: 'bot-b',
    });
  });

  it('soft-defense: prefers Regeneration over Super when a bigger hit cannot be cancelled', () => {
    const view = baseView({
      self: baseSelf({
        lives: 10,
        points: 20,
        hand: [
          { instanceId: 'regen-1', cardId: 'regeneration', isUpgraded: false },
          { instanceId: 'super-1', cardId: 'super-attack', isUpgraded: false },
        ],
      }),
      pendingEffects: [
        {
          id: 'eff-1',
          sourcePlayerId: 'bot-b',
          targetPlayerId: 'bot-a',
          // Upgraded Super (10) — base Super (7) cannot cancel; Regen should win Survive.
          cardId: 'super-attack',
          isUpgraded: true,
          queuedAt: 1,
          damageMultiplier: 1,
        },
      ],
    });
    const actions: TurnAction[] = [
      { type: 'draw' },
      { type: 'playCard', instanceId: 'regen-1', quantity: 4 },
      { type: 'playCard', instanceId: 'super-1', targetPlayerId: 'bot-b' },
    ];
    expect(decide(view, actions, createRng('soft-regen'))).toEqual({
      type: 'playCard',
      instanceId: 'regen-1',
      quantity: 4,
    });
  });

  it('soft-defense: prefers Shield over shop Tax when a hit is pending', () => {
    const view = baseView({
      self: baseSelf({
        lives: 10,
        points: 20,
        hand: [{ instanceId: 'sh-1', cardId: 'shield', isUpgraded: false }],
      }),
      pendingEffects: [
        {
          id: 'eff-1',
          sourcePlayerId: 'bot-b',
          targetPlayerId: 'bot-a',
          cardId: 'strong-attack',
          isUpgraded: false,
          queuedAt: 1,
          damageMultiplier: 1,
        },
      ],
    });
    const actions: TurnAction[] = [
      { type: 'buyCard', cardId: 'tax' },
      { type: 'playCard', instanceId: 'sh-1' },
      { type: 'draw' },
    ];
    expect(decide(view, actions, createRng('soft-shield'))).toEqual({
      type: 'playCard',
      instanceId: 'sh-1',
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
    expect(pick).toEqual({
      pendingEffectId: 'eff-1',
      newTargetPlayerId: 'bot-c',
      reason: { code: 'mirror-highest-damage' },
    });
  });

  it('pickEliminationRewards prefers lives below half lifeLimit', () => {
    const view = baseView({ self: baseSelf({ lives: 5, points: 0 }) });
    const picks = pickEliminationRewards(view, [], 25, createRng('reward-lives'));
    expect(picks).toEqual([{ type: 'lives' }, { type: 'lives' }]);
  });

  it('prefers upgraded Super over Basic on the same target (committed strike)', () => {
    const view = baseView({
      self: baseSelf({
        points: 20,
        hand: [
          { instanceId: 'basic-1', cardId: 'basic-attack', isUpgraded: false },
          { instanceId: 'super-1', cardId: 'super-attack', isUpgraded: true },
        ],
      }),
    });
    const actions: TurnAction[] = [
      { type: 'playCard', instanceId: 'basic-1', targetPlayerId: 'bot-b' },
      { type: 'playCard', instanceId: 'super-1', targetPlayerId: 'bot-b' },
      { type: 'draw' },
    ];
    expect(decide(view, actions, createRng('prefer-super'))).toEqual({
      type: 'playCard',
      instanceId: 'super-1',
      targetPlayerId: 'bot-b',
    });
  });

  it('defers base attacks — prefers buyUpgradePoint over chip Basic or base Super', () => {
    const view = baseView({
      self: baseSelf({
        points: 20,
        upgradePoints: 0,
        hand: [
          { instanceId: 'basic-1', cardId: 'basic-attack', isUpgraded: false },
          { instanceId: 'super-1', cardId: 'super-attack', isUpgraded: false },
        ],
      }),
    });
    const actions: TurnAction[] = [
      { type: 'playCard', instanceId: 'basic-1', targetPlayerId: 'bot-b' },
      { type: 'playCard', instanceId: 'super-1', targetPlayerId: 'bot-b' },
      { type: 'buyUpgradePoint' },
      { type: 'draw' },
    ];
    expect(decide(view, actions, createRng('invest-first'))).toEqual({
      type: 'buyUpgradePoint',
    });
  });

  it('prefers safe Tax play over base attack (point engine)', () => {
    const view = baseView({
      self: baseSelf({
        lives: 15,
        points: 5,
        hand: [
          { instanceId: 'tax-1', cardId: 'tax', isUpgraded: false },
          { instanceId: 'basic-1', cardId: 'basic-attack', isUpgraded: false },
        ],
      }),
    });
    const actions: TurnAction[] = [
      { type: 'playCard', instanceId: 'tax-1' },
      { type: 'playCard', instanceId: 'basic-1', targetPlayerId: 'bot-b' },
      { type: 'draw' },
    ];
    expect(decide(view, actions, createRng('tax-engine'))).toEqual({
      type: 'playCard',
      instanceId: 'tax-1',
    });
  });

  it('prefers upgrading Super over playing the base copy', () => {
    const view = baseView({
      self: baseSelf({
        points: 20,
        upgradePoints: 1,
        hand: [{ instanceId: 'super-1', cardId: 'super-attack', isUpgraded: false }],
      }),
    });
    const actions: TurnAction[] = [
      { type: 'playCard', instanceId: 'super-1', targetPlayerId: 'bot-b' },
      { type: 'upgradeCard', instanceId: 'super-1' },
      { type: 'draw' },
    ];
    expect(decide(view, actions, createRng('upgrade-before-strike'))).toEqual({
      type: 'upgradeCard',
      instanceId: 'super-1',
    });
  });

  it('refuses Tax when lives are only just above incoming threat + buffer', () => {
    const view = baseView({
      self: baseSelf({
        lives: 5,
        hand: [{ instanceId: 'tax-1', cardId: 'tax', isUpgraded: false }],
      }),
      // buffer 5 + threat 0 → need lives > 5 to Tax; at 5, Tax is illegal for the policy
    });
    const actions: TurnAction[] = [
      { type: 'playCard', instanceId: 'tax-1' },
      { type: 'draw' },
    ];
    expect(decide(view, actions, createRng('tax-buffer'))).toEqual({ type: 'draw' });
  });

  it('refuses buying Tax when the life cost would kill or breach the Tax buffer', () => {
    const view = baseView({
      self: baseSelf({
        lives: 2,
        points: 0,
        hand: [],
      }),
    });
    const actions: TurnAction[] = [
      { type: 'buyCard', cardId: 'tax' },
      { type: 'draw' },
    ];
    expect(decide(view, actions, createRng('buy-tax-lethal'))).toEqual({ type: 'draw' });
  });

  it('refuses buying Tax when lives after buy would sit at or below the Tax buffer', () => {
    const view = baseView({
      self: baseSelf({
        lives: 7,
        points: 0,
        hand: [],
      }),
    });
    // After −2 lives → 5, and 5 <= threat(0) + buffer(5) → refuse
    const actions: TurnAction[] = [
      { type: 'buyCard', cardId: 'tax' },
      { type: 'draw' },
    ];
    expect(decide(view, actions, createRng('buy-tax-buffer'))).toEqual({ type: 'draw' });
  });

  it('refuses buying a card already held in hand', () => {
    const view = baseView({
      self: baseSelf({
        lives: 15,
        points: 20,
        hand: [{ instanceId: 'tax-1', cardId: 'tax', isUpgraded: false }],
      }),
    });
    const actions: TurnAction[] = [
      { type: 'buyCard', cardId: 'tax' },
      { type: 'buyCard', cardId: 'basic-attack' },
      { type: 'draw' },
    ];
    expect(decide(view, actions, createRng('no-dup-tax'))).toEqual({
      type: 'buyCard',
      cardId: 'basic-attack',
    });
  });

  it('prefers Spy on an unspied opponent over Tax or buyUpgradePoint', () => {
    const view = baseView({
      self: baseSelf({
        lives: 15,
        points: 20,
        hand: [
          { instanceId: 'spy-1', cardId: 'spy', isUpgraded: false },
          { instanceId: 'tax-1', cardId: 'tax', isUpgraded: false },
        ],
      }),
    });
    const actions: TurnAction[] = [
      { type: 'playCard', instanceId: 'spy-1', targetPlayerId: 'bot-b' },
      { type: 'playCard', instanceId: 'tax-1' },
      { type: 'buyUpgradePoint' },
      { type: 'draw' },
    ];
    expect(decide(view, actions, createRng('spy-intel'))).toEqual({
      type: 'playCard',
      instanceId: 'spy-1',
      targetPlayerId: 'bot-b',
    });
  });

  it('does not re-Spy a seat that is already Spied (base)', () => {
    const view = baseView({
      self: baseSelf({
        lives: 15,
        points: 20,
        hand: [
          { instanceId: 'spy-1', cardId: 'spy', isUpgraded: false },
          { instanceId: 'tax-1', cardId: 'tax', isUpgraded: false },
        ],
      }),
      players: [
        player('bot-a', 'Alpha', true),
        player('bot-b', 'Bravo', false, {
          spied: {
            kitId: 'assassin',
            hand: [],
            specialCards: [],
            resourcesSnapshot: {
              lives: 12,
              points: 5,
              upgradePoints: 0,
              shield: 0,
              turnSequence: 1,
            },
          },
        }),
      ],
    });
    const actions: TurnAction[] = [
      { type: 'playCard', instanceId: 'spy-1', targetPlayerId: 'bot-b' },
      { type: 'playCard', instanceId: 'tax-1' },
      { type: 'draw' },
    ];
    expect(decide(view, actions, createRng('spy-skip'))).toEqual({
      type: 'playCard',
      instanceId: 'tax-1',
    });
  });
});
