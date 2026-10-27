/**
 * Card face helpers — technical spec v7 §5.4 (sizes, chips, states), L56-04 (listed damage ×
 * the Mirror multiplier), L56-06 / L58-06 (card lives and Invisibility turns counters) and
 * rules spec §1–§3 (play costs, the upgraded Regeneration rate).
 */

import {
  ATTACK_CARD_IDS,
  SPECIAL_ATTACK_CARD_IDS,
  getCard,
} from '@card-battle/shared';
import { describe, expect, it } from 'vitest';
import { ALL_ART_CARD_IDS } from '../asset-lookup';
import { WCAG_AA_TEXT, contrastRatio } from '../contrast';
import { V7_COLORS } from '../palette';
import {
  CARD_NAME_FIT,
  CARD_SIZES,
  HIDDEN_CARD_LABEL,
  cardCostChip,
  cardCounterLabel,
  cardDamageChip,
  cardFaceLabel,
  cardFamilyOf,
  cardNameFontSize,
  cardNameWordEm,
} from './card-face';

/** [id, base, upgraded] — rules spec §2 attack table. */
const DAMAGE = [
  ['basic-attack', 1, 3],
  ['strong-attack', 2, 4],
  ['super-attack', 7, 10],
  ['mega-attack', 20, 20],
] as const;

describe('CARD_SIZES (spec v7 §5.4)', () => {
  it('lists the five sizes in order', () => {
    expect(CARD_SIZES).toEqual(['hand', 'lifted', 'sheet', 'thumb', 'tile']);
  });
});

describe('cardDamageChip (L56-04)', () => {
  it('covers every attack id', () => {
    expect(new Set(DAMAGE.map(([id]) => id))).toEqual(
      new Set([...ATTACK_CARD_IDS, ...SPECIAL_ATTACK_CARD_IDS]),
    );
  });

  it('equals catalog damage × multiplier, base and upgraded', () => {
    for (const [id, base, upgraded] of DAMAGE) {
      expect(cardDamageChip(id, false)).toBe(base);
      expect(cardDamageChip(id, true)).toBe(upgraded);
      expect(cardDamageChip(id, false, 2)).toBe(base * 2);
      expect(cardDamageChip(id, true, 2)).toBe(upgraded * 2);
    }
  });

  it('is null for Tax, Absorber and Super Mirror', () => {
    for (const id of ['tax', 'absorber', 'super-mirror'] as const) {
      expect(cardDamageChip(id, false)).toBeNull();
      expect(cardDamageChip(id, true, 2)).toBeNull();
    }
  });
});

describe('cardCostChip (rules spec §1–§3)', () => {
  it('reads the play cost, with the upgraded Regeneration rate', () => {
    expect(cardCostChip('basic-attack', false)).toEqual({ kind: 'points', amount: 1 });
    expect(cardCostChip('super-attack', true)).toEqual({ kind: 'points', amount: 10 });
    expect(cardCostChip('mega-attack', false)).toEqual({ kind: 'points', amount: 16 });
    expect(cardCostChip('tax', false)).toEqual({ kind: 'lives', amount: 1 });
    expect(cardCostChip('tax', true)).toEqual({ kind: 'lives', amount: 1 });
    expect(cardCostChip('regeneration', false)).toEqual({ kind: 'pointsPerLife', amount: 3 });
    expect(cardCostChip('regeneration', true)).toEqual({ kind: 'pointsPerLife', amount: 2 });
  });
});

describe('cardCounterLabel (L56-06 / L58-06)', () => {
  it('speaks card lives and turns, with singulars', () => {
    expect(cardCounterLabel({ kind: 'card-lives', amount: 1 })).toBe('1 card life');
    expect(cardCounterLabel({ kind: 'card-lives', amount: 3 })).toBe('3 card lives');
    expect(cardCounterLabel({ kind: 'turns', amount: 1 })).toBe('1 turn remaining');
    expect(cardCounterLabel({ kind: 'turns', amount: 4 })).toBe('4 turns remaining');
  });
});

