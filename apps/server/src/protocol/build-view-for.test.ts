import { describe, expect, it } from 'vitest';

import { createInitialState } from '../engine/create-initial-state';
import {
  buildFinishedViewFor,
  buildGameRecapView,
  buildLobbyViewFor,
  buildPlayingViewFor,
  fogBuyPoolCardPlayed,
} from './build-view-for';
import { grantSpy } from './visibility-matrix';

describe('buildLobbyViewFor (L1-01)', () => {
  const seats = [
    { id: 'session-a', nickname: 'Alice', isBot: false, isReady: true },
    { id: 'session-b', nickname: 'Bob', isBot: false, isReady: false },
  ] as const;

  it('tells the recipient which session is theirs', () => {
    const view = buildLobbyViewFor({
      recipientSessionId: 'session-b',
      gameCode: 'ABCDEF',
      hostPlayerId: 'session-a',
      seats,
      yourKitSelection: 'random',
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
        yourKitSelection: 'random',
      }),
    ).toThrow(/not in the room/);
  });

  it('builds a walk-in lobby view with claimable seats (L57-13)', () => {
    const view = buildLobbyViewFor({
      recipientSessionId: 'watcher',
      gameCode: 'ABCDEF',
      hostPlayerId: 'session-a',
      seats,
      yourKitSelection: 'random',
      isSpectator: true,
      claimableSeats: [{ playerId: 'session-b', nickname: 'Bob' }],
    });

    expect(view.isSpectator).toBe(true);
    expect(view.you).toBe('watcher');
    expect(view.claimableSeats).toEqual([{ playerId: 'session-b', nickname: 'Bob' }]);
  });

  it('exposes bot seats and difficulty to every recipient (L15-05)', () => {
    const withBot = [
      { id: 'session-a', nickname: 'Alice', isBot: false, isReady: true },
      {
        id: 'bot-1',
        nickname: 'Alpha',
        isBot: true,
        botDifficulty: 'hard' as const,
        isReady: true,
      },
    ];

    const view = buildLobbyViewFor({
      recipientSessionId: 'session-a',
      gameCode: 'ABCDEF',
      hostPlayerId: 'session-a',
      seats: withBot,
      yourKitSelection: 'random',
    });

    expect(view.players[1]).toMatchObject({
      id: 'bot-1',
      isBot: true,
      botDifficulty: 'hard',
    });
  });

  it('includes only the recipient kit pick (L49-01)', () => {
    const view = buildLobbyViewFor({
      recipientSessionId: 'session-a',
      gameCode: 'ABCDEF',
      hostPlayerId: 'session-a',
      seats,
      yourKitSelection: 'assassin',
    });

    expect(view.yourKitSelection).toBe('assassin');
    expect(view.players.every((seat) => !('kitId' in seat))).toBe(true);
    expect(JSON.stringify(view.players)).not.toContain('assassin');
  });

  it('does not leak another seat kit id into the recipient view (L49-01)', () => {
    const bobView = buildLobbyViewFor({
      recipientSessionId: 'session-b',
      gameCode: 'ABCDEF',
      hostPlayerId: 'session-a',
      seats,
      yourKitSelection: 'random',
    });

    expect(bobView.yourKitSelection).toBe('random');
    expect(JSON.stringify(bobView)).not.toContain('assassin');
    expect(JSON.stringify(bobView)).not.toContain('ghost');
  });

  it('copies public isReady onto every lobby seat (L57-07)', () => {
    const view = buildLobbyViewFor({
      recipientSessionId: 'session-b',
      gameCode: 'ABCDEF',
      hostPlayerId: 'session-a',
      seats,
      yourKitSelection: 'random',
    });

    expect(view.players.map((seat) => seat.isReady)).toEqual([true, false]);
  });
});

