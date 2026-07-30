import { describe, expect, it } from 'vitest';

import { KIT_IDS } from './kit';
import { getKit, KIT_CATALOG } from './kit-catalog';

describe('KIT_CATALOG', () => {
  it('covers every V1 kit id exactly once', () => {
    expect(Object.keys(KIT_CATALOG).sort()).toEqual([...KIT_IDS].sort());
  });

  it('matches the V1 roster resources and card counts (rules spec §4)', () => {
    expect(getKit('untouchable').startingResources).toEqual({
      lives: 10,
      points: 0,
      upgradePoints: 0,
      draw: 1,
    });
    expect(getKit('untouchable').startingCardCounts).toEqual({ action: 5, attack: 2 });
    expect(getKit('untouchable').traits.immuneTo).toEqual(['thief', 'spy']);
    expect(getKit('untouchable').specialCards).toEqual(['spy-thief', 'imposition']);

    expect(getKit('kamikaze').startingResources).toEqual({
      lives: 4,
      points: 9,
      upgradePoints: 1,
      draw: 1,
    });
    expect(getKit('kamikaze').startingCardCounts).toEqual({ action: 7, attack: 2 });
    expect(getKit('kamikaze').specialCards).toEqual(['suicide']);

    expect(getKit('scientific').startingResources).toEqual({
      lives: 10,
      points: 0,
      upgradePoints: 0,
      draw: 1,
    });
    expect(getKit('scientific').traits.alwaysUpgraded).toEqual(['spy']);
    expect(getKit('scientific').specialCards).toEqual(['cloning']);

    expect(getKit('assassin').startingCardCounts).toEqual({ action: 4, attack: 4 });
    expect(getKit('assassin').traits.allowsMultipleAttacksPerTurn).toBe(true);
    expect(getKit('assassin').specialCards).toEqual(['sentence', 'points-generator']);
  });
});
