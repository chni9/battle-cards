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

/**
 * Classic freeze switch (L56-02 / L58-06): ids stay in the catalog and handler
 * map but must not be granted or played. Empty — Invisibility is live again.
 */
export const TEMPORARILY_UNAVAILABLE_SPECIAL_CARD_IDS = [
] as const satisfies readonly SpecialCardId[];

export type TemporarilyUnavailableSpecialCardId =
  (typeof TEMPORARILY_UNAVAILABLE_SPECIAL_CARD_IDS)[number];

const TEMPORARILY_UNAVAILABLE_SET = new Set<string>(TEMPORARILY_UNAVAILABLE_SPECIAL_CARD_IDS);

export function isTemporarilyUnavailableCardId(
  cardId: string,
): cardId is TemporarilyUnavailableSpecialCardId {
  return TEMPORARILY_UNAVAILABLE_SET.has(cardId);
}

/** Specials that may enter a live game (shop, Prophet, Transformer). */
export const CIRCULATING_SPECIAL_CARD_IDS = SPECIAL_CARD_IDS.filter(
  (id): id is Exclude<SpecialCardId, TemporarilyUnavailableSpecialCardId> =>
    !TEMPORARILY_UNAVAILABLE_SET.has(id),
);

/**
 * 20-point purchase pool — L21-01 / #V4-29 over circulating ids.
 */
export const PURCHASABLE_SPECIAL_CARD_IDS = CIRCULATING_SPECIAL_CARD_IDS;

/**
 * Card Transformer result pool — never `card-transformer` itself
 * (designer 2026-08-24 / L50-08). Frozen ids are already absent from circulating.
 */
export const TRANSFORM_RESULT_SPECIAL_IDS = CIRCULATING_SPECIAL_CARD_IDS.filter(
  (id): id is Exclude<(typeof CIRCULATING_SPECIAL_CARD_IDS)[number], 'card-transformer'> =>
    id !== 'card-transformer',
);

export type CardId = AttackCardId | ActionCardId | SpecialCardId;

/**
 * Spec §5 dedicated internal counters ("card lives"). Duration counters
 * (Invisibility remaining turns) are not in this set — `applyDamage` must not
 * decrement them (L58-06).
 */
export const CARD_LIVES_SPECIAL_IDS = [
  'points-generator',
  'imposition',
  'poison',
  'super-absorber',
] as const satisfies readonly SpecialCardId[];

const CARD_LIVES_SET = new Set<string>(CARD_LIVES_SPECIAL_IDS);

export function isCardLivesSpecialId(cardId: string): boolean {
  return CARD_LIVES_SET.has(cardId);
}

/**
 * Cards that act on another player — illegal to play while own Invisibility is
 * active (rules spec §5 / L58-06). Designer-locked set; do not add Attack Thief.
 */
export const CARD_IDS_THAT_ACT_ON_OPPONENTS = [
  ...ATTACK_CARD_IDS,
  'mega-attack',
  'spy',
  'thief',
  'card-thief',
  'spy-thief',
  'upgrade-point-thief',
  'poison',
  'curse',
  'imposition',
  'super-absorber',
  'absorber',
  'cloning',
  'suicide',
  'sentence',
  'mirror',
  'super-mirror',
] as const satisfies readonly CardId[];

const CARD_IDS_THAT_ACT_ON_OPPONENTS_SET = new Set<string>(CARD_IDS_THAT_ACT_ON_OPPONENTS);

export function cardActsOnOpponents(cardId: string): boolean {
  return CARD_IDS_THAT_ACT_ON_OPPONENTS_SET.has(cardId);
}

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
   * Upgraded UI shows this via `formatCardEffectText`.
   */
  upgradeEffect: string;
  /**
   * What the upgrade adds relative to the base `effect` (L51-05).
   * Non-upgraded UI appends this after `effect`. Derived from `effect` /
   * `upgradeEffect` — not a new mechanic.
   */
  upgradeAdds: string;
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
