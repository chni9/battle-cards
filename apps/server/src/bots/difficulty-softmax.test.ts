/**
 * Softmax difficulty sampling — L36-03 / #V5-3.
 */

import { describe, expect, it } from 'vitest';

import { createRng } from '../engine/rng';
import type { TurnAction } from '../engine/turn/perform-action';
import { sampleSoftmaxAction } from './difficulty-softmax';

describe('difficulty-softmax (L36-03)', () => {
  it('prefers the high-scoring action at mild temperature', () => {
    const draw: TurnAction = { type: 'draw' };
    const buy: TurnAction = { type: 'buyCard', cardId: 'tax' };
    const legal: TurnAction[] = [draw, buy];
    const scores = [
      { action: draw, score: 1 },
      { action: buy, score: 100 },
    ];
    const counts = new Map<string, number>();

    for (let index = 0; index < 200; index += 1) {
      const picked = sampleSoftmaxAction(
        draw,
        legal,
        scores,
        createRng(`soft-${String(index)}`),
        1.5,
      );
      const key = JSON.stringify(picked);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    expect(counts.get(JSON.stringify(buy)) ?? 0).toBeGreaterThan(
      counts.get(JSON.stringify(draw)) ?? 0,
    );
  });

  it('returns the preferred action when scores are empty', () => {
    const preferred: TurnAction = { type: 'draw' };
    expect(
      sampleSoftmaxAction(
        preferred,
        [{ type: 'draw' }, { type: 'buyCard', cardId: 'tax' }],
        [],
        createRng('x'),
      ),
    ).toEqual(preferred);
  });
});
