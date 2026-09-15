/**
 * Protocol version pin — L60-02 / PROTOCOL_VERSION 35 (after Lot 58 on main).
 */

import { describe, expect, it } from 'vitest';

import {
  BUY_POOL_CARD,
  CLAIM_SEAT,
  CLEAR_SPY,
  KICK_PLAYER,
  PLAY_AGAIN,
  SET_READY,
  STAY_SPECTATING,
} from './protocol/messages';
import { PROTOCOL_VERSION } from './protocol-version';
import type { GameRecapPlayerView } from './protocol/state-view';

describe('PROTOCOL_VERSION (L60-02)', () => {
  it('is 35 after Lot 60 recap awards', () => {
    expect(PROTOCOL_VERSION).toBe(35);
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
});
