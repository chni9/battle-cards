/**
 * Card face data — technical spec v7 §5.4. Everything the V7 `Card` prints or speaks comes
 * from the catalog through here, so the component holds no card knowledge of its own.
 *
 * - The damage chip is `listedAttackDamage` × the pending multiplier, null on non-attacks and
 *   on Tax, Absorber and Super Mirror (L56-04).
 * - The cost chip is the play cost, with the upgraded Regeneration rate (rules spec §1–§3).
 * - Counters speak card lives (L56-06) and Invisibility turns (L58-06), with singulars.
 */

import {
  SPECIAL_CARD_IDS,
  getCard,
  isSharedAttackCardId,
  listedAttackDamage,
  type CardId,
  type CardType,
} from '@card-battle/shared';
import { structuredPlayCost, type StructuredCost } from '../structured-cost';

export const CARD_SIZES = ['hand', 'lifted', 'sheet', 'thumb', 'tile'] as const;
export type CardSize = (typeof CARD_SIZES)[number];

export type CardCounterKind = 'card-lives' | 'turns';

export interface CardCounter {
  readonly kind: CardCounterKind;
  readonly amount: number;
}

/** The accessible name of a verso face: a Spy hand without identity (spec v7 §5.4). */
export const HIDDEN_CARD_LABEL = 'Hidden card';

const SPECIAL_IDS: ReadonlySet<string> = new Set(SPECIAL_CARD_IDS);

/** The catalog family; an id the catalog does not know falls back on the id lists. */
export function cardFamilyOf(cardId: CardId): CardType {
  const type = getCard(cardId)?.type;
  if (type !== undefined) return type;
  if (SPECIAL_IDS.has(cardId)) return 'special';
  return isSharedAttackCardId(cardId) ? 'attack' : 'action';
}

export function cardCostChip(cardId: CardId, isUpgraded: boolean): StructuredCost | null {
  const card = getCard(cardId);
  return card === undefined ? null : structuredPlayCost(card, isUpgraded);
}

export function cardDamageChip(cardId: CardId, isUpgraded: boolean, damageMultiplier?: number): number | null {
  return listedAttackDamage(cardId, isUpgraded, damageMultiplier ?? 1);
}

export function cardCounterLabel(counter: CardCounter): string {
  const n = String(counter.amount);
  if (counter.kind === 'card-lives') {
    return `${n} ${counter.amount === 1 ? 'card life' : 'card lives'}`;
  }
  return `${n} ${counter.amount === 1 ? 'turn' : 'turns'} remaining`;
}

export function cardFaceLabel(input: {
  readonly name: string;
  readonly isUpgraded: boolean;
  readonly damage: number | null;
  readonly counter?: CardCounter;
}): string {
  const { name, isUpgraded, damage, counter } = input;
  return `${name}${isUpgraded ? ' upgraded' : ''}${damage !== null ? `, ${String(damage)} damage` : ''}${
    counter !== undefined ? `, ${cardCounterLabel(counter)}` : ''
  }`;
}
