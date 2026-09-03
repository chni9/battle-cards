import { PROTOCOL_VERSION } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { buildFeedbackPayload } from './build-feedback-payload';

describe('buildFeedbackPayload (technical spec v6 §7.1 / L47-03)', () => {
  it('omits gameCode and logTail on Home and never includes seed', () => {
    const body = buildFeedbackPayload('bug', '  Home is confusing  ', {
      screen: 'home',
      nickname: 'Ada',
      topics: ['ui', 'gameplay'],
    });

    expect(body).toEqual({
      kind: 'bug',
      message: 'Home is confusing',
      screen: 'home',
      protocolVersion: PROTOCOL_VERSION,
      nickname: 'Ada',
      topics: ['ui', 'gameplay'],
    });
    expect(JSON.stringify(body)).not.toContain('seed');
    expect(Reflect.has(body, 'gameCode')).toBe(false);
    expect(Reflect.has(body, 'logTail')).toBe(false);
  });

  it('attaches the last 30 public log entries from the table view', () => {
    const actionLog = Array.from({ length: 31 }, (_, index) => ({
      kind: 'rewardsClaimed' as const,
      eliminatorPlayerId: 'a',
      eliminatedPlayerId: 'b',
      turnSequence: index,
    }));
    const body = buildFeedbackPayload(
      'confusion',
      'Incoming?',
      {
        screen: 'table',
        nickname: 'Ada',
        gameCode: 'ABCDEF',
        playKind: 'classic',
        actionLog,
      },
      ' ada@example.com ',
    );

    expect(body.gameCode).toBe('ABCDEF');
    expect(body.playKind).toBe('classic');
    expect(body.contact).toBe('ada@example.com');
    expect(body.logTail).toHaveLength(30);
    expect(body.logTail?.[0]).toEqual(actionLog[1]);
    expect(JSON.stringify(body)).not.toContain('seed');
  });
});
