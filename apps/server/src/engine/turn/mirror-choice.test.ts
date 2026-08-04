/**
 * listEligibleMirrorTargets — technical spec v4 §4.7, backlog L20-15.
 */

import { describe, expect, it } from 'vitest';

import type { PendingEffect } from '@card-battle/shared';

import { makePlayer } from '../../testing/factories';
import { listEligibleMirrorTargets } from './mirror-choice';

function attack(
  overrides: Partial<PendingEffect> & Pick<PendingEffect, 'id'>,
): PendingEffect {
  return {
    sourcePlayerId: 'a',
    targetPlayerId: 'b',
    cardId: 'basic-attack',
    isUpgraded: false,
    queuedAt: 1,
    damageMultiplier: 1,
    redirectedBy: null,
    ...overrides,
  };
}

describe('listEligibleMirrorTargets (technical spec v4 §4.7, L20-15)', () => {
  it('excludes super-mirror redirects for regular and upgraded Mirror', () => {
    const player = makePlayer({
      pendingEffects: [
        attack({ id: 'direct' }),
        attack({ id: 'mirror', redirectedBy: 'mirror' }),
        attack({ id: 'super', redirectedBy: 'super-mirror' }),
      ],
    });

    const regular = listEligibleMirrorTargets(player, false).map((effect) => effect.id);
    const upgraded = listEligibleMirrorTargets(player, true).map((effect) => effect.id);

    expect(regular).toEqual(['direct', 'mirror']);
    expect(upgraded).toEqual(['direct', 'mirror']);
  });

  it('allows base mega-attack only for upgraded Mirror and never upgraded mega', () => {
    const player = makePlayer({
      pendingEffects: [
        attack({ id: 'mega-base', cardId: 'mega-attack', isUpgraded: false }),
        attack({ id: 'mega-up', cardId: 'mega-attack', isUpgraded: true }),
      ],
    });

    expect(listEligibleMirrorTargets(player, false).map((effect) => effect.id)).toEqual([]);
    expect(listEligibleMirrorTargets(player, true).map((effect) => effect.id)).toEqual([
      'mega-base',
    ]);
  });
});
