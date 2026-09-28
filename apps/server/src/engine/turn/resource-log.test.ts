/**
 * Measured action-log resource nets — PROTOCOL_VERSION 40.
 */

import { getKit, type KitId } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { buildPlayingViewFor } from '../../protocol/build-view-for';
import { grantSpy } from '../../protocol/visibility-matrix';
import { makeCounterEffect } from '../../testing/factories';
import { createInitialState } from '../create-initial-state';
import { performTurnAction } from './perform-action';

function twoPlayers(seed: string, kits?: readonly [KitId, KitId]) {
  const state = createInitialState({
    seats: [
      { id: 'a', nickname: 'Alice' },
      { id: 'b', nickname: 'Bob' },
    ],
    seed,
    ...(kits !== undefined ? { kitAssignment: [...kits] } : {}),
  });
  const alice = state.players.find((player) => player.id === 'a');
  const bob = state.players.find((player) => player.id === 'b');
  if (alice === undefined || bob === undefined) {
    throw new Error('missing players');
  }
  for (const player of state.players) {
    player.pendingEffects = [];
    player.activePersistentEffects = [];
  }
  state.currentTurnPlayerId = alice.id;
  return { state, alice, bob };
}

describe('actor resource nets (PROTOCOL_VERSION 40)', () => {
  it('records a basic attack as a one-point loss', () => {
    const { state, alice, bob } = twoPlayers('log-basic');
    alice.hand = [{ instanceId: 'ba-1', cardId: 'basic-attack', isUpgraded: false }];
    alice.points = 4;

    const result = performTurnAction(state, alice.id, {
      type: 'playCard',
      instanceId: 'ba-1',
      targetPlayerId: bob.id,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.actionPlayed.resourceDeltas).toEqual([{ kind: 'point', amount: -1 }]);
  });

  it('records Draw as the kit payout and a Points Generator tick on its own line', () => {
    const { state, alice } = twoPlayers('log-draw-pg', ['warrior', 'kamikaze']);
    const draw = getKit(alice.kitId).startingResources.draw;
    alice.points = 0;
    alice.activePersistentEffects = [
      makeCounterEffect({ id: 'pg-1', cardId: 'points-generator', counter: 3 }),
    ];

    const result = performTurnAction(state, alice.id, { type: 'draw' });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.actionPlayed.resourceDeltas).toEqual([{ kind: 'point', amount: draw }]);
    expect(result.resourceChanges).toEqual([
      {
        kind: 'resourceChange',
        playerId: alice.id,
        turnSequence: result.actionPlayed.turnSequence,
        deltas: [{ kind: 'point', amount: 3 }],
      },
    ]);
  });

  it('records a Poison tick as a public life loss, not on the play line', () => {
    const { state, alice, bob } = twoPlayers('log-poison', ['warrior', 'witch']);
    const lives = alice.lives;
    bob.activePersistentEffects = [
      makeCounterEffect({ id: 'poi-1', cardId: 'poison', counter: 3 }),
    ];

    const result = performTurnAction(state, alice.id, { type: 'draw' });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.actionPlayed.resourceDeltas?.some((delta) => delta.kind === 'life')).toBe(
      false,
    );
    expect(alice.lives).toBe(lives - 1);
    expect(result.resourceChanges).toEqual([
      {
        kind: 'resourceChange',
        playerId: alice.id,
        turnSequence: result.actionPlayed.turnSequence,
        deltas: [{ kind: 'life', amount: -1 }],
      },
    ]);
  });

  it('records buy and sell upgrade-point nets', () => {
    const bought = twoPlayers('log-buy-up', ['warrior', 'kamikaze']);
    bought.alice.points = 10;
    bought.alice.upgradePoints = 0;
    const buy = performTurnAction(bought.state, bought.alice.id, { type: 'buyUpgradePoint' });
    expect(buy.ok).toBe(true);
    if (!buy.ok) {
      return;
    }
    expect(buy.actionPlayed.resourceDeltas).toEqual([
      { kind: 'point', amount: -10 },
      { kind: 'upgradePoint', amount: 1 },
    ]);

    const upgrader = twoPlayers('log-upgrader-buy', ['upgrader', 'kamikaze']);
    upgrader.alice.points = 5;
    upgrader.alice.upgradePoints = 0;
    const cheap = performTurnAction(upgrader.state, upgrader.alice.id, {
      type: 'buyUpgradePoint',
    });
    expect(cheap.ok).toBe(true);
    if (!cheap.ok) {
      return;
    }
    expect(cheap.actionPlayed.resourceDeltas).toEqual([
      { kind: 'point', amount: -5 },
      { kind: 'upgradePoint', amount: 1 },
    ]);

    const sold = twoPlayers('log-sell-up', ['warrior', 'kamikaze']);
    sold.alice.points = 0;
    sold.alice.upgradePoints = 1;
    const sell = performTurnAction(sold.state, sold.alice.id, { type: 'sellUpgradePoint' });
    expect(sell.ok).toBe(true);
    if (!sell.ok) {
      return;
    }
    expect(sell.actionPlayed.resourceDeltas).toEqual([
      { kind: 'point', amount: 7 },
      { kind: 'upgradePoint', amount: -1 },
    ]);
  });
});

