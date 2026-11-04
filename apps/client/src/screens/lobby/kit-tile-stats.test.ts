/** Kit tile stats (technical spec v7 §7.3, §5.5: values from KIT_CATALOG, never the art). L76-10. */
import { getKit, KIT_IDS } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { kitTileStats, WEIGHTED_DRAW_LABEL } from './kit-tile-stats';

describe('kitTileStats (L76-10)', () => {
  it('reads lives, points, upgrade points, Draw, action and attack from KIT_CATALOG for every kit', () => {
    for (const kitId of KIT_IDS) {
      const { startingResources: res, startingCardCounts: cards, traits } = getKit(kitId);
      expect(kitTileStats(kitId), kitId).toEqual([
        { icon: 'life', label: 'Lives', value: String(res.lives) },
        { icon: 'point', label: 'Points', value: String(res.points) },
        { icon: 'upgrade', label: 'Upgrade points', value: String(res.upgradePoints) },
        { icon: 'draw', label: 'Draw', value: traits.drawBustDenominator === undefined ? String(res.draw) : WEIGHTED_DRAW_LABEL },
        { icon: 'action', label: 'Action', value: String(cards.action) },
        { icon: 'attack', label: 'Attack', value: String(cards.attack) },
      ]);
    }
  });

  it('pins two kits by value: Tactician and Indestructible', () => {
    expect(kitTileStats('tactician').map((stat) => stat.value)).toEqual(['1', '15', '0', '4', '2', '2']);
    expect(kitTileStats('indestructible').map((stat) => stat.value)).toEqual(['18', '0', '0', '1', '4', '1']);
  });

  it('shows the weighted Draw range for a gambling kit, not the catalog 10 (designer 2026-11-03)', () => {
    expect(WEIGHTED_DRAW_LABEL).toBe('5–100');
    expect(kitTileStats('gambler').find((stat) => stat.label === 'Draw')?.value).toBe('5–100');
    expect(KIT_IDS.filter((kitId) => kitTileStats(kitId).some((stat) => stat.value === WEIGHTED_DRAW_LABEL))).toEqual(['gambler']);
  });
});
