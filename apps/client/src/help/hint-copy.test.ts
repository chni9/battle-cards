/**
 * First-real-game hint copy — technical spec v6 §5.2 / L46-01.
 */

import { describe, expect, it } from 'vitest';

import { DRAW_ACTION_LABEL, SHOP_ACTION_LABEL } from '../screens/table/chrome-labels';
import { HIDDEN_KIT_LABEL } from '../screens/table/table-copy';

import { HINT_COPY, SKIP_ALL_HINTS_LABEL } from './hint-copy';
import { HINT_IDS } from './hint-ids';

describe('hint copy (technical spec v6 §5.2)', () => {
  it('covers every HintId with spec bodies', () => {
    for (const id of HINT_IDS) {
      expect(HINT_COPY[id].body.length).toBeGreaterThan(0);
    }
    expect(HINT_COPY['your-turn'].body).toBe('Your turn — take **one** action.');
    expect(HINT_COPY.draw.body).toBe('**Draw** gives points, not a card.');
    expect(HINT_COPY.resources.body).toContain('attacks only');
    expect(HINT_COPY.incoming.body).toContain('**after you act**');
    expect(HINT_COPY['hidden-kit'].body).toContain('Spy');
    expect(HINT_COPY.shop.body).toContain('double the play cost');
    expect(SKIP_ALL_HINTS_LABEL).toBe('Skip all');
  });

  it('titles reuse table chrome words', () => {
    expect(HINT_COPY.draw.title).toBe(DRAW_ACTION_LABEL);
    expect(HINT_COPY.shop.title).toBe(SHOP_ACTION_LABEL);
    expect(HINT_COPY['hidden-kit'].title).toBe(HIDDEN_KIT_LABEL);
    expect(HINT_COPY['your-turn'].title).toBe('Your turn');
    expect(HINT_COPY.incoming.title).toBe('Incoming');
  });
});
