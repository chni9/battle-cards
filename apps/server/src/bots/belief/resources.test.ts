/**
 * Resource reconstruction from scripted public logs — backlog L34-03.
 * Synthetic views only; no engine.
 */

import { describe, expect, it } from 'vitest';

import {
  CLASSIC_LIFE_LIMIT,
  type ActionLogEntryView,
  type ActionPlayedLogEntry,
  type ActionResolvedLogEntry,
  type PlayingStateView,
  type PrivateSelfView,
  type PublicConnectionView,
  type PublicPlayerView,
  type SpiedPlayerView,
} from '@card-battle/shared';

import {
  buildBeliefSummary,
  reconstructOpponentResources,
  sampleFromInterval,
} from './resources';
import { intervalWidth } from './types';

const CONNECTED: PublicConnectionView = {
  status: 'connected',
  disconnectedAt: null,
  automaticTurnsTaken: 0,
  consecutiveTimeouts: 0,
};

const SELF_ID = 'me';
const OPP_ID = 'opp';

function baseSelf(): PrivateSelfView {
  return {
    lives: 10,
    shield: 0,
    shieldIsUpgraded: false,
    points: 0,
    upgradePoints: 0,
    kitId: 'assassin',
    hand: [],
    specialCards: [],
    activePersistentEffects: [],
    attackBlockCharges: 0,
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
    isBot: false,
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

function view(extras: Partial<PlayingStateView> = {}): PlayingStateView {
  return {
    phase: 'playing',
    you: SELF_ID,
    gameCode: 'L34-03',
    currentTurnPlayerId: SELF_ID,
    turnSequence: 3,
    turnOrder: [SELF_ID, OPP_ID],
    turnDeadlineMs: null,
    players: [player(SELF_ID, true), player(OPP_ID, false)],
    self: baseSelf(),
    pendingEffects: [],
    actionLog: [],
    pool: [],
    playKind: 'classic',
    tutorialIndex: null,
    ...extras,
  };
}

function play(
  action: ActionPlayedLogEntry['action'],
  fields: Omit<Partial<ActionPlayedLogEntry>, 'kind' | 'actorPlayerId' | 'action' | 'turnSequence'> & {
    actorPlayerId?: string;
    turnSequence?: number;
  } = {},
): ActionPlayedLogEntry {
  const { actorPlayerId, turnSequence, ...rest } = fields;
  return {
    kind: 'actionPlayed',
    actorPlayerId: actorPlayerId ?? OPP_ID,
    action,
    turnSequence: turnSequence ?? 1,
    ...rest,
  };
}

function resolved(
  fields: Pick<ActionResolvedLogEntry, 'cardId' | 'outcome'> &
    Partial<Omit<ActionResolvedLogEntry, 'kind' | 'cardId' | 'outcome'>>,
): ActionResolvedLogEntry {
  return {
    kind: 'actionResolved',
    effectId: fields.effectId ?? 'e1',
    sourcePlayerId: fields.sourcePlayerId ?? SELF_ID,
    targetPlayerId: fields.targetPlayerId ?? OPP_ID,
    cardId: fields.cardId,
    isUpgraded: fields.isUpgraded ?? false,
    livesLost: fields.livesLost ?? 0,
    shieldAbsorbed: fields.shieldAbsorbed ?? 0,
    outcome: fields.outcome,
    turnSequence: fields.turnSequence ?? 2,
  };
}

describe('reconstructOpponentResources (L34-03)', () => {
  it('matches ground-truth lives when the log has no hidden income', () => {
    const log: ActionLogEntryView[] = [
      resolved({ cardId: 'basic-attack', outcome: 'applied', livesLost: 3 }),
    ];
    const belief = reconstructOpponentResources(
      OPP_ID,
      'assassin',
      view(),
      log,
      CLASSIC_LIFE_LIMIT,
    );
    expect(belief.lives).toEqual({ lo: 7, hi: 7 });
  });

  it('expands lives by regeneration quantity 1..4 when quantity is absent from the log', () => {
    const log: ActionLogEntryView[] = [
      play('playCard', { cardId: 'regeneration', isUpgraded: false }),
    ];
    const belief = reconstructOpponentResources(
      OPP_ID,
      'assassin',
      view(),
      log,
      CLASSIC_LIFE_LIMIT,
    );
    expect(intervalWidth(belief.lives)).toBeGreaterThanOrEqual(3);
    expect(belief.lives.lo).toBe(11);
    expect(belief.lives.hi).toBe(14);
  });

  it('collapses to a point interval from Spy-revealed lives', () => {
    const spied: SpiedPlayerView = {
      kitId: 'assassin',
      hand: [],
      specialCards: [],
      lives: 12,
      points: 4,
      upgradePoints: 1,
    };
    const playing = view({
      players: [player(SELF_ID, true), player(OPP_ID, false, { spied })],
    });
    const belief = reconstructOpponentResources(
      OPP_ID,
      'assassin',
      playing,
      [resolved({ cardId: 'basic-attack', outcome: 'applied', livesLost: 3 })],
      CLASSIC_LIFE_LIMIT,
    );
    expect(belief.lives).toEqual({ lo: 12, hi: 12 });
    expect(intervalWidth(belief.lives)).toBe(0);
  });
});

describe('buildBeliefSummary (L34-03)', () => {
  it('normalizes life-interval width as (hi-lo)/lifeLimit for seat offset 1', () => {
    const log: ActionLogEntryView[] = [
      play('playCard', { cardId: 'regeneration', isUpgraded: false }),
    ];
    const playing = view();
    const summary = buildBeliefSummary(
      SELF_ID,
      playing,
      log,
      new Map([[OPP_ID, 'assassin']]),
      CLASSIC_LIFE_LIMIT,
    );
    expect(summary.lifeWidthByOpponentOffset[0]).toBe(3 / CLASSIC_LIFE_LIMIT);
    expect(summary.lifeWidthByOpponentOffset[1]).toBe(0);
    expect(summary.lifeWidthByOpponentOffset[2]).toBe(0);
  });
});

describe('points-generator truth-in-interval (L34-03)', () => {
  it('keeps true points inside the reconstructed interval after PG ticks', () => {
    const log: ActionLogEntryView[] = [
      play('draw', { turnSequence: 1 }),
      play('draw', { turnSequence: 2 }),
      play('draw', { turnSequence: 3 }),
      play('draw', { turnSequence: 4 }),
      play('draw', { turnSequence: 5 }),
      play('playCard', { cardId: 'points-generator', isUpgraded: false, turnSequence: 6 }),
      play('draw', { turnSequence: 7 }),
      play('draw', { turnSequence: 8 }),
    ];
    const playing = view({
      players: [
        player(SELF_ID, true),
        player(OPP_ID, false, {
          activePersistentEffects: [
            {
              id: 'pg-1',
              cardId: 'points-generator',
              isUpgraded: false,
              counter: 3,
              targetPlayerId: null,
            },
          ],
        }),
      ],
    });
    const belief = reconstructOpponentResources(
      OPP_ID,
      'assassin',
      playing,
      log,
      CLASSIC_LIFE_LIMIT,
    );
    // Assassin start 0 pts, draw 1. Five draws → 5; PG play −5 +2 tick → 2;
    // two later draws each +1 draw +2 PG → 8.
    const expectedPoints = 8;
    expect(belief.points.lo).toBeLessThanOrEqual(expectedPoints);
    expect(expectedPoints).toBeLessThanOrEqual(belief.points.hi);
  });
});

describe('sampleFromInterval (L34-03)', () => {
  it('draws integers inside [lo, hi] inclusive', () => {
    const interval = { lo: 2, hi: 5 };
    const draws = [0, 0.24, 0.49, 0.74, 0.99];
    let index = 0;
    const rng = {
      next: (): number => {
        const value = draws[index] ?? 0;
        index += 1;
        return value;
      },
    };

    const sampled = draws.map(() => sampleFromInterval(interval, rng));

    for (const value of sampled) {
      expect(value).toBeGreaterThanOrEqual(2);
      expect(value).toBeLessThanOrEqual(5);
      expect(Number.isInteger(value)).toBe(true);
    }
  });
});