describe('buildPlayingViewFor (L15-05) — bot markers', () => {
  it('marks bot players for every recipient from seat metadata', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'bot-1', nickname: 'Alpha' },
      ],
      seed: 'bot-view',
    });

    const bots = new Map([['bot-1', 'easy' as const]]);
    const view = buildPlayingViewFor({
      recipientSessionId: 'a',
      gameCode: 'ABCDEF',
      state,
      turnDeadlineMs: null,
      actionLog: [],
      botDifficulties: bots,
    });

    const bot = view.players.find((player) => player.id === 'bot-1');
    const human = view.players.find((player) => player.id === 'a');

    expect(bot?.isBot).toBe(true);
    expect(bot?.botDifficulty).toBe('easy');
    expect(human?.isBot).toBe(false);
    expect(human?.botDifficulty).toBeUndefined();
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
    expect(JSON.stringify(view)).not.toContain('nextPoolInstanceSeq');
  });

  it('never includes nextPoolInstanceSeq (server-only)', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'pool-seq-view',
    });
    state.nextPoolInstanceSeq = 42;

    const view = buildPlayingViewFor({
      recipientSessionId: 'a',
      gameCode: 'ABCDEF',
      state,
      turnDeadlineMs: null,
      actionLog: [],
    });

    expect(JSON.stringify(view)).not.toContain('nextPoolInstanceSeq');
  });

  it('includes the shared pool occupancy as public state (L20-03 / L63-06)', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'pool-in-view',
    });
    state.pool.push({
      instanceId: 'pool-1',
      cardId: 'tax',
      isUpgraded: false,
    });

    const view = buildPlayingViewFor({
      recipientSessionId: 'a',
      gameCode: 'ABCDEF',
      state,
      turnDeadlineMs: null,
      actionLog: [],
    });

    expect(view.pool).toEqual([
      { instanceId: 'pool-1', cardId: 'tax', isUpgraded: false },
    ]);
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

  it('exposes poolBuyCost at 1 on a fresh game (L58-02)', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'l58-02-pool-cost',
    });
    expect(state.poolBuyCost).toBe(1);

    const view = buildPlayingViewFor({
      recipientSessionId: 'a',
      gameCode: 'ABCDEF',
      state,
      turnDeadlineMs: null,
      actionLog: [],
    });

    expect(view.poolBuyCost).toBe(1);
  });

  it('exposes empty pendingSentences on a fresh game', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'pending-sentences-empty',
    });
    expect(state.pendingSentences).toEqual([]);
    const view = buildPlayingViewFor({
      recipientSessionId: 'a',
      gameCode: 'ABCDEF',
      state,
      turnDeadlineMs: null,
      actionLog: [],
    });
    expect(view.pendingSentences).toEqual([]);
  });

  it('sets spyingOnYou only on seats that spy the recipient (L58-02)', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
        { id: 'c', nickname: 'Carol' },
      ],
      seed: 'l58-02-spying-on-you',
    });
    grantSpy(state, 'b', 'a', 'kit-and-cards');

    const aliceView = buildPlayingViewFor({
      recipientSessionId: 'a',
      gameCode: 'TEST',
      state,
      turnDeadlineMs: null,
      actionLog: [],
    });
    expect(aliceView.players.find((player) => player.id === 'b')?.spyingOnYou).toBe(true);
    expect(aliceView.players.find((player) => player.id === 'c')?.spyingOnYou).toBeUndefined();
    expect(aliceView.players.find((player) => player.id === 'a')?.spyingOnYou).toBeUndefined();

    const bobView = buildPlayingViewFor({
      recipientSessionId: 'b',
      gameCode: 'TEST',
      state,
      turnDeadlineMs: null,
      actionLog: [],
    });
    expect(bobView.players.find((player) => player.id === 'a')?.spyingOnYou).toBeUndefined();
  });

  it('omits spyingOnYou on dead viewers and spectator overlay (L58-07)', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
        { id: 'c', nickname: 'Carol' },
      ],
      seed: 'l58-07-spying-on-you',
    });
    grantSpy(state, 'b', 'a', 'kit-and-cards');
    const bob = state.players.find((player) => player.id === 'b');
    const carol = state.players.find((player) => player.id === 'c');
    if (bob === undefined || carol === undefined) {
      throw new Error('missing players');
    }

    bob.isEliminated = true;
    bob.lives = 0;
    bob.pendingReanimation = null;
    carol.isEliminated = true;
    carol.lives = 0;
    carol.pendingReanimation = null;

    const aliceView = buildPlayingViewFor({
      recipientSessionId: 'a',
      gameCode: 'TEST',
      state,
      turnDeadlineMs: null,
      actionLog: [],
    });
    expect(aliceView.players.find((player) => player.id === 'b')?.spyingOnYou).toBeUndefined();
    expect(aliceView.players.find((player) => player.id === 'c')?.spyingOnYou).toBeUndefined();

    const carolView = buildPlayingViewFor({
      recipientSessionId: 'c',
      gameCode: 'TEST',
      state,
      turnDeadlineMs: null,
      actionLog: [],
    });
    expect(carolView.players.find((player) => player.id === 'a')?.spyingOnYou).toBeUndefined();
    expect(carolView.players.find((player) => player.id === 'a')?.spied).toBeDefined();
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
      { id: 'imp-a', cardId: 'imposition', isUpgraded: true, counter: 2 , targetPlayerId: null},
    ];
    bob.activePersistentEffects = [
      { id: 'pg-b', cardId: 'points-generator', isUpgraded: false, counter: 3 , targetPlayerId: null},
    ];

    const view = buildPlayingViewFor({
      recipientSessionId: 'a',
      gameCode: 'ABCDEF',
      state,
      turnDeadlineMs: null,
      actionLog: [],
    });

    expect(view.self.activePersistentEffects).toEqual([
      { id: 'imp-a', cardId: 'imposition', isUpgraded: true, counter: 2 , targetPlayerId: null},
    ]);
    expect(view.players.find((p) => p.id === 'a')?.activePersistentEffects).toEqual([
      { id: 'imp-a', cardId: 'imposition', isUpgraded: true, counter: 2 , targetPlayerId: null},
    ]);
    expect(view.players.find((p) => p.id === 'b')?.activePersistentEffects).toEqual([
      { id: 'pg-b', cardId: 'points-generator', isUpgraded: false, counter: 3 , targetPlayerId: null},
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

describe('buildFinishedViewFor (L9-03 / L19-02)', () => {
  it('includes public recap aggregates; dead seats expose eliminationReveal', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'finished-recap',
    });
    const bob = state.players.find((player) => player.id === 'b');

    if (bob === undefined) {
      throw new Error('missing bob');
    }

    bob.isEliminated = true;
    bob.lives = 0;
    bob.eliminationSnapshot = {
      kitId: bob.kitId,
      hand: [{ instanceId: 'h1', cardId: 'basic-attack', isUpgraded: false }],
      specialCards: [],
      lives: 0,
      points: 3,
      upgradePoints: 1,
      shield: 0,
      shieldIsUpgraded: false,
      turnSequence: 2,
    };

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

    const alice = view.players.find((player) => player.id === 'a');
    const bobView = view.players.find((player) => player.id === 'b');
    expect(alice).not.toHaveProperty('lives');
    expect(alice?.eliminationReveal).toBeUndefined();
    expect(bobView?.eliminationReveal).toMatchObject({
      kitId: bob.kitId,
      points: 3,
      upgradePoints: 1,
      hand: [{ instanceId: 'h1', cardId: 'basic-attack', isUpgraded: false }],
    });
    expect(view.exportLog.events).toHaveLength(3);
    expect(view.exportLog.turns).toEqual([]);
    expect(view.finalTable.phase).toBe('playing');
    expect(view.finalTable.you).toBe('a');
    expect(view.finalTable.gameCode).toBe('ABCDEF');
    expect(view.finalTable.turnDeadlineMs).toBeNull();
    expect(view.finalTable.self.kitId).toBeDefined();
    expect(view.finalTable.players.find((p) => p.id === 'b')?.eliminationReveal).toMatchObject({
      kitId: bob.kitId,
      points: 3,
    });
  });
});