describe('Duplicator copy lines', () => {
  it('keeps copies off the public log unless the viewer sees that Duplicator', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
        { id: 'c', nickname: 'Carol' },
      ],
      seed: 'log-dup-copy',
      kitAssignment: ['duplicator', 'warrior', 'kamikaze'],
    });
    const dup = state.players.find((player) => player.id === 'a');
    const warrior = state.players.find((player) => player.id === 'b');
    if (dup === undefined || warrior === undefined) {
      throw new Error('missing players');
    }

    dup.duplicationActive = true;
    for (const player of state.players) {
      player.pendingEffects = [];
      player.activePersistentEffects = [];
    }
    state.currentTurnPlayerId = warrior.id;
    warrior.points = 0;

    const result = performTurnAction(state, warrior.id, { type: 'draw' });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const copy = result.playedResourceChanges?.find(
      (entry) => entry.playerId === dup.id && entry.duplicated === true,
    );
    expect(copy?.deltas).toEqual([
      { kind: 'point', amount: getKit('warrior').startingResources.draw },
    ]);

    const log = [
      {
        kind: 'actionPlayed' as const,
        actorPlayerId: dup.id,
        action: 'activateDuplication' as const,
        turnSequence: 1,
      },
      {
        kind: 'actionPlayed' as const,
        actorPlayerId: warrior.id,
        action: 'draw' as const,
        turnSequence: result.actionPlayed.turnSequence,
        ...(result.actionPlayed.resourceDeltas !== undefined
          ? { resourceDeltas: result.actionPlayed.resourceDeltas }
          : {}),
        ...(result.actionPlayed.drawGain !== undefined
          ? { drawGain: result.actionPlayed.drawGain }
          : {}),
      },
      ...(result.playedResourceChanges ?? []),
    ];

    const forOther = buildPlayingViewFor({
      recipientSessionId: 'c',
      gameCode: 'TEST',
      state,
      turnDeadlineMs: null,
      actionLog: log,
    });
    expect(forOther.actionLog.some((entry) => entry.kind === 'resourceChange')).toBe(false);
    const disguised = forOther.actionLog[0];
    expect(disguised).toMatchObject({
      kind: 'actionPlayed',
      action: 'draw',
      resourceDeltas: [{ kind: 'point', concealed: true, direction: 'gain' }],
    });
    expect(disguised).not.toHaveProperty('drawGain');

    grantSpy(state, 'c', dup.id, 'kit-and-cards');
    const forSpy = buildPlayingViewFor({
      recipientSessionId: 'c',
      gameCode: 'TEST',
      state,
      turnDeadlineMs: null,
      actionLog: log,
    });
    expect(
      forSpy.actionLog.some(
        (entry) =>
          entry.kind === 'resourceChange' &&
          entry.playerId === dup.id &&
          entry.duplicated === true,
      ),
    ).toBe(true);
    expect(forSpy.actionLog[0]).toMatchObject({ action: 'activateDuplication' });
    expect(forSpy.actionLog[0]).not.toMatchObject({
      resourceDeltas: [{ kind: 'point', concealed: true, direction: 'gain' }],
    });
  });
});

describe('per-recipient Draw and buy-upgrade fog', () => {
  it('conceals point totals unless the viewer sees the actor', () => {
    const { state, alice } = twoPlayers('log-fog', ['gambler', 'kamikaze']);
    const log = [
      {
        kind: 'actionPlayed' as const,
        actorPlayerId: alice.id,
        action: 'draw' as const,
        turnSequence: 1,
        drawGain: 47,
        resourceDeltas: [{ kind: 'point' as const, amount: 47 }],
      },
      {
        kind: 'actionPlayed' as const,
        actorPlayerId: alice.id,
        action: 'buyUpgradePoint' as const,
        turnSequence: 2,
        resourceDeltas: [
          { kind: 'point' as const, amount: -10 },
          { kind: 'upgradePoint' as const, amount: 1 },
        ],
      },
      {
        kind: 'rewardsClaimed' as const,
        eliminatorPlayerId: alice.id,
        eliminatedPlayerId: 'b',
        turnSequence: 3,
      },
    ];

    const hidden = buildPlayingViewFor({
      recipientSessionId: 'b',
      gameCode: 'TEST',
      state,
      turnDeadlineMs: null,
      actionLog: log,
    });
    expect(hidden.actionLog[0]).toMatchObject({
      action: 'draw',
      resourceDeltas: [{ kind: 'point', concealed: true, direction: 'gain' }],
    });
    expect(hidden.actionLog[0]).not.toHaveProperty('drawGain');
    expect(hidden.actionLog[1]).toMatchObject({
      action: 'buyUpgradePoint',
      resourceDeltas: [
        { kind: 'point', concealed: true, direction: 'loss' },
        { kind: 'upgradePoint', amount: 1 },
      ],
    });
    expect(hidden.actionLog[2]).toEqual(log[2]);

    const self = buildPlayingViewFor({
      recipientSessionId: alice.id,
      gameCode: 'TEST',
      state,
      turnDeadlineMs: null,
      actionLog: log,
    });
    expect(self.actionLog[0]).toMatchObject({
      drawGain: 47,
      resourceDeltas: [{ kind: 'point', amount: 47 }],
    });

    grantSpy(state, 'b', alice.id, 'kit-and-cards');
    const spy = buildPlayingViewFor({
      recipientSessionId: 'b',
      gameCode: 'TEST',
      state,
      turnDeadlineMs: null,
      actionLog: log,
    });
    expect(spy.actionLog[0]).toMatchObject({
      drawGain: 47,
      resourceDeltas: [{ kind: 'point', amount: 47 }],
    });
    expect(spy.actionLog[1]).toMatchObject({
      resourceDeltas: [
        { kind: 'point', amount: -10 },
        { kind: 'upgradePoint', amount: 1 },
      ],
    });
  });
});
