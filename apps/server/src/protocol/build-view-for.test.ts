import { describe, expect, it } from 'vitest';

import { createInitialState } from '../engine/create-initial-state';
import { buildFinishedViewFor, buildLobbyViewFor, buildPlayingViewFor } from './build-view-for';

describe('buildLobbyViewFor (L1-01)', () => {
  const seats = [
    { id: 'session-a', nickname: 'Alice' },
    { id: 'session-b', nickname: 'Bob' },
  ] as const;

  it('tells the recipient which session is theirs', () => {
    const view = buildLobbyViewFor({
      recipientSessionId: 'session-b',
      gameCode: 'ABCDEF',
      hostPlayerId: 'session-a',
      seats,
    });

    expect(view.you).toBe('session-b');
    expect(view.phase).toBe('lobby');
  });

  it('refuses to build a view for someone who is not seated', () => {
    expect(() =>
      buildLobbyViewFor({
        recipientSessionId: 'intruder',
        gameCode: 'ABCDEF',
        hostPlayerId: 'session-a',
        seats,
      }),
    ).toThrow(/not in the room/);
  });
});

describe('buildPlayingViewFor (L1-09) — hidden information', () => {
  it('never puts an opponent hand in the recipient payload', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'view-seed',
    });

    const viewForA = buildPlayingViewFor({
      recipientSessionId: 'a',
      gameCode: 'ABCDEF',
      state,
      turnDeadlineMs: null,
      actionLog: [],
    });

    const serialised = JSON.stringify(viewForA);
    const opponent = state.players.find((player) => player.id === 'b');

    expect(opponent).toBeDefined();

    if (opponent === undefined) {
      return;
    }

    const opponentInstanceId = opponent.hand[0]?.instanceId;

    expect(viewForA.self.hand.length).toBeGreaterThan(0);
    expect(opponentInstanceId).toBeDefined();
    expect(serialised).not.toContain(opponentInstanceId);
    expect(viewForA.players.find((player) => player.id === 'b')?.spied).toBeUndefined();
    expect(serialised).not.toMatch(/"cardCount"/);
  });

  it('never includes the game seed', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'secret-seed-value',
    });

    const view = buildPlayingViewFor({
      recipientSessionId: 'a',
      gameCode: 'ABCDEF',
      state,
      turnDeadlineMs: null,
      actionLog: [],
    });

    expect(JSON.stringify(view)).not.toContain('secret-seed-value');
  });

  it('never puts opponent lives or shield in the public player slice', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'hidden-lives',
    });
    const opponent = state.players.find((player) => player.id === 'b');

    expect(opponent).toBeDefined();

    if (opponent === undefined) {
      return;
    }

    opponent.lives = 19;
    opponent.shield = 7;

    const view = buildPlayingViewFor({
      recipientSessionId: 'a',
      gameCode: 'ABCDEF',
      state,
      turnDeadlineMs: null,
      actionLog: [],
    });

    const opponentView = view.players.find((player) => player.id === 'b');
    const serialised = JSON.stringify(opponentView);

    expect(opponentView).not.toHaveProperty('lives');
    expect(opponentView).not.toHaveProperty('shield');
    expect(serialised).not.toContain('19');
    expect(serialised).not.toContain('"shield"');
    expect(view.self.lives).toBe(state.players.find((player) => player.id === 'a')?.lives);
  });

  it('exposes active persistents on self and every public seat', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'actives-public',
    });
    const alice = state.players.find((player) => player.id === 'a');
    const bob = state.players.find((player) => player.id === 'b');
    expect(alice).toBeDefined();
    expect(bob).toBeDefined();
    if (alice === undefined || bob === undefined) {
      return;
    }

    alice.activePersistentEffects = [
      { id: 'imp-a', cardId: 'imposition', isUpgraded: true, counter: 2 },
    ];
    bob.activePersistentEffects = [
      { id: 'pg-b', cardId: 'points-generator', isUpgraded: false, counter: 3 },
    ];

    const view = buildPlayingViewFor({
      recipientSessionId: 'a',
      gameCode: 'ABCDEF',
      state,
      turnDeadlineMs: null,
      actionLog: [],
    });

    expect(view.self.activePersistentEffects).toEqual([
      { id: 'imp-a', cardId: 'imposition', isUpgraded: true, counter: 2 },
    ]);
    expect(view.players.find((p) => p.id === 'a')?.activePersistentEffects).toEqual([
      { id: 'imp-a', cardId: 'imposition', isUpgraded: true, counter: 2 },
    ]);
    expect(view.players.find((p) => p.id === 'b')?.activePersistentEffects).toEqual([
      { id: 'pg-b', cardId: 'points-generator', isUpgraded: false, counter: 3 },
    ]);
  });

  it('exposes activeShield when combat shield points remain', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'shield-active',
    });
    const bob = state.players.find((player) => player.id === 'b');
    expect(bob).toBeDefined();
    if (bob === undefined) {
      return;
    }
    bob.shield = 4;
    bob.shieldIsUpgraded = true;

    const view = buildPlayingViewFor({
      recipientSessionId: 'a',
      gameCode: 'ABCDEF',
      state,
      turnDeadlineMs: null,
      actionLog: [],
    });

    expect(view.players.find((p) => p.id === 'b')?.activeShield).toEqual({
      isUpgraded: true,
    });
    expect(view.players.find((p) => p.id === 'a')?.activeShield).toBeNull();
  });
});

describe('buildFinishedViewFor (L9-03)', () => {
  it('includes public recap aggregates without kits or private resources', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'finished-recap',
    });

    const view = buildFinishedViewFor({
      recipientSessionId: 'a',
      gameCode: 'ABCDEF',
      state,
      winnerPlayerId: 'a',
      actionLog: [
        {
          kind: 'actionPlayed',
          actorPlayerId: 'a',
          action: 'playCard',
          cardId: 'basic-attack',
          targetPlayerId: 'b',
          turnSequence: 1,
        },
        {
          kind: 'actionResolved',
          effectId: 'e1',
          sourcePlayerId: 'a',
          targetPlayerId: 'b',
          cardId: 'basic-attack',
          isUpgraded: false,
          livesLost: 1,
          shieldAbsorbed: 0,
          outcome: 'applied',
          turnSequence: 2,
        },
        {
          kind: 'rewardsClaimed',
          eliminatorPlayerId: 'a',
          eliminatedPlayerId: 'b',
          turnSequence: 2,
        },
      ],
      eliminations: [
        { playerId: 'b', eliminatorPlayerId: 'a', reason: 'combat' },
      ],
    });

    expect(view.phase).toBe('finished');
    expect(view.recap.players.find((row) => row.playerId === 'a')).toMatchObject({
      cardsPlayedCount: 1,
      buyCount: 0,
      sellCount: 0,
      upgradeCount: 0,
    });
    expect(view.recap.eliminations).toEqual([
      { playerId: 'b', eliminatorPlayerId: 'a', reason: 'combat' },
    ]);

    const serialised = JSON.stringify(view);
    expect(serialised).not.toContain('finished-recap');
    expect(serialised).not.toMatch(/"kitId"/);
    expect(view.players[0]).not.toHaveProperty('lives');
  });
});