describe('buildPlayingViewFor (L19-02) — elimination reveal', () => {
  it('exposes eliminationReveal to unspied recipients without Spy relations', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'elim-reveal-view',
    });
    const bob = state.players.find((player) => player.id === 'b');

    if (bob === undefined) {
      throw new Error('missing bob');
    }

    bob.isEliminated = true;
    bob.lives = 0;
    bob.eliminationSnapshot = {
      kitId: bob.kitId,
      hand: [{ instanceId: 'x1', cardId: 'strong-attack', isUpgraded: false }],
      specialCards: [{ instanceId: 's1', cardId: 'suicide', isUpgraded: false }],
      lives: 0,
      points: 12,
      upgradePoints: 0,
      shield: 2,
      shieldIsUpgraded: true,
      turnSequence: 5,
    };
    bob.hand = [];
    bob.specialCards = [];

    const view = buildPlayingViewFor({
      recipientSessionId: 'a',
      gameCode: 'ABCDEF',
      state,
      turnDeadlineMs: null,
      actionLog: [],
    });

    const bobView = view.players.find((player) => player.id === 'b');
    expect(bobView?.spied).toBeUndefined();
    expect(bobView?.eliminationReveal).toMatchObject({
      kitId: bob.kitId,
      points: 12,
      shield: 2,
      shieldIsUpgraded: true,
      hand: [{ instanceId: 'x1', cardId: 'strong-attack', isUpgraded: false }],
      specialCards: [{ instanceId: 's1', cardId: 'suicide', isUpgraded: false }],
    });
  });
});

describe('buildPlayingViewFor — reanimation kit privacy', () => {
  it('omits playerReanimated.kitId for every recipient (L50-03)', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
        { id: 'c', nickname: 'Carol' },
      ],
      seed: 'reanim-kit-log-spy',
    });
    grantSpy(state, 'b', 'a', 'kit-and-cards');

    const log = [
      {
        kind: 'playerReanimated' as const,
        playerId: 'a',
        kitId: 'untouchable' as const,
        turnSequence: 3,
      },
    ];

    const forSelf = buildPlayingViewFor({
      recipientSessionId: 'a',
      gameCode: 'TEST',
      state,
      turnDeadlineMs: null,
      actionLog: log,
    });
    expect(forSelf.actionLog[0]).toEqual({
      kind: 'playerReanimated',
      playerId: 'a',
      turnSequence: 3,
    });
    expect(forSelf.actionLog[0]).not.toHaveProperty('kitId');

    const forSpy = buildPlayingViewFor({
      recipientSessionId: 'b',
      gameCode: 'TEST',
      state,
      turnDeadlineMs: null,
      actionLog: log,
    });
    expect(forSpy.actionLog[0]).toEqual({
      kind: 'playerReanimated',
      playerId: 'a',
      turnSequence: 3,
    });
    expect(forSpy.actionLog[0]).not.toHaveProperty('kitId');

    const forOther = buildPlayingViewFor({
      recipientSessionId: 'c',
      gameCode: 'TEST',
      state,
      turnDeadlineMs: null,
      actionLog: log,
    });
    expect(forOther.actionLog[0]).toEqual({
      kind: 'playerReanimated',
      playerId: 'a',
      turnSequence: 3,
    });
    expect(forOther.actionLog[0]).not.toHaveProperty('kitId');
  });
});

