/**
 * Protocol version pin — L63-03 / PROTOCOL_VERSION 36.
 */

import { describe, expect, it } from 'vitest';

import { PROTOCOL_VERSION } from './protocol-version';
import type { ActionPlayedLogEntry } from './protocol/state-view';

describe('PROTOCOL_VERSION (L63-03)', () => {
  it('is 36 after public drawBust', () => {
    expect(PROTOCOL_VERSION).toBe(36);
  });

  it('allows optional drawBust on actionPlayed log entries', () => {
    const bust: ActionPlayedLogEntry = {
      kind: 'actionPlayed',
      actorPlayerId: 'a',
      action: 'draw',
      turnSequence: 1,
      drawBust: true,
    };
    const safe: ActionPlayedLogEntry = {
      kind: 'actionPlayed',
      actorPlayerId: 'a',
      action: 'draw',
      turnSequence: 2,
    };

    expect(bust.drawBust).toBe(true);
    expect(safe.drawBust).toBeUndefined();
  });
});
