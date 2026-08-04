/**
 * Cloning — rules spec §5 (updated 2026-08-02).
 *
 * Immediate: copy kit + resources (lives, points, upgrade points, shield) from the
 * chosen opponent. Keep the user's own hand, specials, and active persistents. Cancels
 * pending against the user; does not inherit target pending; resets Spy visibility both
 * ways. Upgrade adds resources under the life cap.
 */

import { gainPoints } from '../../engine/economy/gain-points';
import { gainUpgradePoints } from '../../engine/economy/gain-upgrade-points';
import { gainLives } from '../../engine/life/gain-lives';
import { findPlayer } from '../../engine/turn/advance-turn';
import type { CardHandler, EffectContext } from '../handler';

export const cloningHandler: CardHandler = {
  canPlay(context: EffectContext): boolean {
    return context.targetPlayerId !== null;
  },

  play(context: EffectContext): void {
    const { state, sourcePlayerId, card } = context;
    const targetPlayerId = context.targetPlayerId;

    if (targetPlayerId === null) {
      return;
    }

    const user = findPlayer(state, sourcePlayerId);
    const target = findPlayer(state, targetPlayerId);

    if (user === undefined || target === undefined) {
      return;
    }

    user.kitId = target.kitId;
    // Resource snapshot — rules spec §5 (Cloning), technical spec v4 §4.6.
    // Assignment copies the target's count; neither `gainLives` nor a loss primitive.
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
      gainPoints(user, 10, 'direct');
      gainUpgradePoints(user, 2, 'direct');
      gainLives(user, 4, state.lifeLimit);
    }
  },
};
