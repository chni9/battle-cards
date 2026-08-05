/**
 * Kit inspect trait / ability coverage keys — backlog L30-05.
 * Kept outside the Dialog component file for react-refresh.
 */

import type { KitId, KitTraits } from '@card-battle/shared';

/**
 * Every `KitTraits` field must have a dialog section.
 * Adding a trait without extending this list fails the companion test.
 */
export const KIT_TRAIT_SECTION_KEYS = [
  'alwaysUpgraded',
  'immuneTo',
  'allowsMultipleAttacksPerTurn',
  'upgradePointBuyCost',
  'upgradePointSellYield',
] as const satisfies readonly (keyof KitTraits)[];

/** Kit-id abilities that are not `KitTraits` fields (Ghost, Duplicator, …). */
export const KIT_ABILITY_COPY: Partial<Record<KitId, string>> = {
  ghost:
    "Every life this player loses (any cause except Cloning's resource copy) grants 2 points — after shield absorption.",
  duplicator:
    "Instead of a normal action, activate duplication for the following table round: copy opponents' life, point, and upgrade-point gains (not shield, not Cloning's resource copy). Renew each turn. Two Duplicators do not loop.",
  prophet:
    'Starts with 2 special cards drawn at random from all 20 specials (duplicates allowed).',
};
