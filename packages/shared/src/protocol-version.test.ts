/**
 * Protocol version pin — L63-02 / PROTOCOL_VERSION 36.
 */

import { describe, expect, it } from 'vitest';

import { SENTENCE_OWNER_TURNS } from './domain/game-state';
import {
  BUY_POOL_CARD,
  CLAIM_SEAT,
  CLEAR_SPY,
  KICK_PLAYER,
  PLAY_AGAIN,
  SET_READY,
  STAY_SPECTATING,
} from './protocol/messages';
import type { GameRecapPlayerView, PlayingStateView } from './protocol/state-view';
import { PROTOCOL_VERSION } from './protocol-version';

describe('PROTOCOL_VERSION (L63-02)', () => {
  it('is 36 after Lot 63 pendingSentences', () => {
    expect(PROTOCOL_VERSION).toBe(36);
    expect(SENTENCE_OWNER_TURNS).toBe(3);
  });

  it('names rematch and Lot 58 client messages', () => {
    expect(SET_READY).toBe('setReady');
    expect(KICK_PLAYER).toBe('kickPlayer');
    expect(PLAY_AGAIN).toBe('playAgain');
    expect(CLAIM_SEAT).toBe('claimSeat');
    expect(STAY_SPECTATING).toBe('staySpectating');
    expect(BUY_POOL_CARD).toBe('buyPoolCard');
    expect(CLEAR_SPY).toBe('clearSpy');
  });

  it('requires recap match totals on GameRecapPlayerView (L60-02)', () => {
    const row: GameRecapPlayerView = {
      playerId: 'a',
      cardsPlayedCount: 0,
      buyCount: 0,
      sellCount: 0,
      upgradeCount: 0,
      isBot: false,
      livesLost: 0,
      livesGained: 0,
      pointsSpent: 0,
      pointsGained: 0,
      upgradePointsSpent: 0,
      specialsPlayedCount: 0,
      buyCardCount: 0,
      sellCardCount: 0,
      drawCount: 0,
      attacksPlayedCount: 0,
      damageDealt: 0,
      kills: 0,
      thinkTimeMs: 0,
    };

    expect(row.kills).toBe(0);
    expect(row.kitId).toBeUndefined();
  });

  it('requires pendingSentences on PlayingStateView (L63-02)', () => {
    const pendingSentences: PlayingStateView['pendingSentences'] = [
      { sourcePlayerId: 'a', remainingOwnerTurns: 2, isUpgraded: false },
    ];
    expect(pendingSentences[0]?.remainingOwnerTurns).toBe(2);
  });
});
