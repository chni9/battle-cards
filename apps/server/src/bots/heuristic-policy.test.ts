/**
 * Heuristic policy — technical spec v3 §4.4 (L16-04).
 */

import { describe, expect, it, vi } from 'vitest';

import * as shared from '@card-battle/shared';
import type {
  PlayingStateView,
  PrivateSelfView,
  PublicConnectionView,
  PublicPlayerView,
} from '@card-battle/shared';

import { createRng } from '../engine/rng';
import type { TurnAction } from '../engine/turn/perform-action';
import { HEURISTIC_BAND_WEIGHTS } from './heuristic-weights';
import {
  decide,
  pickEliminationRewards,
  pickMirrorRedirect,
  scoreActions,
} from './heuristic-policy';

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
    pool: [],
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

  it('L29-04: non-Kamikaze plays a stolen upgraded Suicide for a Spy-confirmed elim', () => {
    const view = baseView({
      self: baseSelf({
        kitId: 'assassin',
        specialCards: [{ instanceId: 'su-1', cardId: 'suicide', isUpgraded: true }],
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
      { type: 'playCard', instanceId: 'su-1' },
    ];
    expect(decide(view, actions, createRng('l29-04-suicide-elim'))).toEqual({
      type: 'playCard',
      instanceId: 'su-1',
    });
  });

  it('L29-04: non-Kamikaze refuses stolen upgraded Suicide without an elim signal', () => {
    const view = baseView({
      self: baseSelf({
        kitId: 'assassin',
        specialCards: [{ instanceId: 'su-1', cardId: 'suicide', isUpgraded: true }],
      }),
    });
    const actions: TurnAction[] = [
      { type: 'draw' },
      { type: 'playCard', instanceId: 'su-1' },
    ];

    for (const seed of ['l29-04-no-elim-a', 'l29-04-no-elim-b', 'l29-04-no-elim-c']) {
      expect(decide(view, actions, createRng(seed))).toEqual({ type: 'draw' });
    }
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
          redirectedBy: null,
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
          redirectedBy: null,
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
          redirectedBy: null,
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
          redirectedBy: null,
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
          redirectedBy: null,
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
          redirectedBy: null,
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

  it('pickMirrorRedirect ignores upgraded hits when they are not eligible (base Mirror)', () => {
    const view = baseView({
      turnOrder: ['bot-a', 'bot-b', 'bot-c'],
      players: [
        player('bot-a', 'Alpha', true),
        player('bot-b', 'Bravo', false),
        player('bot-c', 'Charlie', false),
      ],
      pendingEffects: [
        {
          id: 'upgraded-super',
          sourcePlayerId: 'bot-b',
          targetPlayerId: 'bot-a',
          cardId: 'super-attack',
          isUpgraded: true,
          queuedAt: 0,
          damageMultiplier: 1,
          redirectedBy: null,
        },
        {
          id: 'base-basic',
          sourcePlayerId: 'bot-c',
          targetPlayerId: 'bot-a',
          cardId: 'basic-attack',
          isUpgraded: false,
          queuedAt: 1,
          damageMultiplier: 1,
          redirectedBy: null,
        },
      ],
    });
    const pick = pickMirrorRedirect(view, createRng('mirror-eligible'), [
      'base-basic',
    ]);
    expect(pick?.pendingEffectId).toBe('base-basic');
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

  it('ONMMBZ: sells Mirror to fund Spy instead of buying Tax at 0 points', () => {
    const view = baseView({
      self: baseSelf({
        lives: 10,
        points: 0,
        hand: [
          { instanceId: 'spy-1', cardId: 'spy', isUpgraded: true },
          { instanceId: 'mirror-1', cardId: 'mirror', isUpgraded: false },
          { instanceId: 'basic-1', cardId: 'basic-attack', isUpgraded: false },
        ],
      }),
    });
    const actions: TurnAction[] = [
      { type: 'buyCard', cardId: 'tax' },
      { type: 'sellCard', instanceId: 'mirror-1' },
      { type: 'draw' },
    ];
    expect(decide(view, actions, createRng('onmmbz-sell-spy'))).toEqual({
      type: 'sellCard',
      instanceId: 'mirror-1',
    });
  });

  it('ONMMBZ: refuses Spy on a seat that already resolved Spy as immune', () => {
    const view = baseView({
      self: baseSelf({
        lives: 10,
        points: 10,
        hand: [
          { instanceId: 'spy-1', cardId: 'spy', isUpgraded: false },
          { instanceId: 'tax-1', cardId: 'tax', isUpgraded: false },
        ],
      }),
      actionLog: [
        {
          kind: 'actionResolved',
          effectId: 'res-1',
          turnSequence: 2,
          sourcePlayerId: 'bot-a',
          targetPlayerId: 'bot-b',
          cardId: 'spy',
          isUpgraded: false,
          outcome: 'immune',
          livesLost: 0,
          shieldAbsorbed: 0,
        },
      ],
    });
    const actions: TurnAction[] = [
      { type: 'playCard', instanceId: 'spy-1', targetPlayerId: 'bot-b' },
      { type: 'playCard', instanceId: 'tax-1' },
      { type: 'draw' },
    ];
    expect(decide(view, actions, createRng('onmmbz-no-respy'))).toEqual({
      type: 'playCard',
      instanceId: 'tax-1',
    });
  });

  it('ONMMBZ: prefers Regeneration over draw when lives are soft-low', () => {
    const view = baseView({
      self: baseSelf({
        lives: 4,
        points: 12,
        hand: [{ instanceId: 'regen-1', cardId: 'regeneration', isUpgraded: false }],
      }),
    });
    const actions: TurnAction[] = [
      { type: 'draw' },
      { type: 'playCard', instanceId: 'regen-1', quantity: 4 },
    ];
    expect(decide(view, actions, createRng('onmmbz-regen'))).toEqual({
      type: 'playCard',
      instanceId: 'regen-1',
      quantity: 4,
    });
  });

  it('CBCPXV: attacks Imposition owner with Basic instead of Tax or Spy elsewhere', () => {
    const view = baseView({
      self: baseSelf({
        lives: 10,
        points: 10,
        hand: [
          { instanceId: 'basic-1', cardId: 'basic-attack', isUpgraded: false },
          { instanceId: 'spy-1', cardId: 'spy', isUpgraded: false },
          { instanceId: 'tax-1', cardId: 'tax', isUpgraded: false },
        ],
      }),
      players: [
        player('bot-a', 'Alpha', true),
        player('bot-b', 'Bravo', false, {
          activePersistentEffects: [
            { id: 'imp-1', cardId: 'imposition', isUpgraded: false, counter: 2 , targetPlayerId: null},
          ],
        }),
        player('bot-c', 'Charlie', false),
      ],
      turnOrder: ['bot-a', 'bot-b', 'bot-c'],
    });
    const actions: TurnAction[] = [
      { type: 'playCard', instanceId: 'basic-1', targetPlayerId: 'bot-b' },
      { type: 'playCard', instanceId: 'spy-1', targetPlayerId: 'bot-c' },
      { type: 'playCard', instanceId: 'tax-1' },
      { type: 'draw' },
    ];
    expect(decide(view, actions, createRng('cbcpxv-burn'))).toEqual({
      type: 'playCard',
      instanceId: 'basic-1',
      targetPlayerId: 'bot-b',
    });
  });

  it('CBCPXV: prefers Strong over Basic to clear Imposition in one hit', () => {
    const view = baseView({
      self: baseSelf({
        lives: 10,
        points: 10,
        hand: [
          { instanceId: 'basic-1', cardId: 'basic-attack', isUpgraded: false },
          { instanceId: 'strong-1', cardId: 'strong-attack', isUpgraded: false },
        ],
      }),
      players: [
        player('bot-a', 'Alpha', true),
        player('bot-b', 'Bravo', false, {
          activePersistentEffects: [
            { id: 'imp-1', cardId: 'imposition', isUpgraded: false, counter: 2 , targetPlayerId: null},
          ],
        }),
      ],
    });
    const actions: TurnAction[] = [
      { type: 'playCard', instanceId: 'basic-1', targetPlayerId: 'bot-b' },
      { type: 'playCard', instanceId: 'strong-1', targetPlayerId: 'bot-b' },
      { type: 'draw' },
    ];
    expect(decide(view, actions, createRng('cbcpxv-strong'))).toEqual({
      type: 'playCard',
      instanceId: 'strong-1',
      targetPlayerId: 'bot-b',
    });
  });

  it('CBCPXV: refuses selling attacks while an opponent Imposition is active', () => {
    const view = baseView({
      self: baseSelf({
        lives: 10,
        points: 0,
        hand: [
          { instanceId: 'spy-1', cardId: 'spy', isUpgraded: false },
          { instanceId: 'basic-1', cardId: 'basic-attack', isUpgraded: false },
          { instanceId: 'mirror-1', cardId: 'mirror', isUpgraded: false },
        ],
      }),
      players: [
        player('bot-a', 'Alpha', true),
        player('bot-b', 'Bravo', false, {
          activePersistentEffects: [
            { id: 'imp-1', cardId: 'imposition', isUpgraded: false, counter: 2 , targetPlayerId: null},
          ],
        }),
      ],
    });
    const actions: TurnAction[] = [
      { type: 'sellCard', instanceId: 'basic-1' },
      { type: 'sellCard', instanceId: 'mirror-1' },
      { type: 'playCard', instanceId: 'basic-1', targetPlayerId: 'bot-b' },
      { type: 'draw' },
    ];
    expect(decide(view, actions, createRng('cbcpxv-keep-atk'))).toEqual({
      type: 'playCard',
      instanceId: 'basic-1',
      targetPlayerId: 'bot-b',
    });
  });

  it('never picks base Sentence over draw (self-elim risk)', () => {
    const view = baseView({
      self: baseSelf({
        kitId: 'assassin',
        specialCards: [{ instanceId: 'sent-1', cardId: 'sentence', isUpgraded: false }],
      }),
    });
    const actions: TurnAction[] = [
      { type: 'draw' },
      { type: 'playCard', instanceId: 'sent-1' },
    ];

    for (const seed of ['sent-base-a', 'sent-base-b', 'sent-base-c', 'sent-base-d']) {
      expect(decide(view, actions, createRng(seed))).toEqual({ type: 'draw' });
    }
  });

  it('prefers upgraded Sentence over draw', () => {
    const view = baseView({
      self: baseSelf({
        kitId: 'assassin',
        specialCards: [{ instanceId: 'sent-1', cardId: 'sentence', isUpgraded: true }],
      }),
    });
    const actions: TurnAction[] = [
      { type: 'draw' },
      { type: 'playCard', instanceId: 'sent-1' },
    ];
    expect(decide(view, actions, createRng('sent-up'))).toEqual({
      type: 'playCard',
      instanceId: 'sent-1',
    });
  });

  it('prefers Imposition and Points Generator over draw', () => {
    const impositionView = baseView({
      self: baseSelf({
        kitId: 'untouchable',
        specialCards: [{ instanceId: 'imp-1', cardId: 'imposition', isUpgraded: false }],
      }),
    });
    expect(
      decide(
        impositionView,
        [{ type: 'draw' }, { type: 'playCard', instanceId: 'imp-1' }],
        createRng('imp-over-draw'),
      ),
    ).toEqual({ type: 'playCard', instanceId: 'imp-1' });

    const generatorView = baseView({
      self: baseSelf({
        kitId: 'assassin',
        specialCards: [{ instanceId: 'pg-1', cardId: 'points-generator', isUpgraded: false }],
      }),
    });
    expect(
      decide(
        generatorView,
        [{ type: 'draw' }, { type: 'playCard', instanceId: 'pg-1' }],
        createRng('pg-over-draw'),
      ),
    ).toEqual({ type: 'playCard', instanceId: 'pg-1' });
  });

  it('prefers Spy Thief over draw', () => {
    const view = baseView({
      self: baseSelf({
        kitId: 'untouchable',
        specialCards: [{ instanceId: 'st-1', cardId: 'spy-thief', isUpgraded: false }],
      }),
    });
    expect(
      decide(
        view,
        [{ type: 'draw' }, { type: 'playCard', instanceId: 'st-1' }],
        createRng('spy-thief-over-draw'),
      ),
    ).toEqual({ type: 'playCard', instanceId: 'st-1' });
  });

  it('refuses duplicate Imposition / Points Generator activation', () => {
    const view = baseView({
      self: baseSelf({
        kitId: 'untouchable',
        specialCards: [{ instanceId: 'imp-2', cardId: 'imposition', isUpgraded: false }],
        activePersistentEffects: [
          { id: 'imp-live', cardId: 'imposition', isUpgraded: false, counter: 2 , targetPlayerId: null},
        ],
      }),
    });
    expect(
      decide(
        view,
        [{ type: 'draw' }, { type: 'playCard', instanceId: 'imp-2' }],
        createRng('imp-dup'),
      ),
    ).toEqual({ type: 'draw' });
  });

  it('Absorber Deny only when target lost lives on their last complete turn', () => {
    const absorb: TurnAction = {
      type: 'playCard',
      instanceId: 'abs-1',
      targetPlayerId: 'bot-b',
    };
    const actions: TurnAction[] = [{ type: 'draw' }, absorb];

    // Stale hit from an older turn, then a clean complete turn with no life loss —
    // Absorber must not Deny (would gain 0 from the ledger).
    const staleThenClean = baseView({
      turnSequence: 10,
      currentTurnPlayerId: 'bot-a',
      self: baseSelf({
        points: 10,
        hand: [{ instanceId: 'abs-1', cardId: 'absorber', isUpgraded: false }],
      }),
      actionLog: [
        {
          kind: 'actionPlayed',
          actorPlayerId: 'bot-b',
          action: 'playCard',
          cardId: 'tax',
          turnSequence: 4,
        },
        {
          kind: 'actionResolved',
          effectId: 'old-hit',
          sourcePlayerId: 'bot-a',
          targetPlayerId: 'bot-b',
          cardId: 'super-attack',
          isUpgraded: false,
          livesLost: 7,
          shieldAbsorbed: 0,
          outcome: 'applied',
          turnSequence: 4,
        },
        {
          kind: 'actionPlayed',
          actorPlayerId: 'bot-b',
          action: 'draw',
          turnSequence: 8,
        },
      ],
    });
    expect(decide(staleThenClean, actions, createRng('abs-stale'))).toEqual({ type: 'draw' });

    // Fresh complete turn with a large applied loss — Deny Absorber.
    const freshLoss = baseView({
      turnSequence: 10,
      currentTurnPlayerId: 'bot-a',
      self: baseSelf({
        points: 10,
        hand: [{ instanceId: 'abs-1', cardId: 'absorber', isUpgraded: false }],
      }),
      actionLog: [
        {
          kind: 'actionPlayed',
          actorPlayerId: 'bot-b',
          action: 'draw',
          turnSequence: 8,
        },
        {
          kind: 'actionResolved',
          effectId: 'fresh-hit',
          sourcePlayerId: 'bot-a',
          targetPlayerId: 'bot-b',
          cardId: 'super-attack',
          isUpgraded: false,
          livesLost: 7,
          shieldAbsorbed: 0,
          outcome: 'applied',
          turnSequence: 8,
        },
      ],
    });
    expect(decide(freshLoss, actions, createRng('abs-fresh'))).toEqual(absorb);

    // Pending attack only (not yet resolved) — must not Absorber.
    const pendingOnly = baseView({
      turnSequence: 10,
      currentTurnPlayerId: 'bot-a',
      self: baseSelf({
        points: 10,
        hand: [{ instanceId: 'abs-1', cardId: 'absorber', isUpgraded: false }],
      }),
      pendingEffects: [
        {
          id: 'pend-1',
          sourcePlayerId: 'bot-a',
          targetPlayerId: 'bot-b',
          cardId: 'super-attack',
          isUpgraded: false,
          queuedAt: 1,
          damageMultiplier: 1,
          redirectedBy: null,
        },
      ],
      actionLog: [
        {
          kind: 'actionPlayed',
          actorPlayerId: 'bot-a',
          action: 'playCard',
          cardId: 'super-attack',
          targetPlayerId: 'bot-b',
          turnSequence: 9,
        },
        {
          kind: 'actionPlayed',
          actorPlayerId: 'bot-b',
          action: 'draw',
          turnSequence: 6,
        },
      ],
    });
    expect(decide(pendingOnly, actions, createRng('abs-pending'))).toEqual({ type: 'draw' });
  });

  it('L20-17: fallthrough playCard never beats draw across rng seeds', () => {
    const fallthroughCases: {
      label: string;
      view: PlayingStateView;
      play: TurnAction;
    }[] = [
      {
        label: 'non-Kamikaze Suicide',
        view: baseView({
          self: baseSelf({
            kitId: 'assassin',
            specialCards: [{ instanceId: 'su-1', cardId: 'suicide', isUpgraded: false }],
          }),
        }),
        play: { type: 'playCard', instanceId: 'su-1' },
      },
      {
        label: 'Cloning without Spy signal or incoming threat',
        view: baseView({
          self: baseSelf({
            kitId: 'scientific',
            points: 10,
            specialCards: [{ instanceId: 'clone-1', cardId: 'cloning', isUpgraded: false }],
          }),
        }),
        play: {
          type: 'playCard',
          instanceId: 'clone-1',
          targetPlayerId: 'bot-b',
        },
      },
      {
        label: 'Absorber without a last-turn loss signal',
        view: baseView({
          self: baseSelf({
            points: 10,
            hand: [{ instanceId: 'abs-1', cardId: 'absorber', isUpgraded: false }],
          }),
        }),
        play: { type: 'playCard', instanceId: 'abs-1', targetPlayerId: 'bot-b' },
      },
    ];

    for (const { label, view, play } of fallthroughCases) {
      const actions: TurnAction[] = [{ type: 'draw' }, play];

      for (let i = 0; i < 12; i += 1) {
        expect(decide(view, actions, createRng(`l20-17-fallthrough-${label}-${i}`)), label).toEqual({
          type: 'draw',
        });
      }
    }
  });

  it('L20-17: honours KitTraits.immuneTo from spied kitId, not hardcoded untouchable', () => {
    const scientific = shared.getKit('scientific');
    const originalGetKit = shared.getKit;
    const getKitSpy = vi.spyOn(shared, 'getKit').mockImplementation((kitId) => {
      if (kitId === 'scientific') {
        return {
          ...scientific,
          traits: {
            ...scientific.traits,
            immuneTo: ['spy', 'thief'],
          },
        };
      }

      return originalGetKit(kitId);
    });

    try {
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
              kitId: 'scientific',
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

      expect(decide(view, actions, createRng('l20-17-immune-trait'))).toEqual({
        type: 'playCard',
        instanceId: 'tax-1',
      });
    } finally {
      getKitSpy.mockRestore();
    }
  });

  it('stance: upgrades Tax before playing base Tax when life-safe', () => {
    const view = baseView({
      self: baseSelf({
        lives: 12,
        points: 20,
        upgradePoints: 1,
        hand: [{ instanceId: 'tax-1', cardId: 'tax', isUpgraded: false }],
      }),
    });
    const actions: TurnAction[] = [
      { type: 'playCard', instanceId: 'tax-1' },
      { type: 'upgradeCard', instanceId: 'tax-1' },
      { type: 'draw' },
    ];
    expect(decide(view, actions, createRng('upgrade-tax'))).toEqual({
      type: 'upgradeCard',
      instanceId: 'tax-1',
    });
  });

  it('stance: Absorber+ on last-turn UP spend beats draw but loses to Spy lethal', () => {
    const absorb: TurnAction = {
      type: 'playCard',
      instanceId: 'abs-1',
      targetPlayerId: 'bot-b',
    };
    const upSpendLog = [
      {
        kind: 'actionPlayed' as const,
        actorPlayerId: 'bot-b',
        action: 'upgradeCard' as const,
        cardId: 'tax' as const,
        turnSequence: 8,
      },
    ];

    const vsDraw = baseView({
      turnSequence: 10,
      self: baseSelf({
        points: 10,
        hand: [{ instanceId: 'abs-1', cardId: 'absorber', isUpgraded: true }],
      }),
      actionLog: upSpendLog,
    });
    expect(decide(vsDraw, [{ type: 'draw' }, absorb], createRng('abs-up-draw'))).toEqual(
      absorb,
    );

    const vsLethal = baseView({
      turnSequence: 10,
      self: baseSelf({
        points: 20,
        hand: [
          { instanceId: 'abs-1', cardId: 'absorber', isUpgraded: true },
          { instanceId: 'sa-1', cardId: 'super-attack', isUpgraded: false },
        ],
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
      actionLog: upSpendLog,
    });
    expect(
      decide(
        vsLethal,
        [
          absorb,
          { type: 'playCard', instanceId: 'sa-1', targetPlayerId: 'bot-b' },
          { type: 'draw' },
        ],
        createRng('abs-up-lethal'),
      ),
    ).toEqual({
      type: 'playCard',
      instanceId: 'sa-1',
      targetPlayerId: 'bot-b',
    });
  });

  it('stance: Absorber+ with small points spend and no UP stays below draw', () => {
    // Spy cost 4; absorber 3 + assassin draw 1 = 4 — spend must be > 4 to qualify.
    const view = baseView({
      turnSequence: 10,
      self: baseSelf({
        points: 10,
        hand: [{ instanceId: 'abs-1', cardId: 'absorber', isUpgraded: true }],
      }),
      actionLog: [
        {
          kind: 'actionPlayed',
          actorPlayerId: 'bot-b',
          action: 'playCard',
          cardId: 'spy',
          isUpgraded: false,
          targetPlayerId: 'bot-a',
          turnSequence: 8,
        },
      ],
    });
    expect(
      decide(
        view,
        [
          { type: 'draw' },
          { type: 'playCard', instanceId: 'abs-1', targetPlayerId: 'bot-b' },
        ],
        createRng('abs-small-pts'),
      ),
    ).toEqual({ type: 'draw' });
  });

  it('stance: finish prefers chip attack on Spy-known low lives over Tax+', () => {
    const view = baseView({
      self: baseSelf({
        lives: 12,
        points: 10,
        hand: [
          { instanceId: 'tax-1', cardId: 'tax', isUpgraded: true },
          { instanceId: 'basic-1', cardId: 'basic-attack', isUpgraded: false },
        ],
      }),
      players: [
        player('bot-a', 'Alpha', true),
        player('bot-b', 'Bravo', false, {
          spied: {
            kitId: 'scientific',
            hand: [],
            specialCards: [],
            lives: 1,
            points: 0,
            upgradePoints: 0,
            shield: 0,
          },
        }),
      ],
    });
    expect(
      decide(
        view,
        [
          { type: 'playCard', instanceId: 'tax-1' },
          { type: 'playCard', instanceId: 'basic-1', targetPlayerId: 'bot-b' },
          { type: 'draw' },
        ],
        createRng('finish-chip'),
      ),
    ).toEqual({
      type: 'playCard',
      instanceId: 'basic-1',
      targetPlayerId: 'bot-b',
    });
  });

  it('stance: contest does not sell Mirror when opponent upgraded Super publicly', () => {
    const view = baseView({
      self: baseSelf({
        lives: 12,
        points: 5,
        hand: [
          { instanceId: 'tax-1', cardId: 'tax', isUpgraded: true },
          { instanceId: 'regen-1', cardId: 'regeneration', isUpgraded: true },
          { instanceId: 'mirror-1', cardId: 'mirror', isUpgraded: false },
          { instanceId: 'sa-1', cardId: 'super-attack', isUpgraded: true },
        ],
      }),
      actionLog: [
        {
          kind: 'actionPlayed',
          actorPlayerId: 'bot-b',
          action: 'upgradeCard',
          cardId: 'super-attack',
          turnSequence: 2,
        },
      ],
    });
    const pick = decide(
      view,
      [
        { type: 'sellCard', instanceId: 'mirror-1' },
        { type: 'draw' },
        { type: 'playCard', instanceId: 'tax-1' },
      ],
      createRng('contest-keep-mirror'),
    );
    expect(pick).not.toEqual({ type: 'sellCard', instanceId: 'mirror-1' });
  });

  it('L29-02: draw score scales with kit draw — Wizard beats Untouchable at equal state', () => {
    const untouchableView = baseView({ self: baseSelf({ kitId: 'untouchable' }) });
    const wizardView = baseView({ self: baseSelf({ kitId: 'wizard' }) });
    const actions: TurnAction[] = [{ type: 'draw' }];

    const untouchableScored = scoreActions(
      untouchableView,
      actions,
      createRng('draw-untouchable'),
    );
    const wizardScored = scoreActions(wizardView, actions, createRng('draw-wizard'));

    expect(untouchableScored[0]?.score).toBe(100);
    expect(wizardScored[0]?.score).toBe(120);
  });

  it('L29-02: draw score reads getKit live, not a hardcoded draw value', () => {
    const untouchable = shared.getKit('untouchable');
    const originalGetKit = shared.getKit;
    const getKitSpy = vi.spyOn(shared, 'getKit').mockImplementation((kitId) => {
      if (kitId === 'untouchable') {
        return {
          ...untouchable,
          startingResources: { ...untouchable.startingResources, draw: 4 },
        };
      }

      return originalGetKit(kitId);
    });

    try {
      const view = baseView({ self: baseSelf({ kitId: 'untouchable' }) });
      const scored = scoreActions(view, [{ type: 'draw' }], createRng('draw-mocked'));
      expect(scored[0]?.score).toBe(100 + 20 * 3);
    } finally {
      getKitSpy.mockRestore();
    }
  });

  it('L29-02: fallthrough play never beats draw, even for a high-draw kit', () => {
    const view = baseView({
      self: baseSelf({
        kitId: 'wizard',
        specialCards: [{ instanceId: 'su-1', cardId: 'suicide', isUpgraded: false }],
      }),
    });
    const actions: TurnAction[] = [
      { type: 'draw' },
      { type: 'playCard', instanceId: 'su-1' },
    ];
    expect(decide(view, actions, createRng('draw-vs-fallthrough'))).toEqual({ type: 'draw' });
  });

  it('L29-03: Regen soft-invest threshold scales with kit starting lives', () => {
    const regenPlay: TurnAction = { type: 'playCard', instanceId: 'regen-1', quantity: 4 };

    // Indestructible (18 lives) scaled soft threshold is 11 — 10 lives qualifies as soft-low.
    const indestructibleView = baseView({
      self: baseSelf({
        kitId: 'indestructible',
        lives: 10,
        points: 20,
        hand: [{ instanceId: 'regen-1', cardId: 'regeneration', isUpgraded: false }],
      }),
    });
    const [indestructibleScore] = scoreActions(
      indestructibleView,
      [regenPlay],
      createRng('l29-03-indestructible'),
    );
    expect(indestructibleScore?.code).toBe('invest');

    // Assassin (10 lives) scaled soft threshold is 6 — 10 lives is not soft-low.
    const assassinView = baseView({
      self: baseSelf({
        kitId: 'assassin',
        lives: 10,
        points: 20,
        hand: [{ instanceId: 'regen-1', cardId: 'regeneration', isUpgraded: false }],
      }),
    });
    const [assassinScore] = scoreActions(assassinView, [regenPlay], createRng('l29-03-assassin'));
    expect(assassinScore?.code).toBe('sustain');
  });

  it('L29-03: Tax life buffer scales down for a low-life kit (Duplicator)', () => {
    const taxPlay: TurnAction = { type: 'playCard', instanceId: 'tax-1' };
    const actions: TurnAction[] = [{ type: 'draw' }, taxPlay];

    // Duplicator (2 lives) scaled Tax buffer is 1 — safe to Tax at 3 lives.
    const duplicatorView = baseView({
      self: baseSelf({
        kitId: 'duplicator',
        lives: 3,
        hand: [{ instanceId: 'tax-1', cardId: 'tax', isUpgraded: false }],
      }),
    });
    expect(decide(duplicatorView, actions, createRng('l29-03-duplicator-tax'))).toEqual(taxPlay);

    // Assassin (10 lives) scaled Tax buffer is 5 (capped) — 3 lives refuses Tax.
    const assassinView = baseView({
      self: baseSelf({
        kitId: 'assassin',
        lives: 3,
        hand: [{ instanceId: 'tax-1', cardId: 'tax', isUpgraded: false }],
      }),
    });
    expect(decide(assassinView, actions, createRng('l29-03-assassin-tax'))).toEqual({
      type: 'draw',
    });
  });
});

describe('L29-05: economy / theft specials', () => {
  it('Super Regeneration: Survive under threat, Invest at low life, refuses at full health', () => {
    const actions: TurnAction[] = [
      { type: 'draw' },
      { type: 'playCard', instanceId: 'sr-1' },
    ];

    const underThreatView = baseView({
      self: baseSelf({
        specialCards: [{ instanceId: 'sr-1', cardId: 'super-regeneration', isUpgraded: false }],
      }),
      pendingEffects: [
        {
          id: 'inc-1',
          sourcePlayerId: 'bot-b',
          targetPlayerId: 'bot-a',
          cardId: 'basic-attack',
          isUpgraded: false,
          queuedAt: 1,
          damageMultiplier: 1,
          redirectedBy: null,
        },
      ],
    });
    expect(decide(underThreatView, actions, createRng('sr-survive'))).toEqual({
      type: 'playCard',
      instanceId: 'sr-1',
    });

    const lowLifeView = baseView({
      self: baseSelf({
        kitId: 'assassin',
        lives: 3,
        specialCards: [{ instanceId: 'sr-1', cardId: 'super-regeneration', isUpgraded: false }],
      }),
    });
    expect(decide(lowLifeView, actions, createRng('sr-invest'))).toEqual({
      type: 'playCard',
      instanceId: 'sr-1',
    });

    const fullHealthView = baseView({
      self: baseSelf({
        kitId: 'assassin',
        lives: 10,
        specialCards: [{ instanceId: 'sr-1', cardId: 'super-regeneration', isUpgraded: false }],
      }),
    });
    expect(decide(fullHealthView, actions, createRng('sr-refuse'))).toEqual({ type: 'draw' });
  });

  it('Upgrade Point Thief always beats draw with a living opponent', () => {
    const view = baseView({
      self: baseSelf({
        specialCards: [
          { instanceId: 'upt-1', cardId: 'upgrade-point-thief', isUpgraded: false },
        ],
      }),
    });
    expect(
      decide(
        view,
        [{ type: 'draw' }, { type: 'playCard', instanceId: 'upt-1' }],
        createRng('upt-over-draw'),
      ),
    ).toEqual({ type: 'playCard', instanceId: 'upt-1' });
  });

  it('Card Thief base: prefers a spied, card-holding target over draw; refuses without a target', () => {
    const view = baseView({
      self: baseSelf({
        specialCards: [{ instanceId: 'ct-1', cardId: 'card-thief', isUpgraded: false }],
      }),
      players: [
        player('bot-a', 'Alpha', true),
        player('bot-b', 'Bravo', false, {
          spied: {
            kitId: 'scientific',
            hand: [{ instanceId: 'h-1', cardId: 'basic-attack', isUpgraded: false }],
            specialCards: [],
          },
        }),
      ],
    });
    expect(
      decide(
        view,
        [
          { type: 'draw' },
          { type: 'playCard', instanceId: 'ct-1', targetPlayerId: 'bot-b' },
        ],
        createRng('ct-target'),
      ),
    ).toEqual({ type: 'playCard', instanceId: 'ct-1', targetPlayerId: 'bot-b' });

    expect(
      decide(
        view,
        [{ type: 'draw' }, { type: 'playCard', instanceId: 'ct-1' }],
        createRng('ct-no-target'),
      ),
    ).toEqual({ type: 'draw' });
  });

  it('Card Thief upgraded always beats draw with a living opponent', () => {
    const view = baseView({
      self: baseSelf({
        specialCards: [{ instanceId: 'ct-1', cardId: 'card-thief', isUpgraded: true }],
      }),
    });
    expect(
      decide(
        view,
        [{ type: 'draw' }, { type: 'playCard', instanceId: 'ct-1' }],
        createRng('ct-up-over-draw'),
      ),
    ).toEqual({ type: 'playCard', instanceId: 'ct-1' });
  });
});

describe('L29-06: persistent specials', () => {
  it('Poison beats draw with a living opponent; refuses a second activation', () => {
    const view = baseView({
      self: baseSelf({
        specialCards: [{ instanceId: 'poi-1', cardId: 'poison', isUpgraded: false }],
      }),
    });
    expect(
      decide(
        view,
        [{ type: 'draw' }, { type: 'playCard', instanceId: 'poi-1' }],
        createRng('poison-over-draw'),
      ),
    ).toEqual({ type: 'playCard', instanceId: 'poi-1' });

    const alreadyActiveView = baseView({
      self: baseSelf({
        specialCards: [{ instanceId: 'poi-2', cardId: 'poison', isUpgraded: false }],
        activePersistentEffects: [
          { id: 'poi-live', cardId: 'poison', isUpgraded: false, counter: 3, targetPlayerId: null },
        ],
      }),
    });
    expect(
      decide(
        alreadyActiveView,
        [{ type: 'draw' }, { type: 'playCard', instanceId: 'poi-2' }],
        createRng('poison-dup'),
      ),
    ).toEqual({ type: 'draw' });
  });

  it('Curse prefers a top-spending target over draw; refuses without a target', () => {
    const view = baseView({
      self: baseSelf({
        specialCards: [{ instanceId: 'cur-1', cardId: 'curse', isUpgraded: false }],
      }),
    });
    expect(
      decide(
        view,
        [
          { type: 'draw' },
          { type: 'playCard', instanceId: 'cur-1', targetPlayerId: 'bot-b' },
        ],
        createRng('curse-target'),
      ),
    ).toEqual({ type: 'playCard', instanceId: 'cur-1', targetPlayerId: 'bot-b' });

    expect(
      decide(
        view,
        [{ type: 'draw' }, { type: 'playCard', instanceId: 'cur-1' }],
        createRng('curse-no-target'),
      ),
    ).toEqual({ type: 'draw' });
  });

  it('Curse still plays on an already-cursed target (stacking legal)', () => {
    const view = baseView({
      self: baseSelf({
        specialCards: [{ instanceId: 'cur-2', cardId: 'curse', isUpgraded: false }],
      }),
      players: [
        player('bot-a', 'Alpha', true),
        player('bot-b', 'Bravo', false, {
          activePersistentEffects: [
            {
              id: 'cur-live',
              cardId: 'curse',
              isUpgraded: false,
              counter: null,
              targetPlayerId: null,
            },
          ],
        }),
      ],
    });
    // Stacking is legal (L32-01); soft stack penalty must not deny below draw.
    expect(
      decide(
        view,
        [
          { type: 'draw' },
          { type: 'playCard', instanceId: 'cur-2', targetPlayerId: 'bot-b' },
        ],
        createRng('curse-stack'),
      ),
    ).toEqual({ type: 'playCard', instanceId: 'cur-2', targetPlayerId: 'bot-b' });
  });

  it('Super Absorber beats draw with a living opponent; refuses a second activation', () => {
    const view = baseView({
      self: baseSelf({
        specialCards: [{ instanceId: 'sab-1', cardId: 'super-absorber', isUpgraded: false }],
      }),
    });
    expect(
      decide(
        view,
        [{ type: 'draw' }, { type: 'playCard', instanceId: 'sab-1' }],
        createRng('sab-over-draw'),
      ),
    ).toEqual({ type: 'playCard', instanceId: 'sab-1' });

    const alreadyActiveView = baseView({
      self: baseSelf({
        specialCards: [{ instanceId: 'sab-2', cardId: 'super-absorber', isUpgraded: false }],
        activePersistentEffects: [
          {
            id: 'sab-live',
            cardId: 'super-absorber',
            isUpgraded: false,
            counter: 2,
            targetPlayerId: null,
          },
        ],
      }),
    });
    expect(
      decide(
        alreadyActiveView,
        [{ type: 'draw' }, { type: 'playCard', instanceId: 'sab-2' }],
        createRng('sab-dup'),
      ),
    ).toEqual({ type: 'draw' });
  });

  it('still refuses base Sentence and prefers upgraded Sentence after the retune (L29-06)', () => {
    const baseSentenceView = baseView({
      self: baseSelf({
        specialCards: [{ instanceId: 'sent-1', cardId: 'sentence', isUpgraded: false }],
      }),
    });
    for (const seed of ['sent-retune-a', 'sent-retune-b', 'sent-retune-c']) {
      expect(
        decide(
          baseSentenceView,
          [{ type: 'draw' }, { type: 'playCard', instanceId: 'sent-1' }],
          createRng(seed),
        ),
      ).toEqual({ type: 'draw' });
    }

    const upgradedSentenceView = baseView({
      self: baseSelf({
        specialCards: [{ instanceId: 'sent-1', cardId: 'sentence', isUpgraded: true }],
      }),
    });
    expect(
      decide(
        upgradedSentenceView,
        [{ type: 'draw' }, { type: 'playCard', instanceId: 'sent-1' }],
        createRng('sent-retune-up'),
      ),
    ).toEqual({ type: 'playCard', instanceId: 'sent-1' });
  });
});

describe('L29-07: attack / redirection specials', () => {
  it('MEGA ATTACK beats draw with a living opponent', () => {
    const view = baseView({
      self: baseSelf({
        specialCards: [{ instanceId: 'mega-1', cardId: 'mega-attack', isUpgraded: false }],
      }),
    });
    expect(
      decide(
        view,
        [{ type: 'draw' }, { type: 'playCard', instanceId: 'mega-1' }],
        createRng('mega-over-draw'),
      ),
    ).toEqual({ type: 'playCard', instanceId: 'mega-1' });
  });

  it('MEGA ATTACK is lethal-now when any Spy-known opponent has 20 lives or fewer', () => {
    const view = baseView({
      self: baseSelf({
        specialCards: [{ instanceId: 'mega-1', cardId: 'mega-attack', isUpgraded: false }],
      }),
      players: [
        player('bot-a', 'Alpha', true),
        player('bot-b', 'Bravo', false, {
          spied: {
            kitId: 'indestructible',
            hand: [],
            specialCards: [],
            lives: 18,
            points: 0,
            upgradePoints: 0,
            shield: 0,
          },
        }),
      ],
    });
    expect(
      decide(
        view,
        [{ type: 'draw' }, { type: 'playCard', instanceId: 'mega-1' }],
        createRng('mega-lethal'),
      ),
    ).toEqual({ type: 'playCard', instanceId: 'mega-1' });
  });

  it('Super Mirror: Survive only when an attack is actually pending on self', () => {
    const noThreatView = baseView({
      self: baseSelf({
        specialCards: [{ instanceId: 'sm-1', cardId: 'super-mirror', isUpgraded: false }],
      }),
    });
    expect(
      decide(
        noThreatView,
        [{ type: 'draw' }, { type: 'playCard', instanceId: 'sm-1' }],
        createRng('sm-no-threat'),
      ),
    ).toEqual({ type: 'draw' });

    const underAttackView = baseView({
      self: baseSelf({
        specialCards: [{ instanceId: 'sm-1', cardId: 'super-mirror', isUpgraded: false }],
      }),
      pendingEffects: [
        {
          id: 'inc-1',
          sourcePlayerId: 'bot-b',
          targetPlayerId: 'bot-a',
          cardId: 'basic-attack',
          isUpgraded: false,
          queuedAt: 1,
          damageMultiplier: 1,
          redirectedBy: null,
        },
      ],
    });
    expect(
      decide(
        underAttackView,
        [{ type: 'draw' }, { type: 'playCard', instanceId: 'sm-1' }],
        createRng('sm-under-attack'),
      ),
    ).toEqual({ type: 'playCard', instanceId: 'sm-1' });
  });

  it('Attack Thief beats draw with a living opponent even with no threat', () => {
    const view = baseView({
      self: baseSelf({
        specialCards: [{ instanceId: 'at-1', cardId: 'attack-thief', isUpgraded: false }],
      }),
    });
    expect(
      decide(
        view,
        [{ type: 'draw' }, { type: 'playCard', instanceId: 'at-1' }],
        createRng('at-over-draw'),
      ),
    ).toEqual({ type: 'playCard', instanceId: 'at-1' });
  });

  it('Mirror eligibility (mirror-choice.ts parity): base Mirror never scores Survive against only an upgraded MEGA', () => {
    const view = baseView({
      self: baseSelf({
        hand: [{ instanceId: 'mir-1', cardId: 'mirror', isUpgraded: false }],
      }),
      pendingEffects: [
        {
          id: 'mega-up',
          sourcePlayerId: 'bot-b',
          targetPlayerId: 'bot-a',
          cardId: 'mega-attack',
          isUpgraded: true,
          queuedAt: 1,
          damageMultiplier: 1,
          redirectedBy: null,
        },
      ],
    });
    const mirrorPlay: TurnAction = { type: 'playCard', instanceId: 'mir-1' };
    const scored = scoreActions(view, [{ type: 'draw' }, mirrorPlay], createRng('mirror-vs-mega-base'));
    const mirrorScore = scored.find(
      (entry) => entry.action.type === 'playCard' && entry.action.instanceId === 'mir-1',
    );
    expect(mirrorScore?.code).not.toBe('survive');
    expect(mirrorScore?.score).toBeLessThan(HEURISTIC_BAND_WEIGHTS.survive);
  });

  it('Mirror eligibility: upgraded Mirror scores Survive against a base MEGA', () => {
    const view = baseView({
      self: baseSelf({
        hand: [{ instanceId: 'mir-1', cardId: 'mirror', isUpgraded: true }],
      }),
      pendingEffects: [
        {
          id: 'mega-base',
          sourcePlayerId: 'bot-b',
          targetPlayerId: 'bot-a',
          cardId: 'mega-attack',
          isUpgraded: false,
          queuedAt: 1,
          damageMultiplier: 1,
          redirectedBy: null,
        },
      ],
    });
    const mirrorPlay: TurnAction = { type: 'playCard', instanceId: 'mir-1' };
    const scored = scoreActions(view, [{ type: 'draw' }, mirrorPlay], createRng('mirror-vs-mega-up'));
    const mirrorScore = scored.find(
      (entry) => entry.action.type === 'playCard' && entry.action.instanceId === 'mir-1',
    );
    expect(mirrorScore?.code).toBe('survive');
    expect(
      decide(view, [{ type: 'draw' }, mirrorPlay], createRng('mirror-vs-mega-up-decide')),
    ).toEqual(mirrorPlay);
  });
});

describe('L29-08: turn-flow, pool and reversal specials', () => {
  it('Block beats draw both under threat (Survive) and off-threat (Invest)', () => {
    const view = baseView({
      self: baseSelf({
        specialCards: [{ instanceId: 'blk-1', cardId: 'block', isUpgraded: false }],
      }),
    });
    const actions: TurnAction[] = [{ type: 'draw' }, { type: 'playCard', instanceId: 'blk-1' }];
    expect(decide(view, actions, createRng('block-invest'))).toEqual({
      type: 'playCard',
      instanceId: 'blk-1',
    });

    const underThreatView = baseView({
      self: baseSelf({
        specialCards: [{ instanceId: 'blk-1', cardId: 'block', isUpgraded: false }],
      }),
      pendingEffects: [
        {
          id: 'inc-1',
          sourcePlayerId: 'bot-b',
          targetPlayerId: 'bot-a',
          cardId: 'basic-attack',
          isUpgraded: false,
          queuedAt: 1,
          damageMultiplier: 1,
          redirectedBy: null,
        },
      ],
    });
    const scored = scoreActions(underThreatView, actions, createRng('block-survive'));
    const blockScore = scored.find(
      (entry) => entry.action.type === 'playCard' && entry.action.instanceId === 'blk-1',
    );
    expect(blockScore?.code).toBe('survive');
  });

  it('Invisibility beats draw; refuses a second activation', () => {
    const view = baseView({
      self: baseSelf({
        specialCards: [{ instanceId: 'inv-1', cardId: 'invisibility', isUpgraded: false }],
      }),
    });
    expect(
      decide(
        view,
        [{ type: 'draw' }, { type: 'playCard', instanceId: 'inv-1' }],
        createRng('invis-over-draw'),
      ),
    ).toEqual({ type: 'playCard', instanceId: 'inv-1' });

    const alreadyActiveView = baseView({
      self: baseSelf({
        specialCards: [{ instanceId: 'inv-2', cardId: 'invisibility', isUpgraded: false }],
        activePersistentEffects: [
          {
            id: 'inv-live',
            cardId: 'invisibility',
            isUpgraded: false,
            counter: null,
            targetPlayerId: null,
          },
        ],
      }),
    });
    expect(
      decide(
        alreadyActiveView,
        [{ type: 'draw' }, { type: 'playCard', instanceId: 'inv-2' }],
        createRng('invis-dup'),
      ),
    ).toEqual({ type: 'draw' });
  });

  it('Card Absorber beats draw with cards in the pool; refuses on an empty pool', () => {
    const view = baseView({
      self: baseSelf({
        specialCards: [{ instanceId: 'cab-1', cardId: 'card-absorber', isUpgraded: false }],
      }),
      pool: [{ instanceId: 'pool-1', cardId: 'basic-attack', isUpgraded: false }],
    });
    expect(
      decide(
        view,
        [{ type: 'draw' }, { type: 'playCard', instanceId: 'cab-1' }],
        createRng('cab-over-draw'),
      ),
    ).toEqual({ type: 'playCard', instanceId: 'cab-1' });

    const emptyPoolView = baseView({
      self: baseSelf({
        specialCards: [{ instanceId: 'cab-1', cardId: 'card-absorber', isUpgraded: false }],
      }),
      pool: [],
    });
    expect(
      decide(
        emptyPoolView,
        [{ type: 'draw' }, { type: 'playCard', instanceId: 'cab-1' }],
        createRng('cab-empty'),
      ),
    ).toEqual({ type: 'draw' });
  });

  it('Card Transformer beats draw when consuming an owned shared card', () => {
    const view = baseView({
      self: baseSelf({
        hand: [{ instanceId: 'basic-1', cardId: 'basic-attack', isUpgraded: false }],
        specialCards: [{ instanceId: 'ctr-1', cardId: 'card-transformer', isUpgraded: false }],
      }),
    });
    expect(
      decide(
        view,
        [
          { type: 'draw' },
          {
            type: 'playCard',
            instanceId: 'ctr-1',
            consumeInstanceId: 'basic-1',
          },
        ],
        createRng('ctr-over-draw'),
      ),
    ).toEqual({
      type: 'playCard',
      instanceId: 'ctr-1',
      consumeInstanceId: 'basic-1',
    });
  });

  it('Reanimation always beats draw when armable', () => {
    const view = baseView({
      self: baseSelf({
        specialCards: [{ instanceId: 'rea-1', cardId: 'reanimation', isUpgraded: false }],
      }),
    });
    expect(
      decide(
        view,
        [{ type: 'draw' }, { type: 'playCard', instanceId: 'rea-1' }],
        createRng('rea-over-draw'),
      ),
    ).toEqual({ type: 'playCard', instanceId: 'rea-1' });
  });

  it('deactivatePersistent and activateDuplication never fall back to sellUpgradePoint', () => {
    const deactivateActions: TurnAction[] = [
      { type: 'draw' },
      { type: 'sellUpgradePoint' },
      { type: 'deactivatePersistent', effectId: 'inv-live' },
    ];
    const deactivateView = baseView({
      self: baseSelf({
        activePersistentEffects: [
          {
            id: 'inv-live',
            cardId: 'invisibility',
            isUpgraded: false,
            counter: null,
            targetPlayerId: null,
          },
        ],
        hand: [{ instanceId: 'basic-1', cardId: 'basic-attack', isUpgraded: false }],
      }),
    });
    expect(decide(deactivateView, deactivateActions, createRng('deact-not-sell'))).not.toEqual({
      type: 'sellUpgradePoint',
    });

    const activateActions: TurnAction[] = [
      { type: 'draw' },
      { type: 'sellUpgradePoint' },
      { type: 'activateDuplication' },
    ];
    const activateView = baseView({
      self: baseSelf({ kitId: 'duplicator' }),
      players: [
        player('bot-a', 'Alpha', true, { duplicationActive: false }),
        player('bot-b', 'Bravo', false),
      ],
    });
    expect(decide(activateView, activateActions, createRng('act-not-sell'))).not.toEqual({
      type: 'sellUpgradePoint',
    });
  });

  it('Upgrader buyUpgradePoint uses cost 5 for point-reserve (not global 10)', () => {
    // Contest + Mirror reserve (6). Points 11: after Upgrader buy (5) → 6 OK;
    // after global 10 → 1 below reserve → -Infinity.
    const pending = [
      {
        id: 'atk-in',
        sourcePlayerId: 'bot-b',
        targetPlayerId: 'bot-a',
        cardId: 'strong-attack' as const,
        isUpgraded: true,
        queuedAt: 1,
        damageMultiplier: 1,
        redirectedBy: null,
      },
    ];
    const hand = [{ instanceId: 'mir-1', cardId: 'mirror' as const, isUpgraded: true }];
    const actions: TurnAction[] = [{ type: 'buyUpgradePoint' }, { type: 'draw' }];

    const upgraderView = baseView({
      self: baseSelf({ kitId: 'upgrader', points: 11, hand }),
      pendingEffects: pending,
    });
    const [upgraderBuy] = scoreActions(upgraderView, actions, createRng('up-buy-5'));
    expect(upgraderBuy?.action).toEqual({ type: 'buyUpgradePoint' });
    expect(upgraderBuy?.score).toBeGreaterThan(Number.NEGATIVE_INFINITY);

    const plainView = baseView({
      self: baseSelf({ kitId: 'untouchable', points: 11, hand }),
      pendingEffects: pending,
    });
    const [plainBuy] = scoreActions(plainView, actions, createRng('plain-buy-10'));
    expect(plainBuy?.action).toEqual({ type: 'buyUpgradePoint' });
    expect(plainBuy?.score).toBe(Number.NEGATIVE_INFINITY);
  });
});
