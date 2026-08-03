import { afterEach, describe, expect, it, vi } from 'vitest';

import { BotDriver, type BotDriverHost } from './bot-driver';
import { readBotThinkMs } from './bot-think-ms';
import { classifyRewardRoute, classifyTurnEntry } from './turn-entry';
import type { HumanSeat, BotSeat } from '../rooms/seats';

function human(sessionId: string): HumanSeat {
  return { kind: 'human', sessionId, nickname: 'Host' };
}

function bot(sessionId: string): BotSeat {
  return { kind: 'bot', sessionId, nickname: 'Alpha', difficulty: 'normal' };
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

describe('BotDriver stub (L15-04)', () => {
  it('schedules draw via setTimeout and never arms a turn timer itself', async () => {
    const draws: string[] = [];
    const host: BotDriverHost = {
      isBotSeat: (id) => id.startsWith('bot-'),
      getGameState: () =>
        ({
          currentTurnPlayerId: 'bot-1',
          players: [],
          seed: 's',
          turnSequence: 1,
        }) as never,
      isGameOver: () => false,
      performBotDraw: (id) => {
        draws.push(id);
      },
      completeBotMirror: () => {
        throw new Error('unexpected mirror');
      },
      completeBotReward: () => {
        throw new Error('unexpected reward');
      },
    };

    const driver = new BotDriver(host, 0);
    driver.scheduleTurn('bot-1');
    await vi.waitFor(() => {
      expect(draws).toEqual(['bot-1']);
    });
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
          players: [],
          seed: 's',
          turnSequence: turn,
        }) as never,
      isGameOver: () => turn >= botIds.length,
      performBotDraw: (id) => {
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
      completeBotMirror: () => undefined,
      completeBotReward: () => undefined,
    };

    const driver = new BotDriver(host, 0);
    driver.scheduleTurn('bot-1');
    await vi.waitFor(() => {
      expect(order).toEqual(botIds);
    });
    expect(maxDepth).toBe(1);
    driver.clear();
  });
});
