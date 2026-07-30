/**
 * Three attack cards × base/upgraded — rules spec §2, backlog L2-04.
 */

import { ATTACK_DAMAGE, getSharedCard } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { createInitialState } from '../create-initial-state';
import { performTurnAction } from './perform-action';

describe('three attack cards (rules spec §2, L2-04)', () => {
  const seats = [
    { id: 'a', nickname: 'Alice' },
    { id: 'b', nickname: 'Bob' },
  ] as const;

  const cases = [
    { cardId: 'basic-attack' as const, upgraded: false },
    { cardId: 'basic-attack' as const, upgraded: true },
    { cardId: 'strong-attack' as const, upgraded: false },
    { cardId: 'strong-attack' as const, upgraded: true },
    { cardId: 'super-attack' as const, upgraded: false },
    { cardId: 'super-attack' as const, upgraded: true },
  ];

  for (const { cardId, upgraded } of cases) {
    const label = `${cardId} ${upgraded ? 'upgraded' : 'base'}`;

    it(`deals catalog damage for ${label}`, () => {
      const state = createInitialState({ seats, seed: `atk-${cardId}-${String(upgraded)}` });
      const attackerId = state.currentTurnPlayerId;

      expect(attackerId).not.toBeNull();

      if (attackerId === null) {
        return;
      }

      const attacker = state.players.find((player) => player.id === attackerId);
      const defender = state.players.find((player) => player.id !== attackerId);

      expect(attacker).toBeDefined();
      expect(defender).toBeDefined();

      if (attacker === undefined || defender === undefined) {
        return;
      }

      const definition = getSharedCard(cardId);
      expect(definition?.cost.points).toBeDefined();

      const cost = definition?.cost.points ?? 0;
      const expectedDamage = upgraded
        ? ATTACK_DAMAGE[cardId].upgraded
        : ATTACK_DAMAGE[cardId].base;

      attacker.points = cost;
      attacker.hand = [
        {
          instanceId: 'atk-1',
          cardId,
          isUpgraded: upgraded,
        },
      ];
      defender.lives = 25;

      const play = performTurnAction(state, attackerId, {
        type: 'playCard',
        instanceId: 'atk-1',
        targetPlayerId: defender.id,
      });

      expect(play.ok).toBe(true);
      expect(attacker.points).toBe(0);
      expect(defender.pendingEffects).toHaveLength(1);

      state.currentTurnPlayerId = defender.id;
      const resolve = performTurnAction(state, defender.id, { type: 'draw' });

      expect(resolve.ok).toBe(true);

      if (!resolve.ok) {
        return;
      }

      expect(resolve.resolved[0]?.livesLost).toBe(expectedDamage);
      expect(defender.lives).toBe(25 - expectedDamage);
    });
  }
});