describe('buildPlayingViewFor — eliminated spectator (designer 2026-08-06)', () => {
  it('grants upgraded-Spy vision of every other seat without matrix rows', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
        { id: 'c', nickname: 'Carol' },
      ],
      seed: 'elim-spectator-full',
      kitAssignment: ['untouchable', 'warrior', 'duplicator'],
    });
    const alice = state.players.find((player) => player.id === 'a');
    const bob = state.players.find((player) => player.id === 'b');
    const carol = state.players.find((player) => player.id === 'c');
    expect(alice).toBeDefined();
    expect(bob).toBeDefined();
    expect(carol).toBeDefined();
    if (alice === undefined || bob === undefined || carol === undefined) {
      return;
    }

    alice.isEliminated = true;
    alice.lives = 0;
    alice.pendingReanimation = null;
    alice.eliminationSnapshot = {
      kitId: alice.kitId,
      hand: alice.hand.map((card) => ({ ...card })),
      specialCards: alice.specialCards.map((card) => ({ ...card })),
      lives: 0,
      points: alice.points,
      upgradePoints: alice.upgradePoints,
      shield: alice.shield,
      shieldIsUpgraded: alice.shieldIsUpgraded,
      turnSequence: 1,
    };

    bob.lives = 17;
    bob.points = 9;
    bob.upgradePoints = 2;
    bob.shield = 3;
    bob.duplicationActive = true;

    carol.isEliminated = true;
    carol.lives = 0;
    carol.pendingReanimation = null;
    carol.eliminationSnapshot = {
      kitId: carol.kitId,
      hand: carol.hand.map((card) => ({ ...card })),
      specialCards: [],
      lives: 0,
      points: carol.points,
      upgradePoints: 0,
      shield: 0,
      shieldIsUpgraded: false,
      turnSequence: 2,
    };

    const view = buildPlayingViewFor({
      recipientSessionId: 'a',
      gameCode: 'TEST',
      state,
      turnDeadlineMs: null,
      actionLog: [],
    });

    expect(state.visibility).toEqual([]);

    const bobView = view.players.find((player) => player.id === 'b');
    expect(bobView?.spied).toEqual({
      kitId: bob.kitId,
      hand: bob.hand.map((card) => ({ ...card })),
      specialCards: bob.specialCards.map((card) => ({ ...card })),
      lives: 17,
      points: 9,
      upgradePoints: 2,
      shield: 3,
    });
    expect(bobView?.duplicationActive).toBe(true);

    const carolView = view.players.find((player) => player.id === 'c');
    expect(carolView?.spied).toMatchObject({
      kitId: carol.kitId,
      lives: 0,
      points: carol.points,
    });
  });

  it('does not grant vision while pendingReanimation is set', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'elim-spectator-pending',
    });
    const alice = state.players.find((player) => player.id === 'a');
    const bob = state.players.find((player) => player.id === 'b');
    expect(alice).toBeDefined();
    expect(bob).toBeDefined();
    if (alice === undefined || bob === undefined) {
      return;
    }

    alice.isEliminated = true;
    alice.lives = 0;
    alice.pendingReanimation = { isUpgraded: false };
    bob.lives = 12;

    const view = buildPlayingViewFor({
      recipientSessionId: 'a',
      gameCode: 'TEST',
      state,
      turnDeadlineMs: null,
      actionLog: [],
    });

    expect(view.players.find((player) => player.id === 'b')?.spied).toBeUndefined();
  });

  it('drops spectator vision after revive (alive again)', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'elim-spectator-revived',
    });
    const alice = state.players.find((player) => player.id === 'a');
    expect(alice).toBeDefined();
    if (alice === undefined) {
      return;
    }

    alice.isEliminated = false;
    alice.lives = 5;
    alice.pendingReanimation = null;

    const view = buildPlayingViewFor({
      recipientSessionId: 'a',
      gameCode: 'TEST',
      state,
      turnDeadlineMs: null,
      actionLog: [],
    });

    expect(view.players.find((player) => player.id === 'b')?.spied).toBeUndefined();
  });

  it('reveals Spy-gated log lines to eliminated spectators', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
        { id: 'c', nickname: 'Carol' },
      ],
      seed: 'elim-spectator-log',
    });
    const alice = state.players.find((player) => player.id === 'a');
    expect(alice).toBeDefined();
    if (alice === undefined) {
      return;
    }

    alice.isEliminated = true;
    alice.lives = 0;
    alice.pendingReanimation = null;
    alice.eliminationSnapshot = {
      kitId: alice.kitId,
      hand: alice.hand.map((card) => ({ ...card })),
      specialCards: alice.specialCards.map((card) => ({ ...card })),
      lives: 0,
      points: alice.points,
      upgradePoints: alice.upgradePoints,
      shield: alice.shield,
      shieldIsUpgraded: alice.shieldIsUpgraded,
      turnSequence: 1,
    };

    const log = [
      {
        kind: 'actionPlayed' as const,
        actorPlayerId: 'b',
        action: 'activateDuplication' as const,
        turnSequence: 4,
      },
      {
        kind: 'playerReanimated' as const,
        playerId: 'c',
        kitId: 'ghost' as const,
        turnSequence: 5,
      },
    ];

    const forSpectator = buildPlayingViewFor({
      recipientSessionId: 'a',
      gameCode: 'TEST',
      state,
      turnDeadlineMs: null,
      actionLog: log,
    });
    expect(forSpectator.actionLog[0]).toMatchObject({
      action: 'activateDuplication',
    });
      expect(forSpectator.actionLog[1]).toMatchObject({
        kind: 'playerReanimated',
        playerId: 'c',
      })
      expect(forSpectator.actionLog[1]).not.toHaveProperty('kitId');
    expect(forSpectator.actionLog[1]).not.toHaveProperty('kitId');

    const forAlive = buildPlayingViewFor({
      recipientSessionId: 'c',
      gameCode: 'TEST',
      state,
      turnDeadlineMs: null,
      actionLog: log,
    });
    expect(forAlive.actionLog[0]).toMatchObject({ action: 'draw' });
    expect(forAlive.actionLog[1]).toMatchObject({
      kind: 'playerReanimated',
      playerId: 'c',
    });
    expect(forAlive.actionLog[1]).not.toHaveProperty('kitId');

    const forOtherAlive = buildPlayingViewFor({
      recipientSessionId: 'b',
      gameCode: 'TEST',
      state,
      turnDeadlineMs: null,
      actionLog: log,
    });
    expect(forOtherAlive.actionLog[1]).toEqual({
      kind: 'playerReanimated',
      playerId: 'c',
      turnSequence: 5,
    });
    expect(forOtherAlive.actionLog[1]).not.toHaveProperty('kitId');
  });
});

