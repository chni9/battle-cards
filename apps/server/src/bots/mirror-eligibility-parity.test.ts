/**
 * Parity between the engine's `listEligibleMirrorTargets` (`engine/turn/mirror-choice.ts`)
 * and the bot's view-only `eligibleMirrorPendingFromView` (`policy-internals.ts`) — L29-07.
 *
 * The bot never has `Player.pendingEffects`, only `PlayingStateView.pendingEffects`
 * (`PendingEffectView[]`), so the predicate is duplicated by hand. This test builds the
 * same pending attacks on both sides and asserts identical eligible-id sets across every
 * combination the real predicate branches on.
 */

import { describe, expect, it } from 'vitest';

import type { PendingEffect, PendingEffectView, PlayingStateView } from '@card-battle/shared';

import { listEligibleMirrorTargets } from '../engine/turn/mirror-choice';
import { makePlayer } from '../testing/factories';
import { eligibleMirrorPendingFromView } from './policy-internals';

function pendingEffect(
  overrides: Partial<PendingEffect> & Pick<PendingEffect, 'id'>,
): PendingEffect {
  return {
    sourcePlayerId: 'opp',
    targetPlayerId: 'you',
    cardId: 'basic-attack',
    isUpgraded: false,
    queuedAt: 1,
    damageMultiplier: 1,
    redirectedBy: null,
    chosenInstanceId: null,
    ...overrides,
  };
}

function toPendingEffectView(effect: PendingEffect): PendingEffectView {
  return {
    id: effect.id,
    sourcePlayerId: effect.sourcePlayerId,
    targetPlayerId: effect.targetPlayerId,
    cardId: effect.cardId,
    isUpgraded: effect.isUpgraded,
    queuedAt: effect.queuedAt,
    damageMultiplier: effect.damageMultiplier,
    redirectedBy: effect.redirectedBy,
  };
}

function viewWithPending(pendingEffects: readonly PendingEffect[]): PlayingStateView {
  return {
    phase: 'playing',
    you: 'you',
    gameCode: 'TEST',
    currentTurnPlayerId: 'you',
    turnSequence: 1,
    turnOrder: ['you', 'opp'],
    turnDeadlineMs: null,
    players: [],
    self: {
      lives: 10,
      shield: 0,
      shieldIsUpgraded: false,
      points: 0,
      upgradePoints: 0,
      kitId: 'assassin',
      hand: [],
      specialCards: [],
      activePersistentEffects: [],
      attackBlockCharges: 0,
    },
    pendingEffects: pendingEffects.map(toPendingEffectView),
    actionLog: [],
    pool: [],
  };
}

describe('Mirror eligibility parity (L29-07)', () => {
  it('matches listEligibleMirrorTargets across direct, redirected, upgraded and MEGA cases', () => {
    const effects: PendingEffect[] = [
      pendingEffect({ id: 'direct' }),
      pendingEffect({ id: 'direct-up', isUpgraded: true }),
      pendingEffect({ id: 'mirror-redirect', redirectedBy: 'mirror' }),
      pendingEffect({ id: 'super-mirror-redirect', redirectedBy: 'super-mirror' }),
      pendingEffect({ id: 'mega-base', cardId: 'mega-attack', isUpgraded: false }),
      pendingEffect({ id: 'mega-up', cardId: 'mega-attack', isUpgraded: true }),
      // Not an attack — must never appear on either side.
      pendingEffect({ id: 'non-attack', cardId: 'tax' }),
    ];

    const player = makePlayer({ id: 'you', pendingEffects: effects });
    const view = viewWithPending(effects);

    for (const isUpgradedMirror of [false, true]) {
      const engineIds = listEligibleMirrorTargets(player, isUpgradedMirror)
        .map((effect) => effect.id)
        .sort();
      const botIds = eligibleMirrorPendingFromView(view, isUpgradedMirror)
        .map((effect) => effect.id)
        .sort();

      expect(botIds).toEqual(engineIds);
    }
  });

  it('both report empty when only an upgraded MEGA is pending against a base Mirror', () => {
    const effects: PendingEffect[] = [
      pendingEffect({ id: 'mega-up', cardId: 'mega-attack', isUpgraded: true }),
    ];
    const player = makePlayer({ id: 'you', pendingEffects: effects });
    const view = viewWithPending(effects);

    expect(listEligibleMirrorTargets(player, false)).toHaveLength(0);
    expect(eligibleMirrorPendingFromView(view, false)).toHaveLength(0);
  });
});
