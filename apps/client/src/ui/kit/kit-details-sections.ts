/**
 * Kit details sections — technical spec v7 §6.6.5 (the kit sheet shows every current section),
 * L30-05 (every `KitTraits` field has a section), L72-15.
 *
 * The ids are the display order. The titles are the V6 kit inspect titles verbatim. Kept
 * outside `kit-details.tsx` so that file exports components only (react-refresh).
 */

import type { KIT_TRAIT_SECTION_KEYS } from '../../view-model/kit-inspect-traits';

export const KIT_DETAILS_SECTION_IDS = [
  'starting-resources',
  'starting-hand',
  'special-cards',
  'always-upgraded',
  'immune-to',
  'attacks-per-turn',
  'upgrade-points',
  'draw-risk',
  'ability',
] as const;

export type KitDetailsSectionId = (typeof KIT_DETAILS_SECTION_IDS)[number];

export const KIT_DETAILS_SECTION_TITLES: Record<KitDetailsSectionId, string> = {
  'starting-resources': 'Starting resources',
  'starting-hand': 'Starting hand',
  'special-cards': 'Special cards',
  'always-upgraded': 'Always upgraded',
  'immune-to': 'Immune to',
  'attacks-per-turn': 'Attacks per turn',
  'upgrade-points': 'Upgrade points',
  'draw-risk': 'Draw risk',
  ability: 'Ability',
};

/**
 * Which rendered section shows each `KitTraits` field. Keyed by `KIT_TRAIT_SECTION_KEYS`, so a
 * new trait fails typecheck here as well as the L30-05 companion test, until it has a section.
 */
export const KIT_TRAIT_SECTION_FOR: Record<(typeof KIT_TRAIT_SECTION_KEYS)[number], KitDetailsSectionId> = {
  alwaysUpgraded: 'always-upgraded',
  immuneTo: 'immune-to',
  allowsMultipleAttacksPerTurn: 'attacks-per-turn',
  upgradePointBuyCost: 'upgrade-points',
  upgradePointSellYield: 'upgrade-points',
  drawBustDenominator: 'draw-risk',
};
