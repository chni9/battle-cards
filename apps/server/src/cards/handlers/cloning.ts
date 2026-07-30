/**
 * Cloning — rules spec §5, backlog L5-06.
 *
 * Immediate full state replace from the chosen opponent. Cancels pending against the
 * user; does not inherit target pending; copies active persistents with new ids;
 * resets Spy visibility both ways. Upgrade adds resources under the life cap.
 */

import type { CardInstance, PersistentEffect } from '@card-battle/shared';
import { randomUUID } from 'node:crypto';

import { gainLives } from '../../engine/life/gain-lives';
import { findPlayer } from '../../engine/turn/advance-turn';
import type { CardHandler, EffectContext } from '../handler';

function cloneInstances(cards: readonly CardInstance[]): CardInstance[] {
  return cards.map((card) => ({
    instanceId: randomUUID(),
    cardId: card.cardId,
    isUpgraded: card.isUpgraded,
  }));
}

function clonePersistents(effects: readonly PersistentEffect[]): PersistentEffect[] {
  return effects.map((effect) => ({
    id: randomUUID(),
    cardId: effect.cardId,
    isUpgraded: effect.isUpgraded,
    counter: effect.counter,
  }));
}

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
    user.lives = target.lives;
    user.points = target.points;
    user.upgradePoints = target.upgradePoints;
    user.shield = target.shield;
    user.shieldIsUpgraded = target.shieldIsUpgraded;
    user.hand = cloneInstances(target.hand);
    user.specialCards = cloneInstances(target.specialCards);
    user.activePersistentEffects = clonePersistents(target.activePersistentEffects);
    user.pendingEffects = [];

    state.visibility = state.visibility.filter(
      (relation) => relation.viewerId !== user.id && relation.subjectId !== user.id,
    );

    if (card.isUpgraded) {
      user.points += 10;
      user.upgradePoints += 2;
      gainLives(user, 4, state.lifeLimit);
    }
  },
};