describe('cardFaceLabel', () => {
  it('names the card with its upgrade state, damage and counter', () => {
    expect(cardFaceLabel({ name: 'Poison', isUpgraded: false, damage: null })).toBe('Poison');
    expect(cardFaceLabel({ name: 'Strong attack', isUpgraded: true, damage: 4 })).toBe(
      'Strong attack upgraded, 4 damage',
    );
    expect(
      cardFaceLabel({
        name: 'Points Generator',
        isUpgraded: true,
        damage: null,
        counter: { kind: 'card-lives', amount: 1 },
      }),
    ).toBe('Points Generator upgraded, 1 card life');
    expect(
      cardFaceLabel({
        name: 'Invisibility',
        isUpgraded: false,
        damage: null,
        counter: { kind: 'turns', amount: 3 },
      }),
    ).toBe('Invisibility, 3 turns remaining');
  });
});

describe('cardFamilyOf', () => {
  it('matches the catalog type for every card', () => {
    for (const id of ALL_ART_CARD_IDS) {
      expect(cardFamilyOf(id)).toBe(getCard(id)?.type);
    }
    expect(cardFamilyOf('mega-attack')).toBe('special');
    expect(cardFamilyOf('tax')).toBe('action');
    expect(cardFamilyOf('basic-attack')).toBe('attack');
  });
});

describe('cardNameWordEm and cardNameFontSize (L72-12 fix round 1, A4)', () => {
  /** Face width = card width minus the 2 px rim on each side. */
  const fitPx = (name: string, size: 'hand' | 'lifted' | 'sheet' | 'tile', cardPx: number): number =>
    ((CARD_NAME_FIT[size].textPct / 100) * (cardPx - 4)) / cardNameWordEm(name);
  const names = ALL_ART_CARD_IDS.map((id) => getCard(id)?.name ?? id);

  it('measures the widest word, so a long name fits by its longest word', () => {
    expect(cardNameWordEm('Super Regeneration')).toBe(cardNameWordEm('Regeneration'));
    expect(cardNameWordEm('Regeneration')).toBeGreaterThan(cardNameWordEm('Super'));
    expect(cardNameWordEm('Tax')).toBeLessThan(2);
    expect(cardNameWordEm('é')).toBeCloseTo(0.795, 5);
  });

  it('fits every catalog name whole at each size floor: 10 px on a 64 px hand card, 11 px elsewhere', () => {
    for (const name of names) {
      expect(fitPx(name, 'hand', 64), name).toBeGreaterThanOrEqual(10);
      expect(fitPx(name, 'lifted', 80), name).toBeGreaterThanOrEqual(11);
      expect(fitPx(name, 'tile', 88), name).toBeGreaterThanOrEqual(11);
      expect(fitPx(name, 'sheet', 200), name).toBeGreaterThanOrEqual(11);
    }
  });

  it('keeps every hand name at 11 px on a 375 px phone (71.25 px card)', () => {
    for (const name of names) expect(fitPx(name, 'hand', 71.25), name).toBeGreaterThanOrEqual(11);
  });

  it('writes the floor, the base and the container-relative fit', () => {
    expect(cardNameFontSize('Regeneration', 'hand')).toMatch(/^max\(10px, min\(max\(11px, 11cqi\), \d+\.\d{2}cqi\)\)$/);
    expect(cardNameFontSize('Tax', 'lifted')).toMatch(/^max\(11px, min\(12px, \d+\.\d{2}cqi\)\)$/);
  });
});

describe('hidden label and chip contrast (spec v7 §5.1)', () => {
  it('labels a hidden face "Hidden card"', () => {
    expect(HIDDEN_CARD_LABEL).toBe('Hidden card');
  });

  it('keeps chip numerals at AA: --text-on-cta on --life, --text on --panel-2', () => {
    expect(contrastRatio(V7_COLORS['text-on-cta'], V7_COLORS.life)).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
    expect(contrastRatio(V7_COLORS.text, V7_COLORS['panel-2'])).toBeGreaterThanOrEqual(WCAG_AA_TEXT);
  });
});
