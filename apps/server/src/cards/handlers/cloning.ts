/**
 * Cloning — rules spec §5 (updated 2026-08-02), L25-02 #V4-9.
 *
 * Immediate: copy kit + resources (lives, points, upgrade points, shield) from the
 * chosen opponent. Keep the user's own hand, specials, and active persistents. Cancels
 * pending against the user; does not inherit target pending; resets Spy visibility both
 * ways. Upgrade adds resources under the life cap.
 *
 * Invisible target → no copy; report `'immune'` via `immediateResolved` (#V4-9d).
 */

import {
  grantLives,
  grantPoints,
  grantUpgradePoints,
} from '../../engine/economy/grant-resources';
import { playerIsInvisible } from '../../engine/specials/is-invisible';
import { findPlayer } from '../../engine/turn/advance-turn';
import type { CardHandler, EffectContext } from '../handler';

export const cloningHandler: CardHandler = {
  canPlay(context: EffectContext): boolean {
    return context.targetPlayerId !== null;
  },

  play(context: EffectContext): void {
    const { state, sourcePlayerId, card, immediateResolved } = context;
    const targetPlayerId = context.targetPlayerId;

    if (targetPlayerId === null) {
      return;
    }

    const user = findPlayer(state, sourcePlayerId);
    const target = findPlayer(state, targetPlayerId);

    if (user === undefined || target === undefined) {
      return;
    }

    if (playerIsInvisible(target)) {
      immediateResolved.push({
        effectId: `cloning-immune:${card.instanceId}`,
        sourcePlayerId,
        targetPlayerId,
        cardId: 'cloning',
        isUpgraded: card.isUpgraded,
        livesLost: 0,
        shieldAbsorbed: 0,
        outcome: 'immune',
      });
      return;
    }

    user.kitId = target.kitId;
    // Resource snapshot — rules spec §5 (Cloning), technical spec v4 §4.6.
    // Assignment copies the target's count; neither `grantLives` nor a loss primitive.
    user.lives = target.lives;
    user.points = target.points;
    user.upgradePoints = target.upgradePoints;
    user.shield = target.shield;
    user.shieldIsUpgraded = target.shieldIsUpgraded;
    // Keep user.hand, user.specialCards, user.activePersistentEffects.
    user.pendingEffects = [];

    state.visibility = state.visibility.filter(
      (relation) => relation.viewerId !== user.id && relation.subjectId !== user.id,
    );

    if (card.isUpgraded) {
      grantPoints(state, user, 10, 'direct');
      grantUpgradePoints(state, user, 2, 'direct');
      grantLives(state, user, 4, 'direct');
    }
  },
};
