/**
 * Measured action-log resource nets — PROTOCOL_VERSION 41.
 */

import { getKit, type KitId } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { buildPlayingViewFor } from '../../protocol/build-view-for';
import { grantSpy } from '../../protocol/visibility-matrix';
import { makeCounterEffect } from '../../testing/factories';
import { createInitialState } from '../create-initial-state';
import { createRng } from '../rng';
import { performTurnAction } from './perform-action';
import { resolvePendingEffects } from './resolve-pending';

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

describe('actor resource nets (PROTOCOL_VERSION 41)', () => {
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

  it('omits a card-sale payout unless the viewer sees the seller', () => {
    const { state, alice } = twoPlayers('log-sell-card');
    alice.hand = [{ instanceId: 'ba-sell', cardId: 'basic-attack', isUpgraded: false }];
    alice.points = 0;

    const sold = performTurnAction(state, alice.id, {
      type: 'sellCard',
      instanceId: 'ba-sell',
    });
    expect(sold.ok).toBe(true);
    if (!sold.ok) {
      return;
    }
    expect(sold.actionPlayed.resourceDeltas).toEqual([{ kind: 'point', amount: 1 }]);

    const log = [
      {
        kind: 'actionPlayed' as const,
        actorPlayerId: alice.id,
        action: 'sellCard' as const,
        turnSequence: sold.actionPlayed.turnSequence,
        ...(sold.actionPlayed.resourceDeltas !== undefined
          ? { resourceDeltas: sold.actionPlayed.resourceDeltas }
          : {}),
      },
    ];
    const hidden = buildPlayingViewFor({
      recipientSessionId: 'b',
      gameCode: 'TEST',
      state,
      turnDeadlineMs: null,
      actionLog: log,
    });
    expect(hidden.actionLog[0]).not.toHaveProperty('resourceDeltas');

    const self = buildPlayingViewFor({
      recipientSessionId: alice.id,
      gameCode: 'TEST',
      state,
      turnDeadlineMs: null,
      actionLog: log,
    });
    expect(self.actionLog[0]).toMatchObject({
      resourceDeltas: [{ kind: 'point', amount: 1 }],
    });
  });

  it('omits a shop-buy price unless the viewer sees the buyer', () => {
    const { state, alice } = twoPlayers('log-buy-card', ['warrior', 'kamikaze']);
    alice.points = 5;

    const bought = performTurnAction(state, alice.id, {
      type: 'buyCard',
      cardId: 'basic-attack',
    });
    expect(bought.ok).toBe(true);
    if (!bought.ok) {
      return;
    }
    expect(bought.actionPlayed.resourceDeltas).toEqual([{ kind: 'point', amount: -2 }]);

    const log = [
      {
        kind: 'actionPlayed' as const,
        actorPlayerId: alice.id,
        action: 'buyCard' as const,
        turnSequence: bought.actionPlayed.turnSequence,
        ...(bought.actionPlayed.resourceDeltas !== undefined
          ? { resourceDeltas: bought.actionPlayed.resourceDeltas }
          : {}),
      },
    ];
    const hidden = buildPlayingViewFor({
      recipientSessionId: 'b',
      gameCode: 'TEST',
      state,
      turnDeadlineMs: null,
      actionLog: log,
    });
    expect(hidden.actionLog[0]).not.toHaveProperty('resourceDeltas');

    const self = buildPlayingViewFor({
      recipientSessionId: alice.id,
      gameCode: 'TEST',
      state,
      turnDeadlineMs: null,
      actionLog: log,
    });
    expect(self.actionLog[0]).toMatchObject({
      resourceDeltas: [{ kind: 'point', amount: -2 }],
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
      resourceDeltas: [{ kind: 'point', amount: -2 }],
    });
  });
});