describe('buildPlayingViewFor (L41-03 / technical spec v6 §8)', () => {
  const seats = [
    { id: 'a', nickname: 'Alice' },
    { id: 'b', nickname: 'Bob' },
  ] as const;

  it('defaults omitted overlay to classic and null (pre-V6 start)', () => {
    const state = createInitialState({ seats, seed: 'l41-03-default' });
    const view = buildPlayingViewFor({
      recipientSessionId: 'a',
      gameCode: 'ABCDEF',
      state,
      turnDeadlineMs: null,
      actionLog: [],
    });

    expect(view.playKind).toBe('classic');
    expect(view.tutorialIndex).toBeNull();
    expect(view.players.find((player) => player.id === 'b')?.spied).toBeUndefined();
  });

  it('round-trips explicit tutorial overlay on playing and finished views', () => {
    const state = createInitialState({ seats, seed: 'l41-03-tutorial' });
    const overlay = { playKind: 'tutorial' as const, tutorialIndex: 0 };

    const playing = buildPlayingViewFor({
      recipientSessionId: 'a',
      gameCode: 'ABCDEF',
      state,
      turnDeadlineMs: null,
      actionLog: [],
      ...overlay,
    });

    expect(playing.playKind).toBe('tutorial');
    expect(playing.tutorialIndex).toBe(0);

    const finished = buildFinishedViewFor({
      recipientSessionId: 'a',
      gameCode: 'ABCDEF',
      state,
      winnerPlayerId: 'a',
      actionLog: [],
      eliminations: [],
      ...overlay,
    });

    expect(finished.playKind).toBe('tutorial');
    expect(finished.tutorialIndex).toBe(0);
    expect(finished.finalTable.playKind).toBe('tutorial');
    expect(finished.finalTable.tutorialIndex).toBe(0);
  });

  it('never includes the game seed or nextPoolInstanceSeq', () => {
    const state = createInitialState({ seats, seed: 'secret-seed-value' });
    state.nextPoolInstanceSeq = 42;

    const playing = buildPlayingViewFor({
      recipientSessionId: 'a',
      gameCode: 'ABCDEF',
      state,
      turnDeadlineMs: null,
      actionLog: [],
      playKind: 'tutorial',
      tutorialIndex: 0,
    });
    const finished = buildFinishedViewFor({
      recipientSessionId: 'a',
      gameCode: 'ABCDEF',
      state,
      winnerPlayerId: 'a',
      actionLog: [],
      eliminations: [],
      playKind: 'tutorial',
      tutorialIndex: 0,
    });

    const playingJson = JSON.stringify(playing);
    const finishedJson = JSON.stringify(finished);

    expect(playingJson).not.toContain('secret-seed-value');
    expect(playingJson).not.toContain('nextPoolInstanceSeq');
    expect(finishedJson).not.toContain('secret-seed-value');
    expect(finishedJson).not.toContain('nextPoolInstanceSeq');
  });
});

describe('buildPlayingViewFor — walk-in spectator (L57-13 / L57-16)', () => {
  it('marks isSpectator without Spy kits while a claim picker is open', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'walk-in-spy',
      kitAssignment: ['untouchable', 'warrior'],
    });
    const bob = state.players.find((player) => player.id === 'b');
    expect(bob).toBeDefined();
    if (bob === undefined) {
      return;
    }

    bob.lives = 14;
    bob.points = 6;

    const view = buildPlayingViewFor({
      recipientSessionId: 'watcher',
      gameCode: 'WATCH',
      state,
      turnDeadlineMs: null,
      actionLog: [],
      walkInSpectator: true,
      claimableSeats: [{ playerId: 'a', nickname: 'Alice' }],
    });

    expect(view.isSpectator).toBe(true);
    expect(view.you).toBe('watcher');
    expect(view.players.every((player) => !player.isYou)).toBe(true);
    expect(view.claimableSeats).toEqual([{ playerId: 'a', nickname: 'Alice' }]);
    expect(view.players.find((player) => player.id === 'b')?.spied).toBeUndefined();
    expect(state.visibility).toEqual([]);
  });

  it('grants the eliminated-spectator overlay after Stay spectating', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'walk-in-stay',
      kitAssignment: ['untouchable', 'warrior'],
    });
    const bob = state.players.find((player) => player.id === 'b');
    expect(bob).toBeDefined();
    if (bob === undefined) {
      return;
    }

    bob.lives = 14;
    bob.points = 6;

    const view = buildPlayingViewFor({
      recipientSessionId: 'watcher',
      gameCode: 'WATCH',
      state,
      turnDeadlineMs: null,
      actionLog: [],
      walkInSpectator: true,
      walkInSeesPrivate: true,
      claimableSeats: [{ playerId: 'a', nickname: 'Alice' }],
    });

    expect(view.players.find((player) => player.id === 'b')?.spied).toMatchObject({
      kitId: bob.kitId,
      lives: 14,
      points: 6,
    });
  });
});

