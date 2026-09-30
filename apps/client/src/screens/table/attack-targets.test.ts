import { describe, expect, it } from 'vitest';

import { attackTargetOpponents, type AttackTargetSeat } from './attack-targets';

function seat(id: string, eliminated: boolean): AttackTargetSeat {
  return { id, isEliminated: eliminated, activePersistentEffects: [] };
}

describe('attackTargetOpponents', () => {
  const you = 'you';
  const living = seat('bravo', false);
  const corpse = seat('alpha', true);
  const otherCorpse = seat('charlie', true);

  it('includes an eliminated player who still has an attack on you', () => {
    const targets = attackTargetOpponents(
      [living, corpse, otherCorpse],
      [
        {
          id: 'fx-1',
          cardId: 'basic-attack',
          sourcePlayerId: 'alpha',
          targetPlayerId: you,
        },
      ],
      you,
    );
    expect(targets.map((player) => player.id)).toEqual(['bravo', 'alpha']);
  });

  it('leaves out a corpse with no pending attack', () => {
    const targets = attackTargetOpponents([living, corpse], [], you);
    expect(targets.map((player) => player.id)).toEqual(['bravo']);
  });

  it('ignores a non-attack pending effect from a corpse', () => {
    const targets = attackTargetOpponents(
      [living, corpse],
      [
        {
          id: 'fx-spy',
          cardId: 'spy',
          sourcePlayerId: 'alpha',
          targetPlayerId: you,
        },
      ],
      you,
    );
    expect(targets.map((player) => player.id)).toEqual(['bravo']);
  });
});
