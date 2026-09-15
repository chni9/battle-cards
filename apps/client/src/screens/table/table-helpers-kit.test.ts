/**
 * visibleKitId follows opponent-zone Spy / death reveal — L44-02.
 */

import { describe, expect, it } from 'vitest';

import { livingSpiesOnYou, visibleKitId } from './table-helpers';

describe('visibleKitId (L44-02)', () => {
  it('returns death-reveal kit, else Spy kit, else null', () => {
    expect(
      visibleKitId({
        eliminationReveal: { kitId: 'assassin' },
        spied: { kitId: 'ghost' },
      } as never),
    ).toBe('assassin');
    expect(visibleKitId({ spied: { kitId: 'ghost' } } as never)).toBe('ghost');
    expect(visibleKitId({} as never)).toBeNull();
  });

  it('lists living spies from public spyingOnYou (L58-07)', () => {
    expect(
      livingSpiesOnYou({
        you: 'a',
        players: [
          { id: 'a', isYou: true, isEliminated: false, spyingOnYou: true },
          { id: 'b', isYou: false, isEliminated: false, spyingOnYou: true },
          { id: 'c', isYou: false, isEliminated: true, spyingOnYou: true },
          { id: 'd', isYou: false, isEliminated: false },
        ],
      } as never).map((player) => player.id),
    ).toEqual(['b']);
  });
});