describe('buildGameRecapView (L60-04)', () => {
  it('fills match totals, log counts, kitId, isBot, and think time', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'l59-04-fill',
      kitAssignment: ['untouchable', 'warrior'],
    });
    const alice = state.players.find((player) => player.id === 'a');
    const bob = state.players.find((player) => player.id === 'b');

    if (alice === undefined || bob === undefined) {
      throw new Error('missing seats');
    }

    alice.matchStats.livesLost = 2;
    alice.matchStats.livesGained = 4;
    alice.matchStats.pointsSpent = 11;
    alice.matchStats.pointsGained = 8;
    alice.matchStats.upgradePointsSpent = 1;

    const recap = buildGameRecapView(
      state,
      [
        {
          kind: 'actionPlayed',
          actorPlayerId: 'a',
          action: 'playCard',
          cardId: 'basic-attack',
          targetPlayerId: 'b',
          turnSequence: 1,
        },
        {
          kind: 'actionPlayed',
          actorPlayerId: 'a',
          action: 'buyPoolCard',
          cardId: 'tax',
          turnSequence: 2,
        },
        {
          kind: 'actionPlayed',
          actorPlayerId: 'a',
          action: 'draw',
          turnSequence: 3,
        },
        {
          kind: 'actionPlayed',
          actorPlayerId: 'a',
          action: 'activateDuplication',
          turnSequence: 4,
        },
        {
          kind: 'actionResolved',
          effectId: 'e1',
          sourcePlayerId: 'a',
          targetPlayerId: 'b',
          cardId: 'basic-attack',
          isUpgraded: false,
          livesLost: 2,
          shieldAbsorbed: 0,
          outcome: 'applied',
          turnSequence: 5,
        },
        {
          kind: 'playerEliminated',
          playerId: 'b',
          eliminatorPlayerId: 'a',
          reason: 'combat',
          turnSequence: 5,
        },
      ],
      [{ playerId: 'b', eliminatorPlayerId: 'a', reason: 'combat' }],
      {
        botDifficulties: new Map([['b', 'easy']]),
        thinkTimeMsByPlayerId: new Map([['a', 1_500]]),
      },
    );

    expect(recap.players.find((row) => row.playerId === 'a')).toEqual({
      playerId: 'a',
      cardsPlayedCount: 1,
      buyCount: 1,
      sellCount: 0,
      upgradeCount: 0,
      kitId: alice.kitId,
      isBot: false,
      livesLost: 2,
      livesGained: 4,
      pointsSpent: 11,
      pointsGained: 8,
      upgradePointsSpent: 1,
      specialsPlayedCount: 0,
      buyCardCount: 1,
      sellCardCount: 0,
      drawCount: 1,
      attacksPlayedCount: 1,
      damageDealt: 2,
      kills: 1,
      thinkTimeMs: 1_500,
    });
    expect(recap.players.find((row) => row.playerId === 'b')).toMatchObject({
      kitId: bob.kitId,
      isBot: true,
      thinkTimeMs: 0,
      kills: 0,
    });
  });

  it('omits kitId when asked (L57-16 fog) without changing numbers', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'l59-04-fog-helper',
      kitAssignment: ['untouchable', 'warrior'],
    });

    const open = buildGameRecapView(state, [], [], { omitKitId: true });
    const seated = buildGameRecapView(state, [], []);

    expect(open.players.every((row) => !('kitId' in row))).toBe(true);
    expect(seated.players.every((row) => typeof row.kitId === 'string')).toBe(true);
    expect(open.players.map((row) => row.playerId)).toEqual(seated.players.map((row) => row.playerId));
    expect(open.players.map((row) => row.thinkTimeMs)).toEqual(
      seated.players.map((row) => row.thinkTimeMs),
    );
  });
});

describe('buildFinishedViewFor (L60-04)', () => {
  const finishedLog = [
    {
      kind: 'actionPlayed' as const,
      actorPlayerId: 'a',
      action: 'playCard' as const,
      cardId: 'basic-attack' as const,
      targetPlayerId: 'b',
      turnSequence: 1,
    },
    {
      kind: 'actionResolved' as const,
      effectId: 'e1',
      sourcePlayerId: 'a',
      targetPlayerId: 'b',
      cardId: 'basic-attack' as const,
      isUpgraded: false,
      livesLost: 1,
      shieldAbsorbed: 0,
      outcome: 'applied' as const,
      turnSequence: 2,
    },
  ];

  it('publishes identical recap numbers to both seated recipients', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'l59-04-identical',
      kitAssignment: ['untouchable', 'warrior'],
    });

    const input = {
      gameCode: 'ABCDEF',
      state,
      winnerPlayerId: 'a',
      actionLog: finishedLog,
      eliminations: [] as const,
      thinkTimeMsByPlayerId: new Map([
        ['a', 400],
        ['b', 900],
      ]),
    };
    const forA = buildFinishedViewFor({ ...input, recipientSessionId: 'a' });
    const forB = buildFinishedViewFor({ ...input, recipientSessionId: 'b' });

    expect(forA.recap.players).toEqual(forB.recap.players);
    expect(forA.recap.players[0]?.kitId).toBeDefined();
  });

  it('omits recap kitId for a fogged walk-in and keeps it after Stay', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'l59-04-walk-in',
      kitAssignment: ['untouchable', 'warrior'],
    });
    const alice = state.players.find((player) => player.id === 'a');

    if (alice === undefined) {
      throw new Error('missing alice');
    }

    const fogged = buildFinishedViewFor({
      recipientSessionId: 'watcher',
      gameCode: 'WATCH',
      state,
      winnerPlayerId: 'a',
      actionLog: finishedLog,
      eliminations: [],
      walkInSpectator: true,
    });
    const stayed = buildFinishedViewFor({
      recipientSessionId: 'watcher',
      gameCode: 'WATCH',
      state,
      winnerPlayerId: 'a',
      actionLog: finishedLog,
      eliminations: [],
      walkInSpectator: true,
      walkInSeesPrivate: true,
    });

    expect(fogged.recap.players.every((row) => !('kitId' in row))).toBe(true);
    expect(stayed.recap.players.find((row) => row.playerId === 'a')?.kitId).toBe(alice.kitId);
    expect(fogged.recap.players.map((row) => row.damageDealt)).toEqual(
      stayed.recap.players.map((row) => row.damageDealt),
    );
  });
});

