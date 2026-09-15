/**
 * Protocol bump pin — L57-16 / PROTOCOL_VERSION 33.
 */

import { describe, expect, it } from 'vitest';

import {
  CLAIM_SEAT,
  KICK_PLAYER,
  PLAY_AGAIN,
  SET_READY,
  STAY_SPECTATING,
} from './protocol/messages';
import { PROTOCOL_VERSION } from './protocol-version';

describe('PROTOCOL_VERSION (L57-16)', () => {
  it('is 33 after the claim-picker fog bump', () => {
    expect(PROTOCOL_VERSION).toBe(33);
  });

  it('names staySpectating besides the rematch client messages', () => {
    expect(SET_READY).toBe('setReady');
    expect(KICK_PLAYER).toBe('kickPlayer');
    expect(PLAY_AGAIN).toBe('playAgain');
    expect(CLAIM_SEAT).toBe('claimSeat');
    expect(STAY_SPECTATING).toBe('staySpectating');
  });
});
