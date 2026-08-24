/**
 * Engage overlay rules — backlog L40-02 (HWZMWI-shaped, public view only).
 */

import { describe, expect, it } from 'vitest';

import type {
  PlayingStateView,
  PrivateSelfView,
  PublicConnectionView,
  PublicPlayerView,
} from '@card-battle/shared';

import { createRng } from '../../engine/rng';
import type { TurnAction } from '../../engine/turn/perform-action';
import { scoreEngageActions } from './score-actions';
import { decideEngage } from '../policies/heuristic-v5-engage';

const CONNECTED: PublicConnectionView = {
  status: 'connected',
  disconnectedAt: null,
  automaticTurnsTaken: 0,
  consecutiveTimeouts: 0,
};

function baseSelf(overrides: Partial<PrivateSelfView> = {}): PrivateSelfView {
  return {
    lives: 12,
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
    turnSequence: 8,
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

function scoreOf(
  scored: readonly { action: TurnAction; score: number }[],
  match: (action: TurnAction) => boolean,
): number {
  const entry = scored.find((item) => match(item.action));

  if (entry === undefined) {
    throw new Error('missing scored action');
  }

  return entry.score;
}

describe('heuristic-v5-engage overlay (L40-02)', () => {
  it('unused upgrade points: buyUpgradePoint loses to a real play', () => {
    const view = baseView({
      self: baseSelf({
        upgradePoints: 2,
        hand: [{ instanceId: 'tax-1', cardId: 'tax', isUpgraded: false }],
      }),
    });
    const actions: TurnAction[] = [
      { type: 'buyUpgradePoint' },
      { type: 'playCard', instanceId: 'tax-1' },
      { type: 'draw' },
    ];
    const scored = scoreEngageActions(view, actions, createRng('l40-02-up'));

    expect(
      scoreOf(scored, (action) => action.type === 'playCard'),
    ).toBeGreaterThan(scoreOf(scored, (action) => action.type === 'buyUpgradePoint'));
    expect(decideEngage(view, actions, createRng('l40-02-up')).action).toEqual({
      type: 'playCard',
      instanceId: 'tax-1',
    });
  });

  it('does not sell the last real attack to fund shop', () => {
    const view = baseView({
      self: baseSelf({
        points: 2,
        hand: [{ instanceId: 'super-1', cardId: 'super-attack', isUpgraded: false }],
      }),
    });
    const actions: TurnAction[] = [
      { type: 'sellCard', instanceId: 'super-1' },
      { type: 'draw' },
      { type: 'buyCard', cardId: 'tax' },
    ];
    const scored = scoreEngageActions(view, actions, createRng('l40-02-last-atk'));

    expect(scoreOf(scored, (action) => action.type === 'sellCard')).toBe(
      Number.NEGATIVE_INFINITY,
    );
    expect(decideEngage(view, actions, createRng('l40-02-last-atk')).action).not.toEqual({
      type: 'sellCard',
      instanceId: 'super-1',
    });
  });

  it('buy-Basic-to-sell loses to playing or drawing', () => {
    const view = baseView({
      self: baseSelf({
        lives: 15,
        points: 20,
        hand: [{ instanceId: 'tax-1', cardId: 'tax', isUpgraded: false }],
      }),
    });
    const actions: TurnAction[] = [
      { type: 'buyCard', cardId: 'basic-attack' },
      { type: 'playCard', instanceId: 'tax-1' },
      { type: 'draw' },
    ];
    const scored = scoreEngageActions(view, actions, createRng('l40-02-buy-basic'));
    const buy = scoreOf(
      scored,
      (action) => action.type === 'buyCard' && action.cardId === 'basic-attack',
    );
    const play = scoreOf(scored, (action) => action.type === 'playCard');
    const draw = scoreOf(scored, (action) => action.type === 'draw');

    expect(buy).toBeLessThan(play);
    expect(buy).toBeLessThan(draw);
  });

  it('any attack on a finishable weaker seat outranks Tax/shop', () => {
    const view = baseView({
      self: baseSelf({
        lives: 12,
        points: 20,
        hand: [
          { instanceId: 'basic-1', cardId: 'basic-attack', isUpgraded: false },
          { instanceId: 'tax-1', cardId: 'tax', isUpgraded: false },
        ],
      }),
      players: [
        player('bot-a', 'Alpha', true),
        player('bot-b', 'Bravo', false, {
          spied: {
            kitId: 'kamikaze',
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
    const actions: TurnAction[] = [
      { type: 'playCard', instanceId: 'basic-1', targetPlayerId: 'bot-b' },
      { type: 'playCard', instanceId: 'tax-1' },
      { type: 'buyUpgradePoint' },
      { type: 'draw' },
    ];
    const scored = scoreEngageActions(view, actions, createRng('l40-02-finish'));
    const attack = scoreOf(
      scored,
      (action) =>
        action.type === 'playCard' &&
        action.instanceId === 'basic-1' &&
        action.targetPlayerId === 'bot-b',
    );
    const tax = scoreOf(
      scored,
      (action) => action.type === 'playCard' && action.instanceId === 'tax-1',
    );
    const shop = scoreOf(scored, (action) => action.type === 'buyUpgradePoint');

    expect(attack).toBeGreaterThan(tax);
    expect(attack).toBeGreaterThan(shop);
    expect(decideEngage(view, actions, createRng('l40-02-finish')).action).toEqual({
      type: 'playCard',
      instanceId: 'basic-1',
      targetPlayerId: 'bot-b',
    });
  });

  it('incoming attack at you: hitting that seat outranks a healthy bystander', () => {
    const view = baseView({
      turnOrder: ['bot-a', 'bot-b', 'bot-c', 'bot-d'],
      self: baseSelf({
        lives: 12,
        points: 20,
        hand: [{ instanceId: 'basic-1', cardId: 'basic-attack', isUpgraded: false }],
      }),
      players: [
        player('bot-a', 'Alpha', true),
        player('bot-b', 'Bravo', false, {
          spied: {
            kitId: 'kamikaze',
            hand: [{ instanceId: 'x', cardId: 'super-attack', isUpgraded: true }],
            specialCards: [],
            lives: 15,
            points: 10,
            upgradePoints: 0,
            shield: 0,
          },
        }),
        player('bot-c', 'Charlie', false, {
          spied: {
            kitId: 'assassin',
            hand: [{ instanceId: 'y', cardId: 'super-attack', isUpgraded: true }],
            specialCards: [],
            lives: 15,
            points: 10,
            upgradePoints: 0,
            shield: 0,
          },
        }),
        player('bot-d', 'Delta', false, {
          spied: {
            kitId: 'wizard',
            hand: [{ instanceId: 'z', cardId: 'super-attack', isUpgraded: true }],
            specialCards: [],
            lives: 15,
            points: 10,
            upgradePoints: 0,
            shield: 0,
          },
        }),
      ],
      pendingEffects: [
        {
          id: 'pe-1',
          sourcePlayerId: 'bot-c',
          targetPlayerId: 'bot-a',
          cardId: 'super-attack',
          isUpgraded: true,
          queuedAt: 1,
          damageMultiplier: 1,
          redirectedBy: null,
        },
      ],
    });
    const actions: TurnAction[] = [
      { type: 'playCard', instanceId: 'basic-1', targetPlayerId: 'bot-c' },
      { type: 'playCard', instanceId: 'basic-1', targetPlayerId: 'bot-b' },
      { type: 'draw' },
    ];
    const scored = scoreEngageActions(view, actions, createRng('l40-02-agro'));
    const agro = scoreOf(
      scored,
      (action) =>
        action.type === 'playCard' && action.targetPlayerId === 'bot-c',
    );
    const bystander = scoreOf(
      scored,
      (action) =>
        action.type === 'playCard' && action.targetPlayerId === 'bot-b',
    );

    expect(agro).toBeGreaterThan(bystander);
    expect(decideEngage(view, actions, createRng('l40-02-agro')).action).toEqual({
      type: 'playCard',
      instanceId: 'basic-1',
      targetPlayerId: 'bot-c',
    });
  });

  it('incoming threat: holding Mirror/Shield outranks selling them', () => {
    const view = baseView({
      self: baseSelf({
        points: 8,
        hand: [
          { instanceId: 'mirror-1', cardId: 'mirror', isUpgraded: false },
          { instanceId: 'shield-1', cardId: 'shield', isUpgraded: false },
        ],
      }),
      pendingEffects: [
        {
          id: 'pe-1',
          sourcePlayerId: 'bot-b',
          targetPlayerId: 'bot-a',
          cardId: 'super-attack',
          isUpgraded: true,
          queuedAt: 1,
          damageMultiplier: 1,
          redirectedBy: null,
        },
      ],
    });
    const actions: TurnAction[] = [
      { type: 'sellCard', instanceId: 'mirror-1' },
      { type: 'sellCard', instanceId: 'shield-1' },
      { type: 'playCard', instanceId: 'mirror-1' },
      { type: 'draw' },
    ];
    const scored = scoreEngageActions(view, actions, createRng('l40-02-hold'));

    expect(
      scoreOf(scored, (action) => action.type === 'sellCard' && action.instanceId === 'mirror-1'),
    ).toBe(Number.NEGATIVE_INFINITY);
    expect(
      scoreOf(scored, (action) => action.type === 'sellCard' && action.instanceId === 'shield-1'),
    ).toBe(Number.NEGATIVE_INFINITY);
    expect(decideEngage(view, actions, createRng('l40-02-hold')).action.type).not.toBe(
      'sellCard',
    );
  });

  it('farms Tax instead of chipping a healthy mid-table seat', () => {
    const view = baseView({
      self: baseSelf({
        lives: 10,
        points: 5,
        hand: [
          { instanceId: 'tax-1', cardId: 'tax', isUpgraded: false },
          { instanceId: 'basic-1', cardId: 'basic-attack', isUpgraded: false },
        ],
      }),
      players: [
        player('bot-a', 'Alpha', true),
        player('bot-b', 'Bravo', false, {
          spied: {
            kitId: 'kamikaze',
            hand: [{ instanceId: 'x', cardId: 'super-attack', isUpgraded: true }],
            specialCards: [],
            lives: 15,
            points: 10,
            upgradePoints: 0,
            shield: 0,
          },
        }),
      ],
    });
    const actions: TurnAction[] = [
      { type: 'playCard', instanceId: 'tax-1' },
      { type: 'playCard', instanceId: 'basic-1', targetPlayerId: 'bot-b' },
      { type: 'draw' },
    ];
    const scored = scoreEngageActions(view, actions, createRng('l40-02-farm'));

    expect(
      scoreOf(scored, (action) => action.type === 'playCard' && action.instanceId === 'tax-1'),
    ).toBeGreaterThan(
      scoreOf(
        scored,
        (action) =>
          action.type === 'playCard' && action.instanceId === 'basic-1',
      ),
    );
    expect(decideEngage(view, actions, createRng('l40-02-farm')).action).toEqual({
      type: 'playCard',
      instanceId: 'tax-1',
    });
  });

  it('does not sell the only Super to fund Spy (JAPMZR T3)', () => {
    const view = baseView({
      self: baseSelf({
        points: 0,
        hand: [
          { instanceId: 'super-1', cardId: 'super-attack', isUpgraded: false },
          { instanceId: 'strong-1', cardId: 'strong-attack', isUpgraded: false },
          { instanceId: 'strong-2', cardId: 'strong-attack', isUpgraded: false },
          { instanceId: 'basic-1', cardId: 'basic-attack', isUpgraded: false },
          { instanceId: 'spy-1', cardId: 'spy', isUpgraded: false },
        ],
      }),
    });
    const actions: TurnAction[] = [
      { type: 'sellCard', instanceId: 'super-1' },
      { type: 'playCard', instanceId: 'strong-1', targetPlayerId: 'bot-b' },
      { type: 'draw' },
    ];
    const scored = scoreEngageActions(view, actions, createRng('l40-06-spy'));

    expect(scoreOf(scored, (action) => action.type === 'sellCard')).toBe(
      Number.NEGATIVE_INFINITY,
    );
    expect(decideEngage(view, actions, createRng('l40-06-spy')).action).not.toEqual({
      type: 'sellCard',
      instanceId: 'super-1',
    });
  });

  it('does not sell Basic or Strong for 1–2 points (JAPMZR T15)', () => {
    const view = baseView({
      self: baseSelf({
        points: 8,
        hand: [
          { instanceId: 'strong-1', cardId: 'strong-attack', isUpgraded: false },
          { instanceId: 'basic-1', cardId: 'basic-attack', isUpgraded: false },
        ],
      }),
    });
    const actions: TurnAction[] = [
      { type: 'sellCard', instanceId: 'strong-1' },
      { type: 'sellCard', instanceId: 'basic-1' },
      { type: 'draw' },
    ];
    const scored = scoreEngageActions(view, actions, createRng('l40-06-farm'));

    expect(
      scoreOf(scored, (action) => action.type === 'sellCard' && action.instanceId === 'strong-1'),
    ).toBe(Number.NEGATIVE_INFINITY);
    expect(
      scoreOf(scored, (action) => action.type === 'sellCard' && action.instanceId === 'basic-1'),
    ).toBe(Number.NEGATIVE_INFINITY);
    expect(decideEngage(view, actions, createRng('l40-06-farm')).action.type).not.toBe(
      'sellCard',
    );
  });

  it('allows selling one Super when holding two', () => {
    const view = baseView({
      self: baseSelf({
        points: 0,
        hand: [
          { instanceId: 'super-1', cardId: 'super-attack', isUpgraded: false },
          { instanceId: 'super-2', cardId: 'super-attack', isUpgraded: false },
        ],
      }),
    });
    const actions: TurnAction[] = [
      { type: 'sellCard', instanceId: 'super-1' },
      { type: 'draw' },
    ];
    const scored = scoreEngageActions(view, actions, createRng('l40-06-dup'));

    expect(scoreOf(scored, (action) => action.type === 'sellCard')).not.toBe(
      Number.NEGATIVE_INFINITY,
    );
  });

  it('allows selling Super when that yield funds held Sentence', () => {
    const view = baseView({
      self: baseSelf({
        points: 5,
        hand: [
          { instanceId: 'super-1', cardId: 'super-attack', isUpgraded: false },
          { instanceId: 'strong-1', cardId: 'strong-attack', isUpgraded: false },
        ],
        specialCards: [{ instanceId: 'sent-1', cardId: 'sentence', isUpgraded: false }],
      }),
    });
    const actions: TurnAction[] = [
      { type: 'sellCard', instanceId: 'super-1' },
      { type: 'draw' },
    ];
    const scored = scoreEngageActions(view, actions, createRng('l40-06-sent'));

    expect(scoreOf(scored, (action) => action.type === 'sellCard')).not.toBe(
      Number.NEGATIVE_INFINITY,
    );
  });

  it('still refuses the last attack even to fund Sentence', () => {
    const view = baseView({
      self: baseSelf({
        points: 14,
        hand: [{ instanceId: 'basic-1', cardId: 'basic-attack', isUpgraded: false }],
        specialCards: [{ instanceId: 'sent-1', cardId: 'sentence', isUpgraded: false }],
      }),
    });
    const actions: TurnAction[] = [
      { type: 'sellCard', instanceId: 'basic-1' },
      { type: 'draw' },
    ];
    const scored = scoreEngageActions(view, actions, createRng('l40-06-last'));

    expect(scoreOf(scored, (action) => action.type === 'sellCard')).toBe(
      Number.NEGATIVE_INFINITY,
    );
    expect(decideEngage(view, actions, createRng('l40-06-last')).action).not.toEqual({
      type: 'sellCard',
      instanceId: 'basic-1',
    });
  });

  it('allows selling Basic when that 1 point funds held Card Absorber', () => {
    const view = baseView({
      self: baseSelf({
        kitId: 'warrior',
        points: 3,
        hand: [
          { instanceId: 'basic-1', cardId: 'basic-attack', isUpgraded: false },
          { instanceId: 'strong-1', cardId: 'strong-attack', isUpgraded: false },
        ],
        specialCards: [
          { instanceId: 'abs-1', cardId: 'card-absorber', isUpgraded: false },
        ],
      }),
    });
    const actions: TurnAction[] = [
      { type: 'sellCard', instanceId: 'basic-1' },
      { type: 'draw' },
    ];
    const scored = scoreEngageActions(view, actions, createRng('l40-06-abs'));

    expect(scoreOf(scored, (action) => action.type === 'sellCard')).not.toBe(
      Number.NEGATIVE_INFINITY,
    );
  });

  it('denies Spy against an upgraded public shield (L50-04)', () => {
    const view = baseView({
      self: baseSelf({
        points: 20,
        specialCards: [{ instanceId: 'spy-1', cardId: 'spy', isUpgraded: false }],
      }),
      players: [
        player('bot-a', 'Alpha', true),
        player('bot-b', 'Bravo', false, { activeShield: { isUpgraded: true } }),
      ],
    });
    const actions: TurnAction[] = [
      { type: 'playCard', instanceId: 'spy-1', targetPlayerId: 'bot-b' },
      { type: 'draw' },
    ];
    const scored = scoreEngageActions(view, actions, createRng('l50-04-shield'));

    expect(
      scoreOf(
        scored,
        (action) => action.type === 'playCard' && action.instanceId === 'spy-1',
      ),
    ).toBe(Number.NEGATIVE_INFINITY);
  });

  it('held Reanimation outranks Spy when both are legal (L50-04)', () => {
    const view = baseView({
      self: baseSelf({
        points: 20,
        specialCards: [
          { instanceId: 'spy-1', cardId: 'spy', isUpgraded: false },
          { instanceId: 're-1', cardId: 'reanimation', isUpgraded: false },
        ],
      }),
    });
    const actions: TurnAction[] = [
      { type: 'playCard', instanceId: 'spy-1', targetPlayerId: 'bot-b' },
      { type: 'playCard', instanceId: 're-1' },
      { type: 'draw' },
    ];
    const scored = scoreEngageActions(view, actions, createRng('l50-04-reanim'));

    expect(
      scoreOf(scored, (action) => action.type === 'playCard' && action.instanceId === 're-1'),
    ).toBeGreaterThan(
      scoreOf(
        scored,
        (action) => action.type === 'playCard' && action.instanceId === 'spy-1',
      ),
    );
    expect(decideEngage(view, actions, createRng('l50-04-reanim')).action).toEqual({
      type: 'playCard',
      instanceId: 're-1',
    });
  });
});
