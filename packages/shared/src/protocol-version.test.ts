/**
 * Protocol version pin — L58-02 / PROTOCOL_VERSION 34 (after Lot 57 on main).
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

describe('PROTOCOL_VERSION (L57-16 / L58-02)', () => {
  it('is 34 after Lot 58 on top of rematch', () => {
    expect(PROTOCOL_VERSION).toBe(34);
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
});
