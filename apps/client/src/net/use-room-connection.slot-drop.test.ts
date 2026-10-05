/**
 * Slot-drop subChoiceRequired guard — Lot 69.
 */

import { describe, expect, it } from 'vitest';

import { isSubChoiceRequired } from './is-sub-choice-required';

describe('subChoiceRequired slot-drop (Lot 69)', () => {
  it('accepts server-shaped slot-drop payloads', () => {
    const payload = {
      kind: 'slot-drop' as const,
      deadlineMs: Date.now() + 40_000,
      eligibleSlots: [
        {
          kind: 'shield' as const,
          id: 'shield',
          cardId: 'shield',
          isUpgraded: false,
        },
        {
          kind: 'persistent' as const,
          id: 'p1',
          cardId: 'poison',
          isUpgraded: true,
        },
      ],
    };

    expect(isSubChoiceRequired(payload)).toBe(true);
  });

  it('rejects slot-drop payloads missing eligible slot fields', () => {
    expect(
      isSubChoiceRequired({
        kind: 'slot-drop',
        deadlineMs: Date.now() + 40_000,
        eligibleSlots: [{ id: 'x', cardId: 'tax' }],
      }),
    ).toBe(false);
  });
});
