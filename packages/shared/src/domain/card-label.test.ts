import { describe, expect, it } from 'vitest';

import { SHARED_CARD_CATALOG } from './card-catalog';
import { formatCardEffectText, formatCardLabel } from './card-label';
import { SPECIAL_CARD_CATALOG } from './special-card-catalog';

describe('formatCardLabel', () => {
  it('appends + for upgraded copies', () => {
    expect(formatCardLabel('basic-attack', false)).toBe('Basic attack');
    expect(formatCardLabel('basic-attack', true)).toBe('Basic attack +');
  });
});

describe('formatCardEffectText', () => {
  it('shows base effect plus upgrade preview when not upgraded', () => {
    const card = SHARED_CARD_CATALOG['basic-attack'];
    expect(formatCardEffectText(card, false)).toBe(
      `${card.effect}\n\nUpgrade: ${card.upgradeEffect}`,
    );
  });

  it('shows only the upgraded description when upgraded', () => {
    const card = SHARED_CARD_CATALOG.absorber;
    expect(formatCardEffectText(card, true)).toBe(card.upgradeEffect);
    expect(formatCardEffectText(card, true)).not.toContain('Upgrade:');
    expect(formatCardEffectText(card, true)).not.toBe(card.effect);
  });

  it('keeps upgradeEffect as a standalone upgraded description for specials', () => {
    const card = SPECIAL_CARD_CATALOG.block;
    expect(card.upgradeEffect).toContain('7 consecutive turns');
    expect(formatCardEffectText(card, true)).toBe(card.upgradeEffect);
    expect(formatCardEffectText(card, false)).toContain(card.effect);
    expect(formatCardEffectText(card, false)).toContain('Upgrade:');
  });
});
