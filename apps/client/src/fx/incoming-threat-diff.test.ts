import { describe, expect, it } from 'vitest';

import type { PendingEffectView } from '@card-battle/shared';

import {
  incomingTargetingYouIds,
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
});
