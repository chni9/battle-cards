/**
 * State feature vector for Phase A / fitted evaluators — technical spec v5 §5.1 (L33-02).
 * Same layout for Lot 37. Belief widths fill from optional `BeliefSummary` (L34-03);
 * omitted → zeros so Lot 33 tests stay valid. `evaluate` does not take belief until Lot 35.
 */

import {
  attackDamageFor,
  getCard,
  getKit,
  isAttackCardId,
  KIT_CATALOG,
  MAX_PLAYERS,
  type CardId,
  type GameState,
  type Player,
} from '@card-battle/shared';

import type { BeliefSummary } from '../belief/types';

/** Bump when the feature layout changes — invalidates fitted models. */
export const FEATURE_LAYOUT_VERSION = 1;

/** Max seats in Classic (rules spec §1). */
export const FEATURE_MAX_PLAYERS = MAX_PLAYERS;

/** Card ids that appear in any kit's `immuneTo` or `alwaysUpgraded` (stable sort). */
export const KIT_TRAIT_CARD_IDS: readonly CardId[] = (() => {
  const ids = new Set<CardId>();

  for (const kit of Object.values(KIT_CATALOG)) {
    for (const cardId of kit.traits.immuneTo) {
      ids.add(cardId);
    }

    for (const cardId of kit.traits.alwaysUpgraded) {
      ids.add(cardId);
    }
  }

  return [...ids].sort((left, right) => left.localeCompare(right));
})();

/**
 * Named feature layout (self-centric). Length is `FEATURE_DIM`.
 * Belief widths come from `BeliefSummary` when provided (L34-03).
 */
export const FEATURE_NAMES = [
  'selfLivesNorm',
  'selfPointsNorm',
  'selfUpgradePointsNorm',
  'selfShieldNorm',
  'selfShieldTier',
  'pendingIncomingNorm',
  'pendingOutgoingNorm',
  'mutualCancelPairsNorm',
  'handSizeNorm',
  'upgradedCardCountNorm',
  'specialsHeldNorm',
  'summedCardValueNorm',
  'persistentsOnSelfNorm',
  'persistentsBySelfNorm',
  'persistentsCountersNorm',
  'kitAllowsMultiAttack',
  'kitDrawNorm',
  ...KIT_TRAIT_CARD_IDS.map((id) => `kitImmune_${id}`),
  ...KIT_TRAIT_CARD_IDS.map((id) => `kitAlwaysUpgraded_${id}`),
  'livingOpponentCountNorm',
  'turnPositionNorm',
  'blockTurnsRemainingNorm',
  'attackBlockChargesNorm',
  'duplicationActive',
  'pendingReanimationArmed',
  // Belief (Lot 34) — one width slot per opponent seat offset 1..3.
  // Fitted layout v1 reserved three slots when Classic was 2–4; extra living
  // opponents at 5–6 seats have no dedicated width feature (zeros).
  'beliefLifeWidthOpp1',
  'beliefLifeWidthOpp2',
  'beliefLifeWidthOpp3',
] as const;

export type FeatureName = (typeof FEATURE_NAMES)[number];

export const FEATURE_DIM = FEATURE_NAMES.length;

export type FeatureVector = Float64Array;

function clamp01(value: number): number {
  if (value <= 0) {
    return 0;
  }

  if (value >= 1) {
    return 1;
  }

  return value;
}

function effectDamage(cardId: CardId, isUpgraded: boolean, multiplier: number): number {
  if (!isAttackCardId(cardId)) {
    return 0;
  }

  return attackDamageFor(cardId, isUpgraded) * multiplier;
}

function cardMaterialValue(cardId: CardId): number {
  const definition = getCard(cardId);

  if (definition === undefined) {
    return 0;
  }

  return (
    (definition.sellYield.points ?? 0) +
    (definition.cost.points ?? 0) +
    (definition.buyCost.points ?? 0) * 0.25
  );
}

