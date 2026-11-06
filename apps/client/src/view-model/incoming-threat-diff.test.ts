import { describe, expect, it } from 'vitest';

import { ACTION_CARD_IDS, ATTACK_CARD_IDS, SPECIAL_CARD_IDS, type PendingEffectView } from '@card-battle/shared';

import {
  earliestIncomingThief,
  INCOMING_THIEF_CARD_IDS,
  incomingAttackTargetingYouIds,
  incomingTargetingYouIds,
  incomingThiefTargetingYouIds,
  isIncomingThiefCardId,
  isPersistentPresentationId,
  newIncomingThreats,
} from './incoming-threat-diff';

function effect(
  partial: Pick<PendingEffectView, 'id' | 'sourcePlayerId' | 'targetPlayerId' | 'cardId'> &
    Partial<PendingEffectView>,
): PendingEffectView {
  return {
    isUpgraded: false,
    queuedAt: 1,
    damageMultiplier: 1,
    redirectedBy: null,
    ...partial,
  };
}

describe('incoming threat diff (L39-05)', () => {
  it('detects persistent presentation ids', () => {
    expect(isPersistentPresentationId('persistent:abc->you')).toBe(true);
    expect(isPersistentPresentationId('eff-1')).toBe(false);
  });

  it('returns only new real Incoming targeting you', () => {
    const pending = [
      effect({
        id: 'a',
        sourcePlayerId: 'bob',
        targetPlayerId: 'you',
        cardId: 'basic-attack',
      }),
      effect({
        id: 'b',
        sourcePlayerId: 'bob',
        targetPlayerId: 'carol',
        cardId: 'tax',
      }),
      effect({
        id: 'persistent:imp->you',
        sourcePlayerId: 'bob',
        targetPlayerId: 'you',
        cardId: 'imposition',
      }),
      effect({
        id: 'c',
        sourcePlayerId: 'carol',
        targetPlayerId: 'you',
        cardId: 'thief',
      }),
    ];
    const seen = new Set(['a']);
    const fresh = newIncomingThreats(seen, pending, 'you');
    expect(fresh.map((e) => e.id)).toEqual(['c']);
  });

  it('collects current Incoming ids for seeding', () => {
    const pending = [
      effect({
        id: 'a',
        sourcePlayerId: 'bob',
        targetPlayerId: 'you',
        cardId: 'basic-attack',
      }),
      effect({
        id: 'persistent:x->you',
        sourcePlayerId: 'bob',
        targetPlayerId: 'you',
        cardId: 'imposition',
      }),
    ];
    expect([...incomingTargetingYouIds(pending, 'you')]).toEqual(['a']);
  });

  it('incoming-attack helper ignores Spy and Thief', () => {
    const pending = [
      effect({
        id: 'spy',
        sourcePlayerId: 'bob',
        targetPlayerId: 'you',
        cardId: 'spy',
      }),
      effect({
        id: 'thief',
        sourcePlayerId: 'bob',
        targetPlayerId: 'you',
        cardId: 'thief',
      }),
      effect({
        id: 'strong',
        sourcePlayerId: 'bob',
        targetPlayerId: 'you',
        cardId: 'strong-attack',
      }),
    ];
    expect([...incomingTargetingYouIds(pending, 'you')]).toEqual(['spy', 'thief', 'strong']);
    expect([...incomingAttackTargetingYouIds(pending, 'you')]).toEqual(['strong']);
  });

  it('incoming-thief helper matches thief cards only', () => {
    const pending = [
      effect({
        id: 'spy',
        sourcePlayerId: 'bob',
        targetPlayerId: 'you',
        cardId: 'spy',
      }),
      effect({
        id: 'thief',
        sourcePlayerId: 'bob',
        targetPlayerId: 'you',
        cardId: 'thief',
      }),
      effect({
        id: 'upt',
        sourcePlayerId: 'bob',
        targetPlayerId: 'you',
        cardId: 'upgrade-point-thief',
      }),
      effect({
        id: 'strong',
        sourcePlayerId: 'bob',
        targetPlayerId: 'you',
        cardId: 'strong-attack',
      }),
      effect({
        id: 'persistent:imp->you',
        sourcePlayerId: 'bob',
        targetPlayerId: 'you',
        cardId: 'imposition',
      }),
    ];
    expect([...incomingThiefTargetingYouIds(pending, 'you')]).toEqual(['thief', 'upt']);
  });
});

describe('incoming thief identity (L75-07, R12)', () => {
  it('lists the five thieves and keeps the old truth table on every real card id', () => {
    expect([...INCOMING_THIEF_CARD_IDS]).toEqual(['thief', 'card-thief', 'spy-thief', 'upgrade-point-thief', 'attack-thief']);
    for (const id of [...ATTACK_CARD_IDS, ...ACTION_CARD_IDS, ...SPECIAL_CARD_IDS]) {
      expect(isIncomingThiefCardId(id)).toBe(id === 'thief' || id.endsWith('-thief'));
    }
  });

  it('picks the earliest-queued thief on you, ties in wire order, skipping persistents and other targets (golden rule 3)', () => {
    const pending = [
      effect({ id: 'a', sourcePlayerId: 'bob', targetPlayerId: 'carol', cardId: 'thief', queuedAt: 1 }),
      effect({ id: 'persistent:x', sourcePlayerId: 'bob', targetPlayerId: 'you', cardId: 'spy-thief', queuedAt: 1 }),
      effect({ id: 'b', sourcePlayerId: 'bob', targetPlayerId: 'you', cardId: 'basic-attack', queuedAt: 2 }),
      effect({ id: 'c', sourcePlayerId: 'bob', targetPlayerId: 'you', cardId: 'card-thief', queuedAt: 5 }),
      effect({ id: 'd', sourcePlayerId: 'dan', targetPlayerId: 'you', cardId: 'attack-thief', queuedAt: 3 }),
      effect({ id: 'e', sourcePlayerId: 'eve', targetPlayerId: 'you', cardId: 'thief', queuedAt: 3 }),
    ];
    expect(earliestIncomingThief(pending, 'you')).toBe('attack-thief');
    expect(earliestIncomingThief(pending.slice(0, 3), 'you')).toBeNull();
  });
});
