import { describe, expect, it } from 'vitest';

import {
  attackTargetOpponents,
  thiefTargetOpponents,
  type AttackTargetSeat,
} from './attack-targets';

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

  it('includes an eliminated player who still has a Thief on you', () => {
    const pending = [
      {
        id: 'fx-thief',
        cardId: 'thief' as const,
        sourcePlayerId: 'alpha',
        targetPlayerId: you,
      },
    ];
    expect(
      thiefTargetOpponents([living, corpse, otherCorpse], pending, you).map(
        (player) => player.id,
      ),
    ).toEqual(['bravo', 'alpha']);
    expect(attackTargetOpponents([living, corpse], pending, you).map((player) => player.id)).toEqual([
      'bravo',
    ]);
  });
});
