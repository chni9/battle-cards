/**
 * listEligibleMirrorTargets — technical spec v4 §4.7, backlog L20-15.
 */

import { describe, expect, it } from 'vitest';

import type { PendingEffect } from '@card-battle/shared';

import { createInitialState } from '../create-initial-state';
import { makePlayer } from '../../testing/factories';
import {
  listEligibleMirrorTargets,
  listEligibleSuperMirrorTargets,
  redirectPendingAttack,
} from './mirror-choice';
import { queueEffect } from './queue-effect';

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
    chosenInstanceId: null,
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

  it('listEligibleSuperMirrorTargets includes every attack including super-mirror and upgraded mega', () => {
    const player = makePlayer({
      pendingEffects: [
        attack({ id: 'direct' }),
        attack({ id: 'up', isUpgraded: true }),
        attack({ id: 'super', redirectedBy: 'super-mirror' }),
        attack({ id: 'mega-up', cardId: 'mega-attack', isUpgraded: true }),
        attack({ id: 'tax', cardId: 'tax' }),
      ],
    });

    expect(listEligibleSuperMirrorTargets(player).map((effect) => effect.id)).toEqual([
      'direct',
      'up',
      'super',
      'mega-up',
    ]);
  });
});

describe('redirectPendingAttack (L56-03)', () => {
  it('stamps isUpgraded and post-redirect damageMultiplier', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'l56-03-redirect',
    });
    const alice = state.players.find((player) => player.id === 'a');
    const bob = state.players.find((player) => player.id === 'b');

    if (alice === undefined || bob === undefined) {
      throw new Error('missing players');
    }

    for (const player of state.players) {
      player.pendingEffects = [];
    }

    const queued = queueEffect({
      state,
      sourcePlayerId: bob.id,
      targetPlayerId: alice.id,
      cardId: 'strong-attack',
      isUpgraded: true,
    });
    const result = redirectPendingAttack(state, alice, queued.id, bob.id, true);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.redirect.cardId).toBe('strong-attack');
    expect(result.redirect.isUpgraded).toBe(true);
    expect(result.redirect.damageMultiplier).toBe(2);
    expect(result.redirect.previousTargetPlayerId).toBe(alice.id);
    expect(result.redirect.newTargetPlayerId).toBe(bob.id);
  });
});
