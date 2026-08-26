import { describe, expect, it } from 'vitest';

import { getCard, SHARED_CARD_CATALOG } from './card-catalog';
import {
  formatCardCost,
  formatCardEffectText,
  formatCardLabel,
  formatPlayCost,
} from './card-label';
import { SPECIAL_CARD_CATALOG } from './special-card-catalog';
import { SHARED_CARD_IDS, SPECIAL_CARD_IDS } from './card';

describe('formatCardLabel', () => {
  it('appends + for upgraded copies', () => {
    expect(formatCardLabel('basic-attack', false)).toBe('Basic attack');
    expect(formatCardLabel('basic-attack', true)).toBe('Basic attack +');
  });
});

describe('formatCardCost / formatPlayCost', () => {
  it('formats points, lives, and points-per-life', () => {
    expect(formatCardCost({ points: 1 })).toBe('1 pt');
    expect(formatCardCost({ points: 4 })).toBe('4 pts');
    expect(formatCardCost({ lives: 1 })).toBe('1 life');
    expect(formatCardCost({ lives: 2 })).toBe('2 lives');
    expect(formatCardCost({ pointsPerLife: 3 })).toBe('3 pts/life');
  });

  it('uses Regeneration upgraded rate from rules §3', () => {
    const regen = SHARED_CARD_CATALOG.regeneration;
    expect(formatPlayCost(regen, false)).toBe('3 pts/life');
    expect(formatPlayCost(regen, true)).toBe('2 pts/life');
  });
});

describe('formatCardEffectText (L51-05)', () => {
  it('shows base effect plus upgradeAdds when not upgraded, with no Cost prefix', () => {
    const card = SHARED_CARD_CATALOG['basic-attack'];
    expect(formatCardEffectText(card, false)).toBe(
      `${card.effect}\n\nUpgrade: ${card.upgradeAdds}`,
    );
    expect(formatCardEffectText(card, false)).not.toMatch(/^Cost:/);
    expect(formatCardEffectText(card, false)).not.toContain('Deal 3 damage to an opponent.');
  });

  it('shows only the upgraded description when upgraded', () => {
    const card = SHARED_CARD_CATALOG.absorber;
    expect(formatCardEffectText(card, true)).toBe(card.upgradeEffect);
    expect(formatCardEffectText(card, true)).not.toContain('Upgrade:');
    expect(formatCardEffectText(card, true)).not.toContain(card.effect);
    expect(formatCardEffectText(card, true)).not.toMatch(/^Cost:/);
  });

  it('keeps upgradeEffect as a standalone upgraded description for specials', () => {
    const card = SPECIAL_CARD_CATALOG.block;
    expect(card.upgradeEffect).toContain('7 consecutive turns');
    expect(formatCardEffectText(card, true)).toBe(card.upgradeEffect);
    expect(formatCardEffectText(card, false)).toContain(card.effect);
    expect(formatCardEffectText(card, false)).toContain(card.upgradeAdds);
    expect(formatCardEffectText(card, false)).not.toBe(card.upgradeEffect);
  });

  it('has upgradeAdds on every catalog card', () => {
    const ids = [...SHARED_CARD_IDS, ...SPECIAL_CARD_IDS];
    for (const id of ids) {
      const card = getCard(id);
      expect(card?.upgradeAdds.length).toBeGreaterThan(0);
    }
  });

  it('locks derived upgradeAdds copy (L51-05)', () => {
    expect(SHARED_CARD_CATALOG['basic-attack'].upgradeAdds).toBe(
      'Deal 3 damage instead of 1.',
    );
    expect(SHARED_CARD_CATALOG['strong-attack'].upgradeAdds).toBe(
      'Deal 4 damage instead of 2.',
    );
    expect(SHARED_CARD_CATALOG['super-attack'].upgradeAdds).toBe(
      'Deal 10 damage instead of 7.',
    );
    expect(SHARED_CARD_CATALOG.spy.upgradeAdds).toBe(
      'Also see live lives, points, upgrade points, and shield.',
    );
    expect(SPECIAL_CARD_CATALOG.sentence.upgradeAdds).toBe(
      'The random draw never picks you.',
    );
    expect(SPECIAL_CARD_CATALOG['mega-attack'].upgradeAdds).toBe(
      'Cannot be redirected.',
    );
  });
});
