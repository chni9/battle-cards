/**
 * visibleKitId follows opponent-zone Spy / death reveal — L44-02.
 */

import { describe, expect, it } from 'vitest';

import { visibleKitId } from './table-helpers';

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
});
