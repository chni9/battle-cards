import { describe, expect, it } from 'vitest';

import { KIT_IDS } from './kit';
import { getKit, KIT_CATALOG } from './kit-catalog';

describe('KIT_CATALOG', () => {
  it('covers every registered kit id exactly once', () => {
    expect(Object.keys(KIT_CATALOG).sort()).toEqual([...KIT_IDS].sort());
  });

  it('matches the roster resources and card counts (rules spec §4 / tech v4 §8.2)', () => {
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

    expect(getKit('indestructible').startingResources).toEqual({
      lives: 18,
      points: 0,
      upgradePoints: 0,
      draw: 1,
    });
    expect(getKit('indestructible').startingCardCounts).toEqual({ action: 4, attack: 1 });
    expect(getKit('indestructible').traits.alwaysUpgraded).toEqual(['tax', 'regeneration']);
    expect(getKit('indestructible').specialCards).toEqual(['super-regeneration']);

    expect(getKit('specialist').startingResources).toEqual({
      lives: 8,
      points: 4,
      upgradePoints: 0,
      draw: 1,
    });
    expect(getKit('specialist').startingCardCounts).toEqual({ action: 3, attack: 2 });
    expect(getKit('specialist').traits.alwaysUpgraded).toEqual(['absorber']);
    expect(getKit('specialist').specialCards).toEqual([
      'card-transformer',
      'card-transformer',
      'card-thief',
      'super-absorber',
    ]);

    expect(getKit('witch').startingResources).toEqual({
      lives: 10,
      points: 0,
      upgradePoints: 1,
      draw: 1,
    });
    expect(getKit('witch').startingCardCounts).toEqual({ action: 5, attack: 2 });
    expect(getKit('witch').traits.alwaysUpgraded).toEqual(['thief']);
    expect(getKit('witch').specialCards).toEqual(['reanimation', 'poison']);

    expect(getKit('wizard').startingResources).toEqual({
      lives: 10,
      points: 4,
      upgradePoints: 0,
      draw: 2,
    });
    expect(getKit('wizard').startingCardCounts).toEqual({ action: 4, attack: 2 });
    expect(getKit('wizard').traits.alwaysUpgraded).toEqual(['thief']);
    expect(getKit('wizard').specialCards).toEqual(['mega-attack']);

    expect(getKit('juggernaut').startingResources).toEqual({
      lives: 14,
      points: 4,
      upgradePoints: 1,
      draw: 1,
    });
    expect(getKit('juggernaut').startingCardCounts).toEqual({ action: 4, attack: 2 });
    expect(getKit('juggernaut').traits.alwaysUpgraded).toEqual(['shield']);
    expect(getKit('juggernaut').specialCards).toEqual(['super-mirror']);

    expect(getKit('ghost').startingResources).toEqual({
      lives: 14,
      points: 0,
      upgradePoints: 0,
      draw: 1,
    });
    expect(getKit('ghost').startingCardCounts).toEqual({ action: 4, attack: 2 });
    expect(getKit('ghost').specialCards).toEqual(['curse']);

    expect(getKit('duplicator').startingResources).toEqual({
      lives: 2,
      points: 0,
      upgradePoints: 0,
      draw: 1,
    });
    expect(getKit('duplicator').startingCardCounts).toEqual({ action: 1, attack: 0 });
    expect(getKit('duplicator').specialCards).toEqual(['imposition', 'attack-thief']);
  });
});
