/**
 * Protocol bump pin — L57-07 / PROTOCOL_VERSION 32.
 */

import { describe, expect, it } from 'vitest';

import { CLAIM_SEAT, KICK_PLAYER, PLAY_AGAIN, SET_READY } from './protocol/messages';
import { PROTOCOL_VERSION } from './protocol-version';

describe('PROTOCOL_VERSION (L57-07)', () => {
  it('is 32 after the lobby rematch bump', () => {
    expect(PROTOCOL_VERSION).toBe(32);
  });

  it('names the rematch client messages', () => {
    expect(SET_READY).toBe('setReady');
    expect(KICK_PLAYER).toBe('kickPlayer');
    expect(PLAY_AGAIN).toBe('playAgain');
    expect(CLAIM_SEAT).toBe('claimSeat');
  });
});
