/**
 * Art source filenames — technical spec v7 §5.5 (L72-10) / v2 §4.
 *
 * The filename maps for `apps/client/src/assets/` (copied from repo `images/`), read by
 * `asset-lookup.ts` at runtime and by `scripts/extract-art.ts`, which extracts each base
 * drawing to `assets/art/{cards,kits}/<id>.png`. Never name `*(dead).png`, `Draw.png` or
 * `*_button.png`.
 */

import type { CardId, CardType, KitId } from '@card-battle/shared';

export type ResourceKind = 'life' | 'point' | 'shield' | 'upgradePoint';

export type CardBackKind = CardType | 'kit';

export interface CardArtFiles {
  base: string;
  upgraded: string;
  activatedBase?: string;
  activatedUpgraded?: string;
}

/** Filename map — single source of truth matching technical spec v2 §4 / v4. */
export const KIT_FILES = {
  untouchable: 'Untouchable.png',
  kamikaze: 'Kamikaze.png',
  scientific: 'Scientist.png',
  assassin: 'Assassin.png',
  upgrader: 'Upgrader.png',
  tactician: 'Tactician.png',
  indestructible: 'Indestructible.png',
  prophet: 'Prophet.png',
  specialist: 'Specialist.png',
  witch: 'Witch.png',
  warrior: 'Warrior.png',
  wizard: 'Magician.png',
  juggernaut: 'Juggernaut.png',
  ghost: 'Ghost.png',
  duplicator: 'Duplicator.png',
  gambler: 'Gambler.png',
} as const satisfies Record<KitId, string>;

export const CARD_FILES = {
  'basic-attack': { base: 'Basic attack.png', upgraded: 'Basic attack +.png' },
  'strong-attack': { base: 'Strong attack.png', upgraded: 'Strong attack +.png' },
  'super-attack': { base: 'Super attack.png', upgraded: 'Super attack +.png' },
  spy: { base: 'Spy.png', upgraded: 'Spy +.png' },
  thief: { base: 'Thief.png', upgraded: 'Thief +.png' },
  mirror: { base: 'Mirror.png', upgraded: 'Mirror +.png' },
  shield: { base: 'Shield.png', upgraded: 'Shield +.png' },
  tax: { base: 'Tax.png', upgraded: 'Tax +.png' },
  regeneration: { base: 'Regeneration.png', upgraded: 'Regeneration +.png' },
  absorber: { base: 'Absorption.png', upgraded: 'Absorption +.png' },
  suicide: { base: 'Suicide.png', upgraded: 'Suicide +.png' },
  'spy-thief': { base: 'Spy-Thief.png', upgraded: 'Spy-Thief +.png' },
  imposition: {
    base: 'Imposition.png',
    upgraded: 'Imposition +.png',
    activatedBase: 'Imposition (activated).png',
    activatedUpgraded: 'Imposition + (activated).png',
  },
  cloning: { base: 'Cloning.png', upgraded: 'Cloning +.png' },
  sentence: { base: 'Sentence.png', upgraded: 'Sentence +.png' },
  'points-generator': {
    base: 'Generator.png',
    upgraded: 'Generator +.png',
    activatedBase: 'Generator (activated).png',
    activatedUpgraded: 'Generator + (activated).png',
  },
  'upgrade-point-thief': {
    base: 'Upgrade Point Thief.png',
    upgraded: 'Upgrade Point Thief +.png',
  },
  block: {
    base: 'Block.png',
    upgraded: 'Block +.png',
    activatedBase: 'Block (activated).png',
    activatedUpgraded: 'Block + (activated).png',
  },
  'super-regeneration': {
    base: 'Super Regeneration.png',
    upgraded: 'Super Regeneration +.png',
  },
  'card-thief': { base: 'Card Thief.png', upgraded: 'Card Thief +.png' },
  'card-transformer': {
    base: 'Card Transformer.png',
    upgraded: 'Card Transformer +.png',
  },
  invisibility: {
    base: 'Invisibility.png',
    upgraded: 'Invisibility +.png',
    activatedBase: 'Invisibility (activated).png',
    activatedUpgraded: 'Invisibility + (activated).png',
  },
  reanimation: {
    base: 'Reanimation.png',
    upgraded: 'Reanimation +.png',
    activatedBase: 'Reanimation (activated).png',
    activatedUpgraded: 'Reanimation + (activated).png',
  },
  'card-absorber': { base: 'Card Absorber.png', upgraded: 'Card Absorber +.png' },
  'mega-attack': { base: 'MEGA ATTACK.png', upgraded: 'MEGA ATTACK +.png' },
  'super-mirror': { base: 'Super Mirror.png', upgraded: 'Super Mirror +.png' },
  'super-absorber': {
    base: 'Super Absorber.png',
    upgraded: 'Super Absorber +.png',
    activatedBase: 'Super Absorber (activated).png',
    activatedUpgraded: 'Super Absorber + (activated).png',
  },
  curse: {
    base: 'Curse.png',
    upgraded: 'Curse +.png',
    activatedBase: 'Curse (activated).png',
    activatedUpgraded: 'Curse + (activated).png',
  },
  poison: {
    base: 'Poison.png',
    upgraded: 'Poison +.png',
    activatedBase: 'Poison (activated).png',
    activatedUpgraded: 'Poison + (activated).png',
  },
  'attack-thief': { base: 'Attack Thief.png', upgraded: 'Attack Thief +.png' },
  roulette: {
    base: 'Roulette.png',
    upgraded: 'Roulette +.png',
    activatedBase: 'Roulette (activated).png',
    activatedUpgraded: 'Roulette + (activated).png',
  },
} as const satisfies Record<CardId, CardArtFiles>;

export const RESOURCE_FILES = {
  life: 'life.png',
  point: 'point.png',
  shield: 'shield_point.png',
  upgradePoint: 'upgrade_point.png',
} as const satisfies Record<ResourceKind, string>;

export const BACK_FILES = {
  attack: 'verso attack card.png',
  action: 'verso action card.png',
  special: 'verso_special_card.png',
  kit: 'verso kit.png',
} as const satisfies Record<CardBackKind, string>;
