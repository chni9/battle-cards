/**
 * Kit portrait accessible name — technical spec v7 §11 (portrait `alt` = kit name) and §5.5.
 * The name comes from the catalog, never from the art file, so Scientific and Wizard are not
 * named after their drawings.
 */

import { KIT_IDS, getKit } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';
import { HIDDEN_KIT_LABEL } from '../../view-model/table-copy';
import { RANDOM_KIT_LABEL, kitPortraitAlt } from './kit-portrait-label';

describe('kitPortraitAlt (spec v7 §11)', () => {
  it.each(KIT_IDS)('uses the catalog name for %s', (kitId) => {
    expect(kitPortraitAlt(kitId)).toBe(getKit(kitId).name);
  });

  it('names the Random face "Random kit"', () => {
    expect(RANDOM_KIT_LABEL).toBe('Random kit');
    expect(kitPortraitAlt('random')).toBe('Random kit');
  });

  it('names an unrevealed kit "Hidden kit"', () => {
    expect(HIDDEN_KIT_LABEL).toBe('Hidden kit');
    expect(kitPortraitAlt(null)).toBe('Hidden kit');
  });

  it('uses the kit name, not the art file name, for Scientific and Wizard', () => {
    expect(kitPortraitAlt('scientific')).toBe('Scientific');
    expect(kitPortraitAlt('wizard')).toBe('Wizard');
  });
});
