/**
 * Worker pool + fallback — technical spec v5 §8.1 / L32-08.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PlayingStateView } from '@card-battle/shared';

import { BotDriver, type BotDriverHost } from '../../bot-driver';
import type { TurnAction } from '../../../engine/turn/perform-action';
import { SyncSearchPool } from './sync-pool';

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
      points: 5,
      upgradePoints: 0,
      kitId: 'assassin',
      hand: [{ instanceId: 'h1', cardId: 'tax', isUpgraded: false }],
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

describe('search worker fallback (L32-08)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('falls back to sync heuristic-v4 (not draw) when the worker fails', async () => {
    const performed: TurnAction[] = [];
    const draws: TurnAction[] = [];
    const pool = new SyncSearchPool();
    pool.failNextRequest();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const host: BotDriverHost = {
      isBotSeat: (id) => id.startsWith('bot-'),
      getGameState: () =>
        ({
          currentTurnPlayerId: 'bot-1',
          players: [
            {
              id: 'bot-1',
              nickname: 'Bot',
              kitId: 'assassin',
              lives: 10,
              points: 5,
              upgradePoints: 0,
              shield: 0,
              shieldIsUpgraded: false,
              hand: [{ instanceId: 'h1', cardId: 'tax', isUpgraded: false }],
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
          pool: [],
          nextPoolInstanceSeq: 0,
          turnSequence: 0,
          seed: 'l32-08-fallback',
          mode: 'classic',
          lifeLimit: 25,
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
      performBotAction: (_botId, action) => {
        performed.push(action);
      },
      performBotDraw: (_botId, reason) => {
        void reason;
        draws.push({ type: 'draw' });
      },
      completeBotMirror: () => undefined,
      completeBotSteal: () => undefined,
      completeBotReward: () => undefined,
      failBotReward: () => undefined,
      completeBotReanimationKit: () => undefined,
      failBotReanimationKit: () => undefined,
    };

    const driver = new BotDriver(host, 0, pool);
    driver.scheduleTurn('bot-1');

    await vi.waitFor(() => {
      expect(performed.length + draws.length).toBeGreaterThan(0);
    });

    expect(draws).toHaveLength(0);
    expect(performed.length).toBe(1);
    expect(performed[0]?.type).not.toBe('draw');
    expect(warn.mock.calls.map((call) => String(call[0]))).toEqual([
      'bot.fallback.worker_crash',
      'bot.fallback.heuristic',
    ]);
    warn.mockRestore();
  });

  it('killOneWorker mid-decision still yields a legal heuristic action (L36-02)', async () => {
    const performed: TurnAction[] = [];
    const draws: TurnAction[] = [];
    const pool = new SyncSearchPool();
    pool.killOneWorker();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const host: BotDriverHost = {
      isBotSeat: () => true,
      getGameState: () =>
        ({
          currentTurnPlayerId: 'bot-1',
          players: [
            {
              id: 'bot-1',
              nickname: 'Bot',
              kitId: 'assassin',
              lives: 10,
              points: 5,
              upgradePoints: 0,
              shield: 0,
              shieldIsUpgraded: false,
              hand: [{ instanceId: 'h1', cardId: 'tax', isUpgraded: false }],
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
          pool: [],
          nextPoolInstanceSeq: 0,
          turnSequence: 0,
          seed: 'l36-02-kill',
          mode: 'classic',
          lifeLimit: 25,
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
        draws.push({ type: 'draw' });
      },
      completeBotMirror: () => undefined,
      completeBotSteal: () => undefined,
      completeBotReward: () => undefined,
      failBotReward: () => undefined,
      completeBotReanimationKit: () => undefined,
      failBotReanimationKit: () => undefined,
    };

    const driver = new BotDriver(host, 0, pool);
    driver.scheduleTurn('bot-1');

    await vi.waitFor(() => {
      expect(performed.length + draws.length).toBeGreaterThan(0);
    });

    expect(draws).toHaveLength(0);
    expect(performed[0]?.type).not.toBe('draw');
    expect(warn.mock.calls.some((call) => String(call[0]) === 'bot.fallback.heuristic')).toBe(
      true,
    );
    warn.mockRestore();
  });

  it('does not block the event loop for the duration of a decision', async () => {
    let tick = 0;
    const pool = new SyncSearchPool();
    const performed: TurnAction[] = [];

    const host: BotDriverHost = {
      isBotSeat: () => true,
      getGameState: () =>
        ({
          currentTurnPlayerId: 'bot-1',
          players: [
            {
              id: 'bot-1',
              nickname: 'Bot',
              kitId: 'assassin',
              lives: 10,
              points: 5,
              upgradePoints: 0,
              shield: 0,
              shieldIsUpgraded: false,
              hand: [{ instanceId: 'h1', cardId: 'tax', isUpgraded: false }],
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
          pool: [],
          nextPoolInstanceSeq: 0,
          turnSequence: 0,
          seed: 'l32-08-event-loop',
          mode: 'classic',
          lifeLimit: 25,
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
      performBotDraw: () => undefined,
      completeBotMirror: () => undefined,
      completeBotSteal: () => undefined,
      completeBotReward: () => undefined,
      failBotReward: () => undefined,
      completeBotReanimationKit: () => undefined,
      failBotReanimationKit: () => undefined,
    };

    const driver = new BotDriver(host, 0, pool);
    driver.scheduleTurn('bot-1');
    setImmediate(() => {
      tick += 1;
    });

    await vi.waitFor(() => {
      expect(performed.length).toBe(1);
    });

    expect(tick).toBe(1);
  });
});
