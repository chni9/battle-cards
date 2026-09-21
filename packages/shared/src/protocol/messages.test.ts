/**
 * Public actionPlayed field copy — L63-03 / PR #45 Bugbot.
 */

import { describe, expect, it } from 'vitest';

import {
  actionPlayedPublicFields,
  toActionPlayedPayload,
  type ActionPlayedPayload,
} from './messages';

describe('actionPlayedPublicFields (L63-03)', () => {
  it('copies drawBust when true and omits it otherwise', () => {
    expect(actionPlayedPublicFields({ drawBust: true })).toEqual({ drawBust: true });
    expect(actionPlayedPublicFields({})).toEqual({});
    expect('drawBust' in actionPlayedPublicFields({ cardId: 'tax' })).toBe(false);
  });

  it('copies drawGain on a successful Draw and omits it otherwise', () => {
    expect(actionPlayedPublicFields({ drawGain: 47 })).toEqual({ drawGain: 47 });
    expect('drawGain' in actionPlayedPublicFields({ drawBust: true })).toBe(false);
    expect('drawGain' in actionPlayedPublicFields({})).toBe(false);
  });

  it('copies the other optional public fields', () => {
    expect(
      actionPlayedPublicFields({
        cardId: 'basic-attack',
        isUpgraded: true,
        targetPlayerId: 'b',
        attacks: [{ cardId: 'basic-attack', targetPlayerId: 'b', isUpgraded: false }],
      }),
    ).toEqual({
      cardId: 'basic-attack',
      isUpgraded: true,
      targetPlayerId: 'b',
      attacks: [{ cardId: 'basic-attack', targetPlayerId: 'b', isUpgraded: false }],
    });
  });
});

describe('toActionPlayedPayload (L63-03)', () => {
  it('puts drawBust on the ACTION_PLAYED shape', () => {
    const payload: ActionPlayedPayload = toActionPlayedPayload({
      actorPlayerId: 'a',
      action: 'draw',
      turnSequence: 3,
      drawBust: true,
    });

    expect(payload).toEqual({
      actorPlayerId: 'a',
      action: 'draw',
      turnSequence: 3,
      drawBust: true,
    });
  });

  it('omits drawBust on a safe Draw', () => {
    const payload = toActionPlayedPayload({
      actorPlayerId: 'a',
      action: 'draw',
      turnSequence: 1,
    });

    expect(payload.drawBust).toBeUndefined();
    expect('drawBust' in payload).toBe(false);
  });

  it('puts drawGain on a successful Draw payload', () => {
    const payload: ActionPlayedPayload = toActionPlayedPayload({
      actorPlayerId: 'a',
      action: 'draw',
      turnSequence: 4,
      drawGain: 47,
    });

    expect(payload).toEqual({
      actorPlayerId: 'a',
      action: 'draw',
      turnSequence: 4,
      drawGain: 47,
    });
  });
});