function livingPlayers(state: GameState): Player[] {
  return state.players.filter((player) => !player.isEliminated);
}

function pendingAttackDamageOn(
  state: GameState,
  targetId: string,
): number {
  let total = 0;

  for (const player of state.players) {
    for (const effect of player.pendingEffects) {
      if (effect.targetPlayerId !== targetId) {
        continue;
      }

      total += effectDamage(effect.cardId, effect.isUpgraded, effect.damageMultiplier);
    }
  }

  return total;
}

function pendingAttackDamageFrom(
  state: GameState,
  sourceId: string,
): number {
  let total = 0;

  for (const player of state.players) {
    for (const effect of player.pendingEffects) {
      if (effect.sourcePlayerId !== sourceId || !isAttackCardId(effect.cardId)) {
        continue;
      }

      total += effectDamage(effect.cardId, effect.isUpgraded, effect.damageMultiplier);
    }
  }

  return total;
}

/** Count mutual cancel pairs involving `playerId` (opposing pending attacks). */
function mutualCancelPairCount(state: GameState, playerId: string): number {
  let count = 0;

  for (const player of state.players) {
    for (const effect of player.pendingEffects) {
      if (
        effect.sourcePlayerId !== playerId ||
        !isAttackCardId(effect.cardId) ||
        effect.targetPlayerId === playerId
      ) {
        continue;
      }

      const outgoing = effectDamage(effect.cardId, effect.isUpgraded, effect.damageMultiplier);
      const target = state.players.find((entry) => entry.id === effect.targetPlayerId);

      if (target === undefined) {
        continue;
      }

      for (const retaliate of target.pendingEffects) {
        if (
          retaliate.sourcePlayerId !== effect.targetPlayerId ||
          retaliate.targetPlayerId !== playerId ||
          !isAttackCardId(retaliate.cardId)
        ) {
          continue;
        }

        const incoming = effectDamage(
          retaliate.cardId,
          retaliate.isUpgraded,
          retaliate.damageMultiplier,
        );

        if (outgoing > 0 && incoming > 0) {
          count += 1;
        }
      }
    }
  }

  return count;
}

/**
 * Self-centric feature vector for `perspectivePlayerId`.
 * When `belief` is omitted, life-width slots stay 0 (Lot 33 / `evaluate` until Lot 35).
 */
