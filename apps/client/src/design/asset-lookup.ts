/**
 * Typed art lookup — technical spec v2 §4 / v4 §3.1, L30-01.
 *
 * Source files live under `apps/client/src/assets/` (copied from repo `images/`).
 * Never import `*(dead).png`, `Draw.png`, or `*_button.png`.
 *
 * Activated art: pass `activated: true` only for cards currently in
 * `activePersistentEffects` (and Block's consecutive-turn window when surfaced).
 */

import {
  ACTION_CARD_IDS,
  ATTACK_CARD_IDS,
  SPECIAL_CARD_IDS,
  type CardId,
  type CardType,
  type KitId,
} from '@card-battle/shared';

type ResourceKind = 'life' | 'point' | 'shield' | 'upgradePoint';

type CardBackKind = CardType | 'kit';

interface CardArtFiles {
  base: string;
  upgraded: string;
  activatedBase?: string;
  activatedUpgraded?: string;
}

/** Filename map — single source of truth matching technical spec v2 §4 / v4. */
const KIT_FILES = {
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
} as const satisfies Record<KitId, string>;

const CARD_FILES = {
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
} as const satisfies Record<CardId, CardArtFiles>;

/** Every playable card id with shipped art (3 attack + 7 action + 20 special). */
export const ALL_ART_CARD_IDS: readonly CardId[] = [
  ...ATTACK_CARD_IDS,
  ...ACTION_CARD_IDS,
  ...SPECIAL_CARD_IDS,
];

const CARDS_WITH_ACTIVATED_ART = [
  'imposition',
  'points-generator',
  'block',
  'invisibility',
  'reanimation',
  'super-absorber',
  'curse',
  'poison',
] as const satisfies readonly CardId[];

const RESOURCE_FILES = {
  life: 'life.png',
  point: 'point.png',
  shield: 'shield_point.png',
  upgradePoint: 'upgrade_point.png',
} as const satisfies Record<ResourceKind, string>;

const BACK_FILES = {
  attack: 'verso attack card.png',
  action: 'verso action card.png',
  special: 'verso_special_card.png',
  kit: 'verso kit.png',
} as const satisfies Record<CardBackKind, string>;

const kitModules = import.meta.glob<string>('../assets/kits/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

const cardModules = import.meta.glob<string>('../assets/cards/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

const iconModules = import.meta.glob<string>('../assets/icons/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

const backModules = import.meta.glob<string>('../assets/backs/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

function urlFromGlob(modules: Record<string, string>, fileName: string, folder: string): string {
  const suffix = `/${folder}/${fileName}`;
  const entry = Object.entries(modules).find(([path]) => path.endsWith(suffix));
  if (entry === undefined) {
    throw new Error(`Missing asset: ${folder}/${fileName}`);
  }
  return entry[1];
}

export function getKitPortraitUrl(kitId: KitId): string {
  return urlFromGlob(kitModules, KIT_FILES[kitId], 'kits');
}

export function getOpponentPlaceholderUrl(): string {
  return urlFromGlob(backModules, 'opponent.png', 'backs');
}

export function getCardArtUrl(
  cardId: CardId,
  opts: { isUpgraded: boolean; activated?: boolean },
): string {
  const files = CARD_FILES[cardId];
  const activated = opts.activated === true;

  if (activated) {
    const activatedFile = opts.isUpgraded
      ? ('activatedUpgraded' in files ? files.activatedUpgraded : undefined)
      : ('activatedBase' in files ? files.activatedBase : undefined);
    if (activatedFile === undefined) {
      throw new Error(`Card ${cardId} has no activated art`);
    }
    return urlFromGlob(cardModules, activatedFile, 'cards');
  }

  const file = opts.isUpgraded ? files.upgraded : files.base;
  return urlFromGlob(cardModules, file, 'cards');
}

export function getResourceIconUrl(kind: ResourceKind): string {
  return urlFromGlob(iconModules, RESOURCE_FILES[kind], 'icons');
}

export function getCardBackUrl(type: CardBackKind): string {
  return urlFromGlob(backModules, BACK_FILES[type], 'backs');
}

export function getAttackLogoUrl(): string {
  return urlFromGlob(backModules, 'attack_logo.png', 'backs');
}

export function getActionLogoUrl(): string {
  return urlFromGlob(backModules, 'action_logo.png', 'backs');
}

/** @deprecated Use `ALL_ART_CARD_IDS` — kept for call sites that still name V1. */
export const V1_CARD_IDS: readonly CardId[] = ALL_ART_CARD_IDS;

export { CARDS_WITH_ACTIVATED_ART };

export type { ResourceKind, CardBackKind };
