/**
 * Hand / special accounting and sampling — backlog L34-04.
 * Synthetic views only; no engine.
 */

import { describe, expect, it } from 'vitest';

import {
  isSharedAttackCardId,
  type ActionLogEntryView,
  type ActionPlayedLogEntry,
  type PlayingStateView,
  type PrivateSelfView,
  type PublicConnectionView,
  type PublicPlayerView,
} from '@card-battle/shared';

import { createRng } from '../../engine/rng';
import { uniformZonePrior } from './hand-prior';
import { accountOpponentHandSizes, sampleOpponentHandAndSpecials } from './hands';
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
    gameCode: 'L34-04',
    currentTurnPlayerId: SELF_ID,
    turnSequence: 3,
    turnOrder: [SELF_ID, OPP_ID],
    turnDeadlineMs: null,
    players: [player(SELF_ID, true), player(OPP_ID, false)],
    self: baseSelf(),
    pendingEffects: [],
    actionLog: [],
    pool: [],
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

describe('accountOpponentHandSizes (L34-04)', () => {
  it('matches kamikaze starting 7 action / 2 attack / 1 special with an empty log', () => {
    const sizes = accountOpponentHandSizes(OPP_ID, 'kamikaze', view(), []);
    expect(sizes.actionCount).toEqual({ lo: 7, hi: 7 });
    expect(sizes.attackCount).toEqual({ lo: 2, hi: 2 });
    expect(sizes.specialCount).toEqual({ lo: 1, hi: 1 });
  });

  it('adds one attack after buyCard basic-attack', () => {
    const log: ActionLogEntryView[] = [play('buyCard', { cardId: 'basic-attack' })];
    const sizes = accountOpponentHandSizes(OPP_ID, 'kamikaze', view(), log);
    expect(sizes.attackCount).toEqual({ lo: 3, hi: 3 });
    expect(sizes.actionCount).toEqual({ lo: 7, hi: 7 });
  });

  it('decrements special count after playCard suicide', () => {
    const log: ActionLogEntryView[] = [play('playCard', { cardId: 'suicide' })];
    const sizes = accountOpponentHandSizes(OPP_ID, 'kamikaze', view(), log);
    expect(sizes.specialCount).toEqual({ lo: 0, hi: 0 });
    expect(sizes.actionCount).toEqual({ lo: 7, hi: 7 });
  });

  it('does not change hand size when a shared card is played (reusable)', () => {
    const log: ActionLogEntryView[] = [play('playCard', { cardId: 'basic-attack' })];
    const sizes = accountOpponentHandSizes(OPP_ID, 'kamikaze', view(), log);
    expect(sizes.actionCount).toEqual({ lo: 7, hi: 7 });
    expect(sizes.attackCount).toEqual({ lo: 2, hi: 2 });
  });

  it('widens action and attack intervals after card-thief (not a point estimate)', () => {
    const log: ActionLogEntryView[] = [
      play('playCard', { cardId: 'card-thief', targetPlayerId: SELF_ID }),
    ];
    const sizes = accountOpponentHandSizes(OPP_ID, 'specialist', view(), log);
    expect(intervalWidth(sizes.actionCount)).toBeGreaterThan(0);
    expect(intervalWidth(sizes.attackCount)).toBeGreaterThan(0);
  });

  it('widens hand intervals after card-transformer consumes an unknown zone card', () => {
    const log: ActionLogEntryView[] = [play('playCard', { cardId: 'card-transformer' })];
    const sizes = accountOpponentHandSizes(OPP_ID, 'specialist', view(), log);
    expect(intervalWidth(sizes.actionCount)).toBeGreaterThan(0);
    expect(intervalWidth(sizes.attackCount)).toBeGreaterThan(0);
  });
});

describe('sampleOpponentHandAndSpecials (L34-04)', () => {
  it('never reuses an instanceId from self hand or the pool', () => {
    const playing = view({
      self: {
        ...baseSelf(),
        hand: [{ instanceId: 'self-tax', cardId: 'tax', isUpgraded: false }],
        specialCards: [{ instanceId: 'self-spy', cardId: 'suicide', isUpgraded: false }],
      },
      pool: [{ instanceId: 'pool-atk', cardId: 'basic-attack', isUpgraded: false }],
    });
    const sizes = accountOpponentHandSizes(OPP_ID, 'kamikaze', playing, []);
    const sampled = sampleOpponentHandAndSpecials({
      opponentPlayerId: OPP_ID,
      kitId: 'kamikaze',
      view: playing,
      log: [],
      sizes,
      prior: uniformZonePrior,
      rng: createRng('l34-04-forbidden'),
    });
    const ids = [...sampled.hand, ...sampled.specialCards].map((card) => card.instanceId);
    expect(ids).not.toContain('self-tax');
    expect(ids).not.toContain('self-spy');
    expect(ids).not.toContain('pool-atk');
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('samples sizes inside the accounted intervals', () => {
    const log: ActionLogEntryView[] = [
      play('buyCard', { cardId: 'basic-attack' }),
      play('playCard', { cardId: 'card-thief', targetPlayerId: SELF_ID, turnSequence: 2 }),
    ];
    const playing = view();
    const sizes = accountOpponentHandSizes(OPP_ID, 'specialist', playing, log);
    const sampled = sampleOpponentHandAndSpecials({
      opponentPlayerId: OPP_ID,
      kitId: 'specialist',
      view: playing,
      log,
      sizes,
      prior: uniformZonePrior,
      rng: createRng('l34-04-bounds'),
    });
    const attackHeld = sampled.hand.filter((card) => isSharedAttackCardId(card.cardId)).length;
    const actionHeld = sampled.hand.length - attackHeld;
    expect(actionHeld).toBeGreaterThanOrEqual(sizes.actionCount.lo);
    expect(actionHeld).toBeLessThanOrEqual(sizes.actionCount.hi);
    expect(attackHeld).toBeGreaterThanOrEqual(sizes.attackCount.lo);
    expect(attackHeld).toBeLessThanOrEqual(sizes.attackCount.hi);
    expect(sampled.specialCards.length).toBeGreaterThanOrEqual(sizes.specialCount.lo);
    expect(sampled.specialCards.length).toBeLessThanOrEqual(sizes.specialCount.hi);
  });
});
