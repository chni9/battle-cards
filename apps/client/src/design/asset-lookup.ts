/**
 * Typed art lookup for the V1 asset subset — technical spec v2 §4, L10-03.
 *
 * Source files live under `apps/client/src/assets/` (copied from repo `images/`).
 * Never import out-of-V1 art, `*(dead).png`, `Draw.png`, or `*_button.png`.
 *
 * Activated art for Imposition / Points Generator: pass `activated: true` only for
 * cards currently in `activePersistentEffects` (PROTOCOL_VERSION 19).
 */

import {
  ACTION_CARD_IDS,
  ATTACK_CARD_IDS,
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

/** Filename map — single source of truth matching technical spec v2 §4. */
const KIT_FILES = {
  untouchable: 'Untouchable.png',
  kamikaze: 'Kamikaze.png',
  scientific: 'Scientist.png',
  assassin: 'Assassin.png',
  indestructible: 'Indestructible.png',
  specialist: 'Specialist.png',
  witch: 'Witch.png',
  wizard: 'Magician.png',
  juggernaut: 'Juggernaut.png',
} as const satisfies Record<KitId, string>;

type ShippedArtCardId =
  | (typeof ATTACK_CARD_IDS)[number]
  | (typeof ACTION_CARD_IDS)[number]
  | 'suicide'
  | 'spy-thief'
  | 'imposition'
  | 'cloning'
  | 'sentence'
  | 'points-generator';

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
} as const satisfies Record<ShippedArtCardId, CardArtFiles>;

type ArtCardId = keyof typeof CARD_FILES;

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
  if (!Object.prototype.hasOwnProperty.call(CARD_FILES, cardId)) {
    throw new Error(`Card ${cardId} has no art entry yet (L30-01)`);
  }

  const files = CARD_FILES[cardId as ArtCardId];
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

/** Card ids with shipped art — V4 pending specials land in L30-01. */
export const V1_CARD_IDS: readonly ArtCardId[] = [
  ...ATTACK_CARD_IDS,
  ...ACTION_CARD_IDS,
  'suicide',
  'spy-thief',
  'imposition',
  'cloning',
  'sentence',
  'points-generator',
] as const;

export type { ResourceKind, CardBackKind };
