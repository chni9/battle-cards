import { describe, expect, it } from 'vitest';

import { DISABLED_REASON_COPY, DISABLED_REASONS, availabilityFor } from './action-reasons';

describe('disabled reasons (spec v7 §10.6, §11)', () => {
  it('pins one copy string per reason, in DISABLED_REASONS order', () => {
    expect(Object.keys(DISABLED_REASON_COPY)).toEqual([...DISABLED_REASONS]);
    expect(DISABLED_REASON_COPY).toEqual({
      'not-your-turn': 'Not your turn',
      'actions-locked': 'Actions locked',
      invisibility: "Invisible: you can't act on other players",
      'attack-ban': 'Block: attacks banned this turn',
      'not-enough-points': 'Not enough points',
      'not-enough-lives': 'Not enough lives',
      'no-upgrade-point': 'No upgrade points',
      'no-valid-target': 'No valid target',
      'nothing-to-consume': 'No action or attack card in hand to transform.',
      'temporarily-unavailable': 'Temporarily unavailable',
      'no-living-spy': 'Nobody is spying on you',
      'pool-empty': 'Pool empty',
      'reanimation-armed': 'Reanimation already armed',
    });
  });
  it('builds an availability with a reason only when disabled', () => {
    expect(availabilityFor(null)).toEqual({ enabled: true, reason: null });
    expect(availabilityFor('pool-empty')).toEqual({ enabled: false, reason: 'pool-empty' });
  });
});
