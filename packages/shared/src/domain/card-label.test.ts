import { describe, expect, it } from 'vitest';

import { SHARED_CARD_CATALOG } from './card-catalog';
import {
  formatCardCost,
  formatCardEffectText,
  formatCardLabel,
  formatPlayCost,
} from './card-label';
import { SPECIAL_CARD_CATALOG } from './special-card-catalog';

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

describe('formatCardEffectText', () => {
  it('prefixes play cost and shows base effect plus upgrade preview when not upgraded', () => {
    const card = SHARED_CARD_CATALOG['basic-attack'];
    expect(formatCardEffectText(card, false)).toBe(
      `Cost: 1 pt\n\n${card.effect}\n\nUpgrade: ${card.upgradeEffect}`,
    );
  });

  it('prefixes play cost and shows only the upgraded description when upgraded', () => {
    const card = SHARED_CARD_CATALOG.absorber;
    expect(formatCardEffectText(card, true)).toBe(
      `Cost: 3 pts\n\n${card.upgradeEffect}`,
    );
    expect(formatCardEffectText(card, true)).not.toContain('Upgrade:');
    expect(formatCardEffectText(card, true)).not.toContain(card.effect);
  });

  it('keeps upgradeEffect as a standalone upgraded description for specials', () => {
    const card = SPECIAL_CARD_CATALOG.block;
    expect(card.upgradeEffect).toContain('7 consecutive turns');
    expect(formatCardEffectText(card, true)).toContain(card.upgradeEffect);
    expect(formatCardEffectText(card, true)).toContain('Cost:');
    expect(formatCardEffectText(card, false)).toContain(card.effect);
    expect(formatCardEffectText(card, false)).toContain('Upgrade:');
  });
});
