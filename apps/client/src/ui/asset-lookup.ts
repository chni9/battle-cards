/**
 * Typed art lookup — technical spec v2 §4 / v4 §3.1, L30-01.
 * `artFor` — technical spec v7 §5.5 (L72-10): base drawings only, never throws.
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
  getCard,
  isKitId,
  SPECIAL_CARD_IDS,
  type CardId,
  type KitId,
} from '@card-battle/shared';

import {
  BACK_FILES,
  CARD_FILES,
  KIT_FILES,
  RESOURCE_FILES,
  type CardBackKind,
  type ResourceKind,
} from './asset-files';

/** Every playable card id with shipped art (3 attack + 7 action + 21 special). */
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
  'roulette',
] as const satisfies readonly CardId[];

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

/** Base drawings extracted by `scripts/extract-art.ts` (technical spec v7 §5.5). */
const artModules = import.meta.glob<string>('../assets/art/{cards,kits}/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

/** Transparent 1×1 SVG: the last fallback, so a missing drawing never blanks a screen. */
export const ART_FALLBACK_URL =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='1'%20height='1'%2F%3E";

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

/**
 * Base drawing for a card or kit. Never activated art, and never throws:
 * the family verso, then `ART_FALLBACK_URL` (technical spec v7 §5.5).
 */
export function artFor(id: CardId | KitId): string {
  const folder = isKitId(id) ? 'kits' : 'cards';
  const drawing = artModules[`../assets/art/${folder}/${id}.png`];
  if (drawing !== undefined) return drawing;
  try {
    if (isKitId(id)) return getCardBackUrl('kit');
    const card = getCard(id);
    if (card === undefined) return ART_FALLBACK_URL;
    return getCardBackUrl(card.type);
  } catch {
    return ART_FALLBACK_URL;
  }
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
