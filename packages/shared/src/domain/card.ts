/**
 * Card identity and static card data — technical spec §4.1, rules spec §1–§3, §5.
 *
 * Attack / action lists are the shop/deal shared set. Specials cover the full rules
 * special lot (20); handlers land per card task, with undeclared ones in
 * `PENDING_CARD_IDS` (technical spec v4 §8.1 / L20-04).
 */

export const ATTACK_CARD_IDS = ['basic-attack', 'strong-attack', 'super-attack'] as const;

export const ACTION_CARD_IDS = [
  'absorber',
  'spy',
  'thief',
  'mirror',
  'shield',
  'tax',
  'regeneration',
] as const;

export const SPECIAL_CARD_IDS = [
  'suicide',
  'spy-thief',
  'imposition',
  'cloning',
  'sentence',
  'points-generator',
  'upgrade-point-thief',
  'block',
  'super-regeneration',
  'card-thief',
  'card-transformer',
  'invisibility',
  'reanimation',
  'card-absorber',
  'mega-attack',
  'super-mirror',
  'super-absorber',
  'curse',
  'poison',
  'attack-thief',
] as const;

/**
 * Alias of `SPECIAL_CARD_IDS` — L21-01 / #V4-29: the 20-point purchase draws from
 * all 20 specials (pending-handler ids included; play stays rejected until implemented).
 */
export const PURCHASABLE_SPECIAL_CARD_IDS = SPECIAL_CARD_IDS;

/**
 * Cards that inflict *damage* as rules spec §1 defines it, and therefore the only
 * cards `applyDamage` may ever be called for.
 *
 * Shop/deal attacks stay in `ATTACK_CARD_IDS` (length 3). Special attacks such as
 * MEGA ATTACK live in `SPECIAL_ATTACK_CARD_IDS` and join `AttackCardId` without
 * becoming shop-buyable (technical spec v4 §4.1 / L20-05).
 */
export const SPECIAL_ATTACK_CARD_IDS = ['mega-attack'] as const;

export type SharedAttackCardId = (typeof ATTACK_CARD_IDS)[number];
export type SpecialAttackCardId = (typeof SPECIAL_ATTACK_CARD_IDS)[number];
export type AttackCardId = SharedAttackCardId | SpecialAttackCardId;

/** Narrow any string (e.g. `PendingEffect.cardId`) before `attackDamageFor`. */
export function isAttackCardId(cardId: string): cardId is AttackCardId {
  return (
    (ATTACK_CARD_IDS as readonly string[]).includes(cardId) ||
    (SPECIAL_ATTACK_CARD_IDS as readonly string[]).includes(cardId)
  );
}

/** Shop/deal attack membership — never includes special attacks like MEGA. */
export function isSharedAttackCardId(cardId: string): cardId is SharedAttackCardId {
  return (ATTACK_CARD_IDS as readonly string[]).includes(cardId);
}

export type ActionCardId = (typeof ACTION_CARD_IDS)[number];

export type SpecialCardId = (typeof SPECIAL_CARD_IDS)[number];

export type CardId = AttackCardId | ActionCardId | SpecialCardId;

export type CardType = 'attack' | 'action' | 'special';

/**
 * Rules spec §1–§3: a cost is points (most cards), lives (Tax), or points per life
 * (Regeneration). Any per-use cap on the quantity bought belongs to the card's
 * handler, not here.
 */
export interface CardCost {
  points?: number;
  lives?: number;
  pointsPerLife?: number;
}

/**
 * Shared (non-special) V1 cards — buyable/sellable individually from infinite stock
 * (rules spec §1). Specials use `buySpecialCard` instead.
 */
export const SHARED_CARD_IDS = [...ATTACK_CARD_IDS, ...ACTION_CARD_IDS] as const;

export type SharedCardId = (typeof SHARED_CARD_IDS)[number];

/** Static, immutable card definition. One entry per card id, never per copy. */
export interface Card {
  id: CardId;
  name: string;
  type: CardType;
  /** Cost to *play* the card (rules spec §2–§3). Independent of shop prices. */
  cost: CardCost;
  /** Player-facing description of the base effect. Behaviour lives in the card's handler. */
  effect: string;
  /**
   * Full player-facing description of the upgraded card (standalone, not a delta).
   * Non-upgraded UI appends this after `effect` via `formatCardEffectText`.
   */
  upgradeEffect: string;
  /**
   * Shop purchase price from infinite stock — always the **base** usage transfer × 2
   * (or the ruled exception for Tax/Regeneration). Never follows an upgraded play cost.
   */
  buyCost: CardCost;
  /**
   * Yield when selling a held copy — always the **base** usage transfer (rules spec §1),
   * never an upgraded play cost. Separately, an upgraded copy also refunds 1 upgrade
   * point on sell (rules spec §1, designer ruling 2026-08-04).
   */
  sellYield: CardCost;
}

/**
 * One held copy of a card. Rules spec §1 allows owning several copies of the same
 * card, and technical spec §4.1 puts `isUpgraded` on the copy, so copies must be
 * individually addressable — hence `instanceId`.
 *
 * Covers technical spec §4.1's `PlayerCard` and `SpecialCard`, which have identical
 * shapes; defining both would duplicate a domain type. Which collection a copy sits
 * in (`hand` or `specialCards`) separates them, backed by its `Card.type`.
 */
export interface CardInstance {
  instanceId: string;
  cardId: CardId;
  isUpgraded: boolean;
}
