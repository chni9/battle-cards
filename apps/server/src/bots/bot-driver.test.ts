import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PlayingStateView } from '@card-battle/shared';

import { BotDriver, type BotDriverHost } from './bot-driver';
import { SyncSearchPool } from './search/worker/sync-pool';
import { readBotThinkMs } from './bot-think-ms';
import { classifyRewardRoute, classifyTurnEntry } from './turn-entry';
import type { HumanSeat, BotSeat } from '../rooms/seats';
import type { TurnAction } from '../engine/turn/perform-action';

function human(sessionId: string): HumanSeat {
  return { kind: 'human', sessionId, nickname: 'Host' };
}

function bot(sessionId: string): BotSeat {
  return { kind: 'bot', sessionId, nickname: 'Alpha', difficulty: 'normal' };
}

function emptyView(you: string): PlayingStateView {
  return {
    phase: 'playing',
    you,
    gameCode: 'TEST',
    currentTurnPlayerId: you,
    turnSequence: 0,
    turnOrder: [you],
    turnDeadlineMs: null,
    players: [
      {
        id: you,
        nickname: 'Bot',
        isEliminated: false,
        isYou: true,
        isBot: true,
        botDifficulty: 'hard',
        connection: {
          status: 'connected',
          disconnectedAt: null,
          automaticTurnsTaken: 0,
          consecutiveTimeouts: 0,
        },
        activePersistentEffects: [],
        activeShield: null,
        blockTurnsRemaining: 0,
        blockAttacksForbidden: false,
        activeAttackBlock: null,
        duplicationActive: false,
        pendingReanimation: null,
        absorbWindowOpen: false,
      },
    ],
    self: {
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
    },
    pendingEffects: [],
    actionLog: [],
    pool: [],
    playKind: 'classic',
    tutorialIndex: null,
  };
}

describe('turn entry classification (L15-04)', () => {
  it('classifies bot before connection status', () => {
    expect(classifyTurnEntry(bot('b1'), 'absent')).toBe('bot');
    expect(classifyTurnEntry(bot('b1'), 'disconnected')).toBe('bot');
    expect(classifyTurnEntry(bot('b1'), 'connected')).toBe('bot');
  });

  it('classifies human absent and disconnected', () => {
    expect(classifyTurnEntry(human('h1'), 'absent')).toBe('absent');
    expect(classifyTurnEntry(human('h1'), 'disconnected')).toBe('disconnected');
    expect(classifyTurnEntry(human('h1'), 'connected')).toBe('human');
  });

  it('routes rewards: bot vs human-client vs human-dropped', () => {
    expect(classifyRewardRoute(bot('b1'), false)).toBe('bot');
    expect(classifyRewardRoute(human('h1'), true)).toBe('human-client');
    expect(classifyRewardRoute(human('h1'), false)).toBe('human-dropped');
  });
});

describe('readBotThinkMs (L15-04)', () => {
  afterEach(() => {
    delete process.env['BOT_THINK_MS'];
  });

  it('defaults to 900', () => {
    delete process.env['BOT_THINK_MS'];
    expect(readBotThinkMs()).toBe(900);
  });

  it('accepts 0 without falling back (no 5000 clamp)', () => {
    process.env['BOT_THINK_MS'] = '0';
    expect(readBotThinkMs()).toBe(0);
  });

  it('accepts sub-5000 values', () => {
    process.env['BOT_THINK_MS'] = '50';
    expect(readBotThinkMs()).toBe(50);
  });
});

