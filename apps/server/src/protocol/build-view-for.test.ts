import { describe, expect, it } from 'vitest';

import { createInitialState } from '../engine/create-initial-state';
import { buildFinishedViewFor, buildLobbyViewFor, buildPlayingViewFor } from './build-view-for';
import { grantSpy } from './visibility-matrix';

describe('buildLobbyViewFor (L1-01)', () => {
  const seats = [
    { id: 'session-a', nickname: 'Alice', isBot: false },
    { id: 'session-b', nickname: 'Bob', isBot: false },
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

  it('exposes bot seats and difficulty to every recipient (L15-05)', () => {
    const withBot = [
      { id: 'session-a', nickname: 'Alice', isBot: false },
      {
        id: 'bot-1',
        nickname: 'Alpha',
        isBot: true,
        botDifficulty: 'hard' as const,
      },
    ];

    const view = buildLobbyViewFor({
      recipientSessionId: 'session-a',
      gameCode: 'ABCDEF',
      hostPlayerId: 'session-a',
      seats: withBot,
    });

    expect(view.players[1]).toMatchObject({
      id: 'bot-1',
      isBot: true,
      botDifficulty: 'hard',
    });
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

  it('includes the shared pool as public state (L20-03)', () => {
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
  it('omits playerReanimated.kitId unless self or Spy (designer 2026-08-06)', () => {
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
    expect(forSelf.actionLog[0]).toMatchObject({
      kind: 'playerReanimated',
      playerId: 'a',
      kitId: 'untouchable',
    });

    const forSpy = buildPlayingViewFor({
      recipientSessionId: 'b',
      gameCode: 'TEST',
      state,
      turnDeadlineMs: null,
      actionLog: log,
    });
    expect(forSpy.actionLog[0]).toMatchObject({
      kind: 'playerReanimated',
      playerId: 'a',
      kitId: 'untouchable',
    });

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
      kitId: 'ghost',
    });

    const forAlive = buildPlayingViewFor({
      recipientSessionId: 'c',
      gameCode: 'TEST',
      state,
      turnDeadlineMs: null,
      actionLog: log,
    });
    expect(forAlive.actionLog[0]).toMatchObject({ action: 'draw' });
    // Self still sees own reanimation kit.
    expect(forAlive.actionLog[1]).toMatchObject({
      kind: 'playerReanimated',
      playerId: 'c',
      kitId: 'ghost',
    });

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
