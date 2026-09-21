/**
 * Protocol version pin — PROTOCOL_VERSION 38.
 */

import { describe, expect, it } from 'vitest';

import { SENTENCE_OWNER_TURNS } from './domain/game-state';
import { PROTOCOL_VERSION } from './protocol-version';
import type { ActionPlayedPayload } from './protocol/messages';
import type { ActionPlayedLogEntry, PlayingStateView } from './protocol/state-view';

describe('PROTOCOL_VERSION', () => {
  it('is 38 after Factory renamed to Roulette', () => {
    expect(PROTOCOL_VERSION).toBe(38);
    expect(SENTENCE_OWNER_TURNS).toBe(3);
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

  it('allows optional drawBust on ACTION_PLAYED payloads', () => {
    const bust: ActionPlayedPayload = {
      actorPlayerId: 'a',
      action: 'draw',
      turnSequence: 1,
      drawBust: true,
    };
    const safe: ActionPlayedPayload = {
      actorPlayerId: 'a',
      action: 'draw',
      turnSequence: 2,
    };

    expect(bust.drawBust).toBe(true);
    expect(safe.drawBust).toBeUndefined();
  });

  it('requires pendingSentences on PlayingStateView', () => {
    const pendingSentences: PlayingStateView['pendingSentences'] = [
      { sourcePlayerId: 'a', remainingOwnerTurns: 2, isUpgraded: false },
    ];
    expect(pendingSentences[0]?.remainingOwnerTurns).toBe(2);
  });
});