describe('buyPoolCard log fog (L63-06)', () => {
  const poolBuyLog = [
    {
      kind: 'actionPlayed' as const,
      actorPlayerId: 'a',
      action: 'buyPoolCard' as const,
      cardId: 'tax' as const,
      isUpgraded: false,
      turnSequence: 1,
    },
  ];

  it('omits cardId and isUpgraded unless the recipient sees the buyer', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
        { id: 'c', nickname: 'Carol' },
      ],
      seed: 'l63-06-pool-fog',
      kitAssignment: ['untouchable', 'warrior', 'kamikaze'],
    });
    const carol = state.players.find((player) => player.id === 'c');
    expect(carol).toBeDefined();
    if (carol === undefined) {
      return;
    }

    carol.isEliminated = true;
    carol.lives = 0;
    carol.pendingReanimation = null;

    const forBuyer = buildPlayingViewFor({
      recipientSessionId: 'a',
      gameCode: 'TEST',
      state,
      turnDeadlineMs: null,
      actionLog: poolBuyLog,
    });
    expect(forBuyer.actionLog[0]).toEqual(poolBuyLog[0]);

    const forOther = buildPlayingViewFor({
      recipientSessionId: 'b',
      gameCode: 'TEST',
      state,
      turnDeadlineMs: null,
      actionLog: poolBuyLog,
    });
    expect(forOther.actionLog[0]).toEqual({
      kind: 'actionPlayed',
      actorPlayerId: 'a',
      action: 'buyPoolCard',
      turnSequence: 1,
    });
    expect(forOther.actionLog[0]).not.toHaveProperty('cardId');
    expect(forOther.actionLog[0]).not.toHaveProperty('isUpgraded');

    grantSpy(state, 'b', 'a', 'kit-and-cards');
    const forSpy = buildPlayingViewFor({
      recipientSessionId: 'b',
      gameCode: 'TEST',
      state,
      turnDeadlineMs: null,
      actionLog: poolBuyLog,
    });
    expect(forSpy.actionLog[0]).toEqual(poolBuyLog[0]);

    const forElim = buildPlayingViewFor({
      recipientSessionId: 'c',
      gameCode: 'TEST',
      state,
      turnDeadlineMs: null,
      actionLog: poolBuyLog,
    });
    expect(forElim.actionLog[0]).toEqual(poolBuyLog[0]);
  });

  it('keeps recovered-card identity on Excel exportLog', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'l63-06-export',
      kitAssignment: ['untouchable', 'warrior'],
    });
    const finished = buildFinishedViewFor({
      recipientSessionId: 'b',
      gameCode: 'TEST',
      state,
      winnerPlayerId: 'a',
      actionLog: poolBuyLog,
      eliminations: [],
    });

    expect(finished.exportLog.events[0]).toEqual(poolBuyLog[0]);
    expect(finished.finalTable.actionLog[0]).toEqual({
      kind: 'actionPlayed',
      actorPlayerId: 'a',
      action: 'buyPoolCard',
      turnSequence: 1,
    });
    expect(finished.finalTable.actionLog[0]).not.toHaveProperty('cardId');
  });

  it('fogs a walk-in until Stay and drops live ACTION_PLAYED identity', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'l63-06-walk-in',
      kitAssignment: ['untouchable', 'warrior'],
    });
    const foggedWalkIn = buildPlayingViewFor({
      recipientSessionId: 'watcher',
      gameCode: 'WATCH',
      state,
      turnDeadlineMs: null,
      actionLog: poolBuyLog,
      walkInSpectator: true,
      claimableSeats: [{ playerId: 'a', nickname: 'Alice' }],
    });
    const stayed = buildPlayingViewFor({
      recipientSessionId: 'watcher',
      gameCode: 'WATCH',
      state,
      turnDeadlineMs: null,
      actionLog: poolBuyLog,
      walkInSpectator: true,
      walkInSeesPrivate: true,
      claimableSeats: [{ playerId: 'a', nickname: 'Alice' }],
    });

    expect(foggedWalkIn.actionLog[0]).not.toHaveProperty('cardId');
    expect(stayed.actionLog[0]).toEqual(poolBuyLog[0]);

    const live = {
      actorPlayerId: 'a',
      action: 'buyPoolCard' as const,
      cardId: 'tax' as const,
      isUpgraded: false,
      turnSequence: 1,
    };
    expect(fogBuyPoolCardPlayed(live)).toEqual({
      actorPlayerId: 'a',
      action: 'buyPoolCard',
      turnSequence: 1,
    });
    expect(fogBuyPoolCardPlayed(live)).not.toHaveProperty('cardId');
    expect(fogBuyPoolCardPlayed(live)).not.toHaveProperty('isUpgraded');
  });
});

