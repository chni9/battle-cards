/** Kit pick copy: technical spec v7 §10.1 (Lot 76 rows, Q11 = B); designer review in the PR (L76-03). */
import { describe, expect, it } from 'vitest';

import { KIT_PICKER_LEAD, KIT_PRIVACY_COPY, RANDOM_KIT_ASSIGN_COPY, RANDOM_KIT_PRIVACY_COPY } from './kit-pick-copy';

describe('kit pick copy (spec v7 §10.1, L76-03)', () => {
  it('says who sees a kit with the Lot 69 wording, and that Random draws from the allowed kits', () => {
    expect(KIT_PRIVACY_COPY).toBe('Opponents see your kit only with an upgraded Spy or Spy Thief, or once you are eliminated.');
    expect(KIT_PICKER_LEAD).toBe('Opponents see your kit only with an upgraded Spy or Spy Thief, or once you are eliminated. Random is the default.');
    expect(RANDOM_KIT_ASSIGN_COPY).toBe('The server assigns one of the allowed kits at random when the game starts.');
    expect(RANDOM_KIT_PRIVACY_COPY).toBe('Opponents see which kit you received only with an upgraded Spy or Spy Thief, or once you are eliminated.');
  });
});
