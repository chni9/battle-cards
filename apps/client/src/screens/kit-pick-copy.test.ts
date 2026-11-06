/** Kit pick copy: technical spec v7 §10.1 (Lot 76 rows, Q11 = B); designer review in the PR (L76-03). */
import { describe, expect, it } from 'vitest';

import {
  CHOOSE_KIT_LABEL,
  KIT_PICKER_LEAD,
  KIT_PRIVACY_COPY,
  RANDOM_KIT_ASSIGN_COPY,
  RANDOM_KIT_PRIVACY_COPY,
  RANDOM_ONLY_LOBBY_LINE,
  RANDOM_ONLY_SOLO_LINE,
} from './kit-pick-copy';

describe('kit pick copy (spec v7 §10.1, L76-03)', () => {
  it('says who sees a kit with the Lot 69 wording, and that Random draws from the allowed kits', () => {
    expect(KIT_PRIVACY_COPY).toBe('Opponents see your kit only with an upgraded Spy or Spy Thief, or once you are eliminated.');
    expect(KIT_PICKER_LEAD).toBe('Opponents see your kit only with an upgraded Spy or Spy Thief, or once you are eliminated. Random is the default.');
    expect(RANDOM_KIT_ASSIGN_COPY).toBe('The server assigns one of the allowed kits at random when the game starts.');
    expect(RANDOM_KIT_PRIVACY_COPY).toBe('Opponents see which kit you received only with an upgraded Spy or Spy Thief, or once you are eliminated.');
  });

  it('says that Random only deals the kits, in the lobby (the host) and on the solo menu (L76-10)', () => {
    expect(RANDOM_ONLY_LOBBY_LINE).toBe('The host is dealing kits at random.');
    expect(RANDOM_ONLY_SOLO_LINE).toBe('Kits will be dealt at random.');
  });

  it('names the kit picker and the control that opens it with one string, in the lobby and on the solo menu (L76-11)', () => {
    expect(CHOOSE_KIT_LABEL).toBe('Choose kit');
  });
});
