/**
 * Shop sheet labels: technical spec v7 §6.8; Appendix A `shop-dialog` (V2 copy, L74-14).
 */
import type { SharedCardId } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { shop, type ShopCardTile } from '../../view-model/shop';
import { makePlayingView, makeSelf } from '../../view-model/test-fixtures';
import { poolHeading, shopInspectLabel, shopTileLabel } from './shop-sheet-model';

function tileOf(kitId: 'kamikaze' | 'tactician', points: number, cardId: SharedCardId): ShopCardTile {
  const model = shop(makePlayingView({ self: makeSelf({ kitId, points }) }), { subChoice: null, readOnly: false });
  const found = model.cards.tiles.find((entry) => entry.cardId === cardId);
  if (found === undefined) throw new Error(`no ${cardId} tile`);
  return found;
}

describe('shop sheet model (L74-14)', () => {
  it("labels a tile with V2's words: name, upgraded, spoken price, cannot afford", () => {
    expect(shopTileLabel(tileOf('kamikaze', 4, 'spy'))).toBe('Spy, minus 4 pts');
    expect(shopTileLabel(tileOf('tactician', 4, 'spy'))).toBe('Spy upgraded, minus 4 pts');
    expect(shopTileLabel(tileOf('kamikaze', 4, 'super-attack'))).toBe('Super attack, minus 20 pts, cannot afford');
    expect(shopTileLabel(tileOf('kamikaze', 0, 'tax'))).toBe('Tax, minus 2 lives');
  });

  it('names the inspect button and the pool heading with V2 words', () => {
    expect(shopInspectLabel(tileOf('kamikaze', 0, 'mirror'))).toBe('Inspect Mirror');
    expect([poolHeading(0), poolHeading(3)]).toEqual(['Pool (0)', 'Pool (3)']);
  });
});