describe('pool-list faces (L63-06)', () => {
  it('shows sitting pool cards to every recipient; occupancy stays public', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'l63-06-pool-list',
      kitAssignment: ['untouchable', 'warrior'],
    });
    state.pool.push({
      instanceId: 'pool-secret',
      cardId: 'poison',
      isUpgraded: true,
    });

    const forA = buildPlayingViewFor({
      recipientSessionId: 'a',
      gameCode: 'TEST',
      state,
      turnDeadlineMs: null,
      actionLog: [],
    });
    const forB = buildPlayingViewFor({
      recipientSessionId: 'b',
      gameCode: 'TEST',
      state,
      turnDeadlineMs: null,
      actionLog: [],
    });

    const face = {
      instanceId: 'pool-secret',
      cardId: 'poison' as const,
      isUpgraded: true,
    };
    expect(forA.pool).toEqual([face]);
    expect(forB.pool).toEqual([face]);
  });

  it('keeps pool faces for the pool-pick chooser and everyone else', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'l63-06-pool-pick',
      kitAssignment: ['untouchable', 'warrior'],
    });
    state.pool.push({
      instanceId: 'pool-pick-1',
      cardId: 'tax',
      isUpgraded: false,
    });
    state.subChoice = {
      kind: 'pool-pick',
      playerId: 'a',
      maxCount: 1,
      eligibleInstanceIds: ['pool-pick-1'],
      cardIsUpgraded: true,
      deadlineMs: 1,
    };

    const chooser = buildPlayingViewFor({
      recipientSessionId: 'a',
      gameCode: 'TEST',
      state,
      turnDeadlineMs: null,
      actionLog: [],
    });
    const other = buildPlayingViewFor({
      recipientSessionId: 'b',
      gameCode: 'TEST',
      state,
      turnDeadlineMs: null,
      actionLog: [],
    });

    expect(chooser.pool).toEqual([
      { instanceId: 'pool-pick-1', cardId: 'tax', isUpgraded: false },
    ]);
    expect(other.pool).toEqual([
      { instanceId: 'pool-pick-1', cardId: 'tax', isUpgraded: false },
    ]);
  });

  it('still fogs buyPoolCard identity while pool faces stay public', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'l63-06-faces-and-buy',
      kitAssignment: ['untouchable', 'warrior'],
    });
    state.pool.push(
      { instanceId: 'pool-poison', cardId: 'poison', isUpgraded: true },
      { instanceId: 'pool-tax', cardId: 'tax', isUpgraded: false },
    );

    const beforeBuy = buildPlayingViewFor({
      recipientSessionId: 'b',
      gameCode: 'TEST',
      state,
      turnDeadlineMs: null,
      actionLog: [],
    });
    expect(beforeBuy.pool).toEqual([
      { instanceId: 'pool-poison', cardId: 'poison', isUpgraded: true },
      { instanceId: 'pool-tax', cardId: 'tax', isUpgraded: false },
    ]);

    state.pool = state.pool.filter((card) => card.instanceId !== 'pool-poison');

    const afterBuy = buildPlayingViewFor({
      recipientSessionId: 'b',
      gameCode: 'TEST',
      state,
      turnDeadlineMs: null,
      actionLog: [
        {
          kind: 'actionPlayed',
          actorPlayerId: 'a',
          action: 'buyPoolCard',
          cardId: 'poison',
          isUpgraded: true,
          turnSequence: 1,
        },
      ],
    });
    expect(afterBuy.pool).toEqual([
      { instanceId: 'pool-tax', cardId: 'tax', isUpgraded: false },
    ]);
    expect(afterBuy.actionLog[0]).not.toHaveProperty('cardId');
    expect(afterBuy.actionLog[0]).not.toHaveProperty('isUpgraded');
  });
});

describe('buildPlayingViewFor (L64-01) — public drawGain', () => {
  it('exposes a living Gambler drawGain to every recipient and omits it for other kits', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'l64-01-draw-gain',
      kitAssignment: ['gambler', 'kamikaze'],
    });
    const gambler = state.players.find((player) => player.kitId === 'gambler');
    const other = state.players.find((player) => player.kitId === 'kamikaze');
    expect(gambler).toBeDefined();
    expect(other).toBeDefined();
    if (gambler === undefined || other === undefined) {
      return;
    }

    gambler.drawGain = 47;

    const forSelf = buildPlayingViewFor({
      recipientSessionId: gambler.id,
      gameCode: 'ABCDEF',
      state,
      turnDeadlineMs: null,
      actionLog: [],
    });
    const forOpponent = buildPlayingViewFor({
      recipientSessionId: other.id,
      gameCode: 'ABCDEF',
      state,
      turnDeadlineMs: null,
      actionLog: [],
    });

    expect(forSelf.players.find((player) => player.id === gambler.id)?.drawGain).toBe(47);
    expect(forOpponent.players.find((player) => player.id === gambler.id)?.drawGain).toBe(
      47,
    );
    expect(forSelf.players.find((player) => player.id === other.id)?.drawGain).toBeUndefined();
    expect(
      'drawGain' in (forSelf.players.find((player) => player.id === other.id) ?? {}),
    ).toBe(false);
  });
});