describe('Ghost life-point gains on the action log', () => {
  it('fogs the points unless the viewer spies that Ghost', () => {
    const { state, alice, bob } = twoPlayers('log-ghost-fog', ['warrior', 'ghost']);
    bob.shield = 0;
    const log = [
      {
        kind: 'actionResolved' as const,
        effectId: 'hit',
        sourcePlayerId: alice.id,
        targetPlayerId: bob.id,
        cardId: 'basic-attack' as const,
        isUpgraded: false,
        livesLost: 1,
        shieldAbsorbed: 0,
        outcome: 'applied' as const,
        turnSequence: 1,
        playerDeltas: [
          {
            playerId: bob.id,
            deltas: [
              { kind: 'life' as const, amount: -1 },
              { kind: 'point' as const, amount: 2 },
            ],
          },
        ],
      },
      {
        kind: 'resourceChange' as const,
        playerId: bob.id,
        turnSequence: 2,
        deltas: [
          { kind: 'life' as const, amount: -1 },
          { kind: 'point' as const, amount: 2 },
        ],
      },
    ];

    const hidden = buildPlayingViewFor({
      recipientSessionId: alice.id,
      gameCode: 'TEST',
      state,
      turnDeadlineMs: null,
      actionLog: log,
    });
    expect(hidden.actionLog[0]).toMatchObject({
      playerDeltas: [
        {
          playerId: bob.id,
          deltas: [
            { kind: 'life', amount: -1 },
            { kind: 'point', concealed: true, direction: 'gain' },
          ],
        },
      ],
    });
    expect(hidden.actionLog[1]).toMatchObject({
      deltas: [
        { kind: 'life', amount: -1 },
        { kind: 'point', concealed: true, direction: 'gain' },
      ],
    });

    const self = buildPlayingViewFor({
      recipientSessionId: bob.id,
      gameCode: 'TEST',
      state,
      turnDeadlineMs: null,
      actionLog: log,
    });
    expect(self.actionLog[0]).toMatchObject({
      playerDeltas: [
        {
          deltas: [
            { kind: 'life', amount: -1 },
            { kind: 'point', amount: 2 },
          ],
        },
      ],
    });

    grantSpy(state, alice.id, bob.id, 'kit-and-cards');
    const spied = buildPlayingViewFor({
      recipientSessionId: alice.id,
      gameCode: 'TEST',
      state,
      turnDeadlineMs: null,
      actionLog: log,
    });
    expect(spied.actionLog[0]).toMatchObject({
      playerDeltas: [
        {
          deltas: [
            { kind: 'life', amount: -1 },
            { kind: 'point', amount: 2 },
          ],
        },
      ],
    });
  });
});

describe('resolve-line resource nets', () => {
  it('records the target life loss on an attack and both sides of a Thief', () => {
    const attack = twoPlayers('log-resolve-atk', ['warrior', 'kamikaze']);
    attack.bob.shield = 0;
    const lives = attack.bob.lives;
    attack.bob.pendingEffects = [
      {
        id: 'atk',
        sourcePlayerId: attack.alice.id,
        targetPlayerId: attack.bob.id,
        cardId: 'basic-attack',
        isUpgraded: false,
        queuedAt: 0,
        damageMultiplier: 1,
        redirectedBy: null,
        chosenInstanceId: null,
      },
    ];
    const hit = resolvePendingEffects(attack.state, attack.bob.id, createRng('log-resolve-atk'));
    expect(attack.bob.lives).toBe(lives - 1);
    expect(hit[0]?.playerDeltas).toEqual([
      { playerId: attack.bob.id, deltas: [{ kind: 'life', amount: -1 }] },
    ]);

    const steal = twoPlayers('log-resolve-thief', ['warrior', 'kamikaze']);
    steal.bob.points = 12;
    steal.alice.points = 0;
    steal.bob.pendingEffects = [
      {
        id: 'th',
        sourcePlayerId: steal.alice.id,
        targetPlayerId: steal.bob.id,
        cardId: 'thief',
        isUpgraded: false,
        queuedAt: 0,
        damageMultiplier: 1,
        redirectedBy: null,
        chosenInstanceId: null,
      },
    ];
    const taken = resolvePendingEffects(steal.state, steal.bob.id, createRng('log-resolve-thief'));
    expect(taken[0]?.playerDeltas).toEqual([
      { playerId: steal.bob.id, deltas: [{ kind: 'point', amount: -10 }] },
      { playerId: steal.alice.id, deltas: [{ kind: 'point', amount: 10 }] },
    ]);
  });

  it('keeps a Duplicator copy off the public resolve line', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
        { id: 'c', nickname: 'Carol' },
      ],
      seed: 'log-resolve-dup',
      kitAssignment: ['warrior', 'kamikaze', 'duplicator'],
    });
    const alice = state.players.find((player) => player.id === 'a');
    const bob = state.players.find((player) => player.id === 'b');
    const dup = state.players.find((player) => player.id === 'c');
    if (alice === undefined || bob === undefined || dup === undefined) {
      throw new Error('missing players');
    }
    dup.duplicationActive = true;
    bob.points = 10;
    alice.points = 0;
    const dupPoints = dup.points;
    bob.pendingEffects = [
      {
        id: 'th-dup',
        sourcePlayerId: alice.id,
        targetPlayerId: bob.id,
        cardId: 'thief',
        isUpgraded: false,
        queuedAt: 0,
        damageMultiplier: 1,
        redirectedBy: null,
        chosenInstanceId: null,
      },
    ];

    const resolved = resolvePendingEffects(state, bob.id, createRng('log-resolve-dup'));
    expect(resolved[0]?.playerDeltas).toEqual([
      { playerId: bob.id, deltas: [{ kind: 'point', amount: -10 }] },
      { playerId: alice.id, deltas: [{ kind: 'point', amount: 10 }] },
    ]);
    expect(resolved[0]?.playerDeltas?.some((entry) => entry.playerId === dup.id)).toBe(false);
    expect(dup.points).toBe(dupPoints + 10);
  });
});
