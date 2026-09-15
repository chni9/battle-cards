/**
 * Spy matrix grant / revoke — technical spec §5.1, L58-07.
 */

import { describe, expect, it } from 'vitest';

import { createInitialState } from '../engine/create-initial-state';
import {
  findSpyRelation,
  grantSpy,
  listLivingSpiesOn,
  revokeSpy,
} from './visibility-matrix';

describe('visibility matrix (L58-07)', () => {
  it('revokes one viewer/subject row and lists only living spies', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
        { id: 'c', nickname: 'Carol' },
      ],
      seed: 'l58-07-matrix',
    });
    grantSpy(state, 'b', 'a', 'kit-and-cards');
    grantSpy(state, 'c', 'a', 'full-resources');
    const carol = state.players.find((player) => player.id === 'c');
    if (carol === undefined) {
      throw new Error('missing carol');
    }

    carol.isEliminated = true;
    expect(listLivingSpiesOn(state, 'a').map((player) => player.id)).toEqual(['b']);

    expect(revokeSpy(state, 'b', 'a')).toBe(true);
    expect(findSpyRelation(state, 'b', 'a')).toBeUndefined();
    expect(revokeSpy(state, 'b', 'a')).toBe(false);
    expect(listLivingSpiesOn(state, 'a')).toEqual([]);
  });
});
