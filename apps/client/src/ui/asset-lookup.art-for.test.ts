/** artFor — technical spec v7 §5.5 (L72-10); global-art-catalog, global-art-lot63-gambler-roulette, global-activated-art-guard. */
import { KIT_IDS, type CardId } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { ALL_ART_CARD_IDS, ART_FALLBACK_URL, artFor } from './asset-lookup';

describe('artFor (technical spec v7 §5.5, L72-10)', () => {
  it('resolves every card id to art/cards/<id>.png', () => {
    expect(ALL_ART_CARD_IDS).toHaveLength(31);
    for (const id of ALL_ART_CARD_IDS) expect(artFor(id)).toMatch(new RegExp(`/art/cards/${id}\\.png$`));
  });
  it('resolves every kit id to art/kits/<id>.png', () => {
    expect(KIT_IDS).toHaveLength(16);
    for (const id of KIT_IDS) expect(artFor(id)).toMatch(new RegExp(`/art/kits/${id}\\.png$`));
  });
  it('includes Roulette and Gambler (L63-01 / L63-03)', () => {
    expect(artFor('roulette')).toMatch(/\/art\/cards\/roulette\.png$/);
    expect(artFor('gambler')).toMatch(/\/art\/kits\/gambler\.png$/);
  });
  it('never resolves dead, Draw, button or activated art', () => {
    const urls = [...ALL_ART_CARD_IDS.map((id) => artFor(id)), ...KIT_IDS.map((id) => artFor(id))];
    expect(urls).toHaveLength(47);
    for (const url of urls) {
      expect(url).not.toMatch(/\(dead\)|Draw\.png|button/);
      expect(url).not.toMatch(/activated/i);
    }
  });
  it('falls back instead of throwing when an id has no drawing', () => {
    const unknown = 'not-a-card' as CardId; // a corrupt id from the wire
    expect(() => artFor(unknown)).not.toThrow();
    expect(artFor(unknown)).toBe(ART_FALLBACK_URL);
    expect(ART_FALLBACK_URL).toMatch(/^data:image\/svg\+xml,/);
  });
});