export function extractFeatures(
  state: GameState,
  perspectivePlayerId: string,
  belief?: BeliefSummary,
): FeatureVector {
  const self = state.players.find((player) => player.id === perspectivePlayerId);

  if (self === undefined || self.isEliminated) {
    throw new Error(`extractFeatures: unknown or eliminated player ${perspectivePlayerId}`);
  }

  const lifeLimit = state.lifeLimit;
  const living = livingPlayers(state);
  const livingOpponents = living.filter((player) => player.id !== self.id);
  const kit = getKit(self.kitId);

  const handAndSpecials = [...self.hand, ...self.specialCards];
  const upgradedCount = handAndSpecials.filter((card) => card.isUpgraded).length;
  const specialsHeld = self.specialCards.length;
  const summedValue = handAndSpecials.reduce(
    (sum, card) => sum + cardMaterialValue(card.cardId),
    0,
  );

  const persistentsOnSelf = self.activePersistentEffects.length;
  // Persistents are owner-scoped (no sourcePlayerId on PersistentEffect) — "by self"
  // equals on-self until belief/log reconstruction can attribute foreign boards.
  const persistentsBySelf = persistentsOnSelf;
  const countersRemaining = self.activePersistentEffects.reduce(
    (sum, effect) => sum + (effect.counter ?? 0),
    0,
  );

  const turnOrder = living.map((player) => player.id);
  const turnIndex = turnOrder.indexOf(state.currentTurnPlayerId ?? self.id);
  const turnPositionNorm =
    turnOrder.length <= 1 ? 0 : clamp01(Math.max(0, turnIndex) / (turnOrder.length - 1));

  const values: number[] = [
    clamp01(self.lives / lifeLimit),
    clamp01(self.points / 40),
    clamp01(self.upgradePoints / 10),
    clamp01(self.shield / lifeLimit),
    self.shieldIsUpgraded ? 1 : 0,
    clamp01(pendingAttackDamageOn(state, self.id) / lifeLimit),
    clamp01(pendingAttackDamageFrom(state, self.id) / lifeLimit),
    clamp01(mutualCancelPairCount(state, self.id) / 4),
    clamp01(handAndSpecials.length / 12),
    clamp01(upgradedCount / 8),
    clamp01(specialsHeld / 6),
    clamp01(summedValue / 80),
    clamp01(persistentsOnSelf / 4),
    clamp01(persistentsBySelf / 4),
    clamp01(countersRemaining / 8),
    kit.traits.allowsMultipleAttacksPerTurn ? 1 : 0,
    clamp01(kit.startingResources.draw / 4),
  ];

  for (const cardId of KIT_TRAIT_CARD_IDS) {
    values.push(kit.traits.immuneTo.includes(cardId) ? 1 : 0);
  }

  for (const cardId of KIT_TRAIT_CARD_IDS) {
    values.push(kit.traits.alwaysUpgraded.includes(cardId) ? 1 : 0);
  }

  values.push(
    clamp01(livingOpponents.length / (FEATURE_MAX_PLAYERS - 1)),
    turnPositionNorm,
    clamp01(self.blockTurnsRemaining / 4),
    clamp01(self.attackBlockCharges / 2),
    self.duplicationActive ? 1 : 0,
    self.pendingReanimation !== null ? 1 : 0,
    belief?.lifeWidthByOpponentOffset[0] ?? 0,
    belief?.lifeWidthByOpponentOffset[1] ?? 0,
    belief?.lifeWidthByOpponentOffset[2] ?? 0,
  );

  if (values.length !== FEATURE_DIM) {
    throw new Error(
      `Feature layout mismatch: got ${String(values.length)}, expected ${String(FEATURE_DIM)}`,
    );
  }

  return Float64Array.from(values);
}

/** Belief feature indices — filled from `BeliefSummary` when passed to `extractFeatures`. */
export const BELIEF_FEATURE_INDICES: readonly number[] = [
  FEATURE_NAMES.indexOf('beliefLifeWidthOpp1'),
  FEATURE_NAMES.indexOf('beliefLifeWidthOpp2'),
  FEATURE_NAMES.indexOf('beliefLifeWidthOpp3'),
];

/**
 * Hand-initial linear weights: positive on self resources / outgoing pressure,
 * negative on incoming threat and opponent count — enough for monotone acceptance.
 */
export function defaultEvaluatorLinearWeights(): number[] {
  const weights = Array.from({ length: FEATURE_DIM }, () => 0);
  const set = (name: FeatureName, value: number): void => {
    const index = FEATURE_NAMES.indexOf(name);

    if (index < 0) {
      throw new Error(`Unknown feature ${name}`);
    }

    weights[index] = value;
  };

  set('selfLivesNorm', 3);
  set('selfPointsNorm', 0.3);
  set('selfUpgradePointsNorm', 0.4);
  set('selfShieldNorm', 0.8);
  set('selfShieldTier', 0.2);
  set('pendingIncomingNorm', -2);
  set('pendingOutgoingNorm', 1.2);
  set('mutualCancelPairsNorm', 0.5);
  set('handSizeNorm', 0.4);
  set('upgradedCardCountNorm', 0.5);
  set('specialsHeldNorm', 0.3);
  set('summedCardValueNorm', 0.2);
  set('persistentsOnSelfNorm', -0.3);
  set('persistentsBySelfNorm', 0.4);
  set('livingOpponentCountNorm', -1.5);
  set('blockTurnsRemainingNorm', 0.6);
  set('attackBlockChargesNorm', 0.5);
  set('duplicationActive', 0.2);
  set('pendingReanimationArmed', 0.4);

  return weights;
}
