/**
 * Protocol version pin — PROTOCOL_VERSION 43.
 */

import { describe, expect, it } from 'vitest';

import { SENTENCE_OWNER_TURNS } from './domain/game-state';
import { PROTOCOL_VERSION } from './protocol-version';
import type { ActionPlayedPayload, ActionResolvedPayload, EliminationReason } from './protocol/messages';
import type {
  ActionLogEliminationReason,
  ActionPlayedLogEntry,
  PlayingStateView,
  PublicPlayerView,
} from './protocol/state-view';

describe('PROTOCOL_VERSION', () => {
  it('is 42 after blockedBy on actionResolved', () => {
    expect(PROTOCOL_VERSION).toBe(44);
    const blocked: ActionResolvedPayload = {
      effectId: 'e',
      sourcePlayerId: 'a',
      targetPlayerId: 'b',
      cardId: 'super-attack',
      isUpgraded: true,
      livesLost: 0,
      shieldAbsorbed: 0,
      outcome: 'blocked',
      blockedBy: 'attack-thief',
    };
    expect(blocked.blockedBy).toBe('attack-thief');
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
      { id: 'sentence:1:a:0', sourcePlayerId: 'a', remainingOwnerTurns: 2, isUpgraded: false },
    ];
    expect(pendingSentences[0]?.remainingOwnerTurns).toBe(2);
  });

  it('allows optional drawGain on PublicPlayerView and safe draw actionPlayed', () => {
    const seat = { drawGain: 47 } as Pick<PublicPlayerView, 'drawGain'>;
    const played: ActionPlayedLogEntry = {
      kind: 'actionPlayed',
      actorPlayerId: 'a',
      action: 'draw',
      turnSequence: 1,
      drawGain: 47,
    };
    const wire: ActionPlayedPayload = {
      actorPlayerId: 'a',
      action: 'draw',
      turnSequence: 1,
      drawGain: 47,
    };
    const omitted: ActionPlayedLogEntry = {
      kind: 'actionPlayed',
      actorPlayerId: 'a',
      action: 'draw',
      turnSequence: 2,
    };

    expect(seat.drawGain).toBe(47);
    expect(played.drawGain).toBe(47);
    expect(wire.drawGain).toBe(47);
    expect(omitted.drawGain).toBeUndefined();
  });

  it('includes gambling on elimination reason unions', () => {
    const wire: EliminationReason = 'gambling';
    const log: ActionLogEliminationReason = 'gambling';
    expect(wire).toBe('gambling');
    expect(log).toBe('gambling');
  });
});
