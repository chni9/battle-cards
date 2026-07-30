/**
 * Special card purchase — rules spec §5, tech §6.2 #10, backlog L5-09.
 */

import { SPECIAL_CARD_IDS } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { createRng } from '../rng';
import { createInitialState } from '../create-initial-state';
import { buySpecialCard, SPECIAL_CARD_PURCHASE_COST } from './buy-special-card';

describe('buySpecialCard (L5-09)', () => {
  it('draws only from the 6 V1 specials', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l5-09',
    });
    const actor = state.players.find((player) => player.id === 'a');

    if (actor === undefined) {
      return;
    }

    actor.points = SPECIAL_CARD_PURCHASE_COST * 50;
    const before = actor.specialCards.length;
    const drawn = new Set<string>();

    for (let i = 0; i < 40; i += 1) {
      const rng = createRng(`l5-09-draw-${String(i)}`);
      const result = buySpecialCard(state, actor.id, rng);
      expect(result.ok).toBe(true);

      if (!result.ok) {
        return;
      }

      expect((SPECIAL_CARD_IDS as readonly string[]).includes(result.instance.cardId)).toBe(true);
      drawn.add(result.instance.cardId);
    }

    expect(actor.specialCards.length).toBe(before + 40);
    expect(drawn.size).toBeGreaterThan(1);
  });

  it('rejects when the player cannot afford 20 points', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l5-09-poor',
    });
    const actor = state.players.find((player) => player.id === 'a');

    if (actor === undefined) {
      return;
    }

    actor.points = 19;
    const result = buySpecialCard(state, actor.id, createRng('l5-09-poor'));
    expect(result.ok).toBe(false);
    expect(actor.points).toBe(19);
  });
});