describe('BotDriver (L16-06)', () => {
  it('schedules decideAndAct via setTimeout and performs an action', async () => {
    const performed: TurnAction[] = [];
    const host: BotDriverHost = {
      isBotSeat: (id) => id.startsWith('bot-'),
      getGameState: () =>
        ({
          currentTurnPlayerId: 'bot-1',
          players: [
            {
              id: 'bot-1',
              nickname: 'A',
              kitId: 'assassin',
              lives: 10,
              points: 0,
              upgradePoints: 0,
              shield: 0,
              shieldIsUpgraded: false,
              hand: [],
              specialCards: [],
              pendingEffects: [],
              activePersistentEffects: [],
              turnLedger: {
                livesLost: 0,
                pointsSpent: 0,
                upgradePointsSpent: 0,
                pointsLostToTheft: 0,
                upgradePointsLostToTheft: 0,
              },
              connectionState: {
                status: 'connected',
                disconnectedAt: null,
                automaticTurnsTaken: 0,
                consecutiveTimeouts: 0,
              },
              isEliminated: false,
              blockTurnsRemaining: 0,
        blockAttacksForbidden: false,
              attackBlockCharges: 0,
              eliminationSnapshot: null,
              pendingReanimation: null,
        absorbWindowOpen: false,
            },
          ],
          seed: 'driver-seed',
          turnSequence: 1,
          mode: 'classic',
          lifeLimit: 25,
          pool: [],
          visibility: [],
          mirrorChoice: null,
          stealChoice: null,
          subChoice: null,
          eliminationContributors: [],
          rewardQueue: [],
          rewardChoice: null,
        }) as never,
      isGameOver: () => false,
      getPlayingView: () => emptyView('bot-1'),
      getActionLog: () => [],
      getBotDifficulty: () => 'hard',
      performBotAction: (_id, action) => {
        performed.push(action);
      },
      performBotDraw: () => {
        performed.push({ type: 'draw' });
      },
      completeBotMirror: () => {
        throw new Error('unexpected mirror');
      },
      completeBotSteal: () => {
        throw new Error('unexpected steal');
      },
      completeBotReward: () => {
        throw new Error('unexpected reward');
      },
      failBotReward: () => {
        throw new Error('unexpected failBotReward');
      },
      completeBotReanimationKit: () => {
        throw new Error('unexpected reanimation kit');
      },
      failBotReanimationKit: () => {
        throw new Error('unexpected failBotReanimationKit');
      },
    };

    const driver = new BotDriver(host, 0, new SyncSearchPool());
    driver.scheduleTurn('bot-1');
    await vi.waitFor(() => {
      expect(performed.length).toBeGreaterThan(0);
    });
    expect(performed[0]).toBeDefined();
    driver.clear();
  });

  it('chains consecutive bot turns through setTimeout without sync recursion', async () => {
    let depth = 0;
    let maxDepth = 0;
    const order: string[] = [];
    let turn = 0;
    const botIds = ['bot-1', 'bot-2', 'bot-3'];

    const host: BotDriverHost = {
      isBotSeat: (id) => id.startsWith('bot-'),
      getGameState: () =>
        ({
          currentTurnPlayerId: botIds[turn] ?? null,
          players: [
            {
              id: botIds[turn] ?? 'bot-1',
              nickname: 'A',
              kitId: 'assassin',
              lives: 10,
              points: 0,
              upgradePoints: 0,
              shield: 0,
              shieldIsUpgraded: false,
              hand: [],
              specialCards: [],
              pendingEffects: [],
              activePersistentEffects: [],
              turnLedger: {
                livesLost: 0,
                pointsSpent: 0,
                upgradePointsSpent: 0,
                pointsLostToTheft: 0,
                upgradePointsLostToTheft: 0,
              },
              connectionState: {
                status: 'connected',
                disconnectedAt: null,
                automaticTurnsTaken: 0,
                consecutiveTimeouts: 0,
              },
              isEliminated: false,
              blockTurnsRemaining: 0,
        blockAttacksForbidden: false,
              attackBlockCharges: 0,
              eliminationSnapshot: null,
              pendingReanimation: null,
        absorbWindowOpen: false,
            },
          ],
          seed: 's',
          turnSequence: turn,
          mode: 'classic',
          lifeLimit: 25,
          pool: [],
          visibility: [],
          mirrorChoice: null,
          stealChoice: null,
          subChoice: null,
          eliminationContributors: [],
          rewardQueue: [],
          rewardChoice: null,
        }) as never,
      isGameOver: () => turn >= botIds.length,
      getPlayingView: (id) => emptyView(id),
      getActionLog: () => [],
      getBotDifficulty: () => 'hard',
      performBotAction: (id) => {
        depth += 1;
        maxDepth = Math.max(maxDepth, depth);
        order.push(id);
        turn += 1;
        depth -= 1;

        const next = botIds[turn];

        if (next !== undefined) {
          driver.scheduleTurn(next);
        }
      },
      performBotDraw: (id) => {
        host.performBotAction(id, { type: 'draw' });
      },
      completeBotMirror: () => undefined,
      completeBotSteal: () => undefined,
      completeBotReward: () => undefined,
      failBotReward: () => undefined,
      completeBotReanimationKit: () => undefined,
      failBotReanimationKit: () => undefined,
    };

    const driver = new BotDriver(host, 0, new SyncSearchPool());
    driver.scheduleTurn('bot-1');
    await vi.waitFor(() => {
      expect(order).toEqual(botIds);
    });
    expect(maxDepth).toBe(1);
    driver.clear();
  });

  it('degrades to draw when the policy path throws', async () => {
    const draws: string[] = [];
    const host: BotDriverHost = {
      isBotSeat: () => true,
      getGameState: () =>
        ({
          currentTurnPlayerId: 'bot-1',
          players: [],
          seed: 'throw',
          turnSequence: 0,
        }) as never,
      isGameOver: () => false,
      getPlayingView: () => {
        throw new Error('view boom');
      },
      getActionLog: () => [],
      getBotDifficulty: () => 'hard',
      performBotAction: () => {
        throw new Error('should not act');
      },
      performBotDraw: (id) => {
        draws.push(id);
      },
      completeBotMirror: () => undefined,
      completeBotSteal: () => undefined,
      completeBotReward: () => undefined,
      failBotReward: () => undefined,
      completeBotReanimationKit: () => undefined,
      failBotReanimationKit: () => undefined,
    };

    const driver = new BotDriver(host, 0, new SyncSearchPool());
    driver.scheduleTurn('bot-1');
    await vi.waitFor(() => {
      expect(draws).toEqual(['bot-1']);
    });
    driver.clear();
  });

  it('short-circuits Easy/search/noise for tutorial-script-v6 and omits Why', async () => {
    const calls: { action: TurnAction; reason: unknown }[] = [];
    const base = emptyView('bot-1');
    const botSeat = base.players[0];
    if (botSeat === undefined) {
      throw new Error('emptyView missing seat');
    }
    const tutorialView: PlayingStateView = {
      ...base,
      playKind: 'tutorial',
      tutorialIndex: 4,
      players: [
        { ...botSeat, id: 'human', isYou: false, isBot: false },
        { ...botSeat, id: 'bot-1', isYou: true, isBot: true },
      ],
    };

    const host: BotDriverHost = {
      isBotSeat: (id) => id.startsWith('bot-'),
      getGameState: () =>
        ({
          currentTurnPlayerId: 'bot-1',
          players: [
            {
              id: 'bot-1',
              nickname: 'A',
              kitId: 'ghost',
              lives: 4,
              points: 16,
              upgradePoints: 0,
              shield: 0,
              shieldIsUpgraded: false,
              hand: [],
              specialCards: [],
              pendingEffects: [],
              activePersistentEffects: [],
              turnLedger: {
                livesLost: 0,
                pointsSpent: 0,
                upgradePointsSpent: 0,
                pointsLostToTheft: 0,
                upgradePointsLostToTheft: 0,
              },
              connectionState: {
                status: 'connected',
                disconnectedAt: null,
                automaticTurnsTaken: 0,
                consecutiveTimeouts: 0,
              },
              isEliminated: false,
              blockTurnsRemaining: 0,
              blockAttacksForbidden: false,
              attackBlockCharges: 0,
              duplicationActive: false,
              eliminationSnapshot: null,
              pendingReanimation: null,
              absorbWindowPendingPlayerIds: null,
            },
          ],
          seed: 'tutorial-driver',
          turnSequence: 4,
          mode: 'classic',
          lifeLimit: 25,
          pool: [],
          nextPoolInstanceSeq: 0,
          visibility: [],
          mirrorChoice: null,
          stealChoice: null,
          subChoice: null,
          eliminationContributors: [],
          rewardQueue: [],
          rewardChoice: null,
        }) as never,
      isGameOver: () => false,
      getPlayingView: () => tutorialView,
      getActionLog: () => [],
      getBotDifficulty: () => 'easy',
      getBotPolicyId: () => 'tutorial-script-v6',
      performBotAction: (_id, action, reason) => {
        calls.push({ action, reason });
      },
      performBotDraw: () => {
        calls.push({ action: { type: 'draw' }, reason: 'draw-fallback' });
      },
      completeBotMirror: () => undefined,
      completeBotSteal: () => undefined,
      completeBotReward: () => undefined,
      failBotReward: () => undefined,
      completeBotReanimationKit: () => undefined,
      failBotReanimationKit: () => undefined,
    };

    const driver = new BotDriver(host, 0, new SyncSearchPool());
    driver.scheduleTurn('bot-1');
    await vi.waitFor(() => {
      expect(calls.length).toBeGreaterThan(0);
    });
    expect(calls[0]?.action).toEqual({ type: 'draw' });
    expect(calls[0]?.reason).toBeUndefined();
    driver.clear();
  });
});
