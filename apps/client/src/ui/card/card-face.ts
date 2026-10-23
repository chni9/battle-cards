/**
 * Card face helpers (technical spec v7 §5.4, L56-04, L56-06, L58-06).
 * Catalog chips and accessible names only — no React, no art.
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

export const HIDDEN_CARD_LABEL = 'Hidden card';

const SPECIAL_IDS: ReadonlySet<string> = new Set(SPECIAL_CARD_IDS);

export function cardFamilyOf(cardId: CardId): CardType {
  const listed = getCard(cardId)?.type;
  if (listed !== undefined) {
    return listed;
  }
  if (SPECIAL_IDS.has(cardId)) {
    return 'special';
  }
  if (isSharedAttackCardId(cardId)) {
    return 'attack';
  }
  return 'action';
}

export function cardCostChip(cardId: CardId, isUpgraded: boolean): StructuredCost | null {
  const card = getCard(cardId);
  if (card === undefined) {
    return null;
  }
  return structuredPlayCost(card, isUpgraded);
}

export function cardDamageChip(
  cardId: CardId,
  isUpgraded: boolean,
  damageMultiplier?: number,
): number | null {
  return listedAttackDamage(cardId, isUpgraded, damageMultiplier ?? 1);
}

export function cardCounterLabel(counter: CardCounter): string {
  if (counter.kind === 'card-lives') {
    return `${String(counter.amount)} ${counter.amount === 1 ? 'card life' : 'card lives'}`;
  }
  return `${String(counter.amount)} ${counter.amount === 1 ? 'turn remaining' : 'turns remaining'}`;
}

export function cardFaceLabel(input: {
  readonly name: string;
  readonly isUpgraded: boolean;
  readonly damage: number | null;
  readonly counter?: CardCounter;
}): string {
  const { name, isUpgraded, damage, counter } = input;
  return `${name}${isUpgraded ? ' upgraded' : ''}${damage !== null ? `, ${String(damage)} damage` : ''}${counter !== undefined ? `, ${cardCounterLabel(counter)}` : ''}`;
}
