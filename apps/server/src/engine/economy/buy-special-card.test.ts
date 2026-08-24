/**
 * Special card purchase — rules spec §5, L5-09, L21-01 / #V4-29.
 */

import { SPECIAL_CARD_IDS } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { createRng } from '../rng';
import { createInitialState } from '../create-initial-state';
import { buySpecialCard, SPECIAL_CARD_PURCHASE_COST } from './buy-special-card';

describe('buySpecialCard (L21-01 / #V4-29)', () => {
  it('draws from all 20 SPECIAL_CARD_IDS', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l21-01',
    });
    const actor = state.players.find((player) => player.id === 'a');

    if (actor === undefined) {
      throw new Error('missing actor');
    }

    actor.points = SPECIAL_CARD_PURCHASE_COST * 200;
    const before = actor.specialCards.length;
    const drawn = new Set<string>();

    for (let i = 0; i < 120; i += 1) {
      const rng = createRng(`l21-01-draw-${String(i)}`);
      const result = buySpecialCard(state, actor.id, rng);
      expect(result.ok).toBe(true);

      if (!result.ok) {
        return;
      }

      expect((SPECIAL_CARD_IDS as readonly string[]).includes(result.instance.cardId)).toBe(
        true,
      );
      drawn.add(result.instance.cardId);
    }

    expect(actor.specialCards.length).toBe(before + 120);
    expect(drawn.size).toBeGreaterThan(6);
    expect(drawn.has('reanimation')).toBe(true);
    expect(drawn.has('card-transformer')).toBe(true);
  });

  it('rejects when the player cannot afford 20 points', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l21-01-poor',
    });
    const actor = state.players.find((player) => player.id === 'a');

    if (actor === undefined) {
      throw new Error('missing actor');
    }

    actor.points = 19;
    const result = buySpecialCard(state, actor.id, createRng('l21-01-poor'));
    expect(result.ok).toBe(false);
    expect(actor.points).toBe(19);
  });
});
