/**
 * Public actionPlayed field copy — L63-03 / PR #45 Bugbot.
 */

import { describe, expect, it } from 'vitest';

import {
  actionPlayedPublicFields,
  toActionPlayedPayload,
  toPublicBuyPoolCardPlayed,
  type ActionPlayedPayload,
} from './messages';

describe('actionPlayedPublicFields (L63-03)', () => {
  it('copies drawBust when true and omits it otherwise', () => {
    expect(actionPlayedPublicFields({ drawBust: true })).toEqual({ drawBust: true });
    expect(actionPlayedPublicFields({})).toEqual({});
    expect('drawBust' in actionPlayedPublicFields({ cardId: 'tax' })).toBe(false);
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
});

describe('toPublicBuyPoolCardPlayed (designer 2026-09-20)', () => {
  it('keeps the action kind and drops recovered-card fields', () => {
    const payload = toPublicBuyPoolCardPlayed({
      actorPlayerId: 'a',
      turnSequence: 4,
      botReason: { code: 'invest' },
    });

    expect(payload).toEqual({
      actorPlayerId: 'a',
      action: 'buyPoolCard',
      turnSequence: 4,
      botReason: { code: 'invest' },
    });
    expect('cardId' in payload).toBe(false);
    expect('isUpgraded' in payload).toBe(false);
  });
});
