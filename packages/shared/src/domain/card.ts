/**
 * Card identity and static card data — technical spec §4.1, rules spec §1–§3, §5.
 *
 * The id lists are the V1 scope (technical spec §2): 3 attack, 7 action, 6 special.
 * They exist at runtime because several rules draw from them: starting card
 * distribution (rules spec §4) and the 20-point special card purchase, which V1
 * restricts to the 6 special cards in the lot (technical spec ruling §6.2 #10).
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
] as const;

/**
 * Cards that inflict *damage* as rules spec §1 defines it, and therefore the only
 * cards `applyDamage` may ever be called for.
 *
 * In V1 this is exactly the 'attack' category. It is a separate type because rules
 * spec §1 makes attack-ness a property of the card, not of its category: a special
 * card can be an attack (MEGA ATTACK, out of V1 scope). When such a card is added,
 * it joins this union without becoming an `ActionCardId`.
 */
export type AttackCardId = (typeof ATTACK_CARD_IDS)[number];

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
  /** Player-facing description of the upgraded effect. */
  upgradeEffect: string;
  /**
   * Shop purchase price from infinite stock — always the **base** usage transfer × 2
   * (or the ruled exception for Tax/Regeneration). Never follows an upgraded play cost.
   */
  buyCost: CardCost;
  /**
   * Yield when selling a held copy — always the **base** usage transfer (rules spec §1),
   * never an upgraded play cost.
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
