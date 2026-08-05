/**
 * Light heuristics for the four generic sub-choices — steal (L21-03), pool-pick and
 * special-pick (Lot 24), reanimation kit (L26-02) — technical spec v3 §4.4 (L29-08).
 *
 * Each still falls back to the injected `rng` when there is no signal to prefer one
 * eligible option over another (golden rule 5 — never `Math.random()`).
 */

import {
  ACTION_CARD_IDS,
  getKit,
  isAttackCardId,
  type CardId,
  type CardInstance,
  type KitId,
  type PlayingStateView,
  type SpecialCardId,
} from '@card-battle/shared';

import type { Rng } from '../engine/rng';

const ACTION_CARD_ID_SET: ReadonlySet<string> = new Set(ACTION_CARD_IDS);

function isSpecialCardId(cardId: CardId): boolean {
  return !ACTION_CARD_ID_SET.has(cardId) && !isAttackCardId(cardId);
}

/**
 * Card Thief steal-pick. Only ever raised against a spied victim (`needsStealPick` in
 * `card-thief.ts` requires it) — so every eligible id is expected to also appear in some
 * opponent's `spied.hand` / `spied.specialCards`. Prefers upgraded attacks, then any
 * attack, then specials, then plain actions; ties broken by `rng`.
 */
export function pickStealInstanceId(
  view: PlayingStateView,
  eligibleInstanceIds: readonly string[],
  rng: Rng,
): string {
  if (eligibleInstanceIds.length === 0) {
    throw new RangeError('pickStealInstanceId received an empty candidate list');
  }

  const eligible = new Set(eligibleInstanceIds);
  const known: CardInstance[] = [];

  for (const player of view.players) {
    const spied = player.spied;

    if (spied === undefined) {
      continue;
    }

    for (const card of [...spied.hand, ...spied.specialCards]) {
      if (eligible.has(card.instanceId)) {
        known.push(card);
      }
    }
  }

  if (known.length === 0) {
    // Not spied after all (defensive — should not happen per `needsStealPick`).
    return rng.pick([...eligibleInstanceIds]);
  }

  const bestRank = Math.min(...known.map(stealPreferenceRank));
  const top = known.filter((card) => stealPreferenceRank(card) === bestRank);
  return rng.pick(top).instanceId;
}

function stealPreferenceRank(card: CardInstance): number {
  if (isAttackCardId(card.cardId)) {
    return card.isUpgraded ? 0 : 1;
  }

  if (isSpecialCardId(card.cardId)) {
    return 2;
  }

  return 3;
}

/**
 * Card Absorber upgraded pool-pick. `poolCards` is the shared pool's actual contents
 * (only some of which are eligible); prefers specials, then upgraded attacks, then
 * attacks, then plain actions. Ties at the cutoff broken by `rng.shuffle`, never a
 * stable array-order pick.
 */
export function pickPoolInstanceIds(
  poolCards: readonly CardInstance[],
  eligibleIds: readonly string[],
  maxCount: number,
  rng: Rng,
): string[] {
  if (maxCount <= 0) {
    return [];
  }

  const eligible = new Set(eligibleIds);
  const candidates = poolCards.filter((card) => eligible.has(card.instanceId));

  if (candidates.length === 0) {
    return [];
  }

  const ranked = [...candidates].sort(
    (left, right) => poolPreferenceRank(left) - poolPreferenceRank(right),
  );

  if (ranked.length <= maxCount) {
    return ranked.map((card) => card.instanceId);
  }

  const cutoff = ranked[maxCount - 1];
  const cutoffRank = cutoff === undefined ? 0 : poolPreferenceRank(cutoff);
  const definite = ranked.filter((card) => poolPreferenceRank(card) < cutoffRank);
  const atCutoff = ranked.filter((card) => poolPreferenceRank(card) === cutoffRank);
  const remaining = Math.max(0, maxCount - definite.length);
  const chosen = rng.shuffle(atCutoff).slice(0, remaining);

  return [...definite, ...chosen].map((card) => card.instanceId);
}

function poolPreferenceRank(card: CardInstance): number {
  if (isSpecialCardId(card.cardId)) {
    return 0;
  }

  if (isAttackCardId(card.cardId)) {
    return card.isUpgraded ? 1 : 2;
  }

  return 3;
}

/**
 * Card Transformer upgraded special-pick. `eligibleCardIds` is always the full 20-entry
 * `SPECIAL_CARD_IDS` set (`beginSpecialPick`), so this resolves to the first entry of a
 * fixed high-impact-first preference order; `rng` only breaks a tie that cannot occur
 * today (kept for when the eligible set narrows).
 */
const SPECIAL_PREFERENCE_ORDER: readonly SpecialCardId[] = [
  'mega-attack',
  'super-mirror',
  'upgrade-point-thief',
  'attack-thief',
  'super-regeneration',
  'card-thief',
  'super-absorber',
  'sentence',
  'spy-thief',
  'block',
  'curse',
  'poison',
  'imposition',
  'points-generator',
  'card-absorber',
  'reanimation',
  'invisibility',
  'card-transformer',
  'suicide',
  'cloning',
];

export function pickSpecialCardId(
  eligibleCardIds: readonly SpecialCardId[],
  rng: Rng,
): SpecialCardId {
  if (eligibleCardIds.length === 0) {
    throw new RangeError('pickSpecialCardId received an empty candidate list');
  }

  for (const preferred of SPECIAL_PREFERENCE_ORDER) {
    if (eligibleCardIds.includes(preferred)) {
      return preferred;
    }
  }

  return rng.pick([...eligibleCardIds]);
}

/** Upgraded Reanimation kit pick. Sorts by starting lives desc, then draw desc; rng among ties. */
export function pickReanimationKitId(eligibleKitIds: readonly KitId[], rng: Rng): KitId {
  if (eligibleKitIds.length === 0) {
    throw new RangeError('pickReanimationKitId received an empty candidate list');
  }

  const ranked = [...eligibleKitIds].sort((left, right) => {
    const leftResources = getKit(left).startingResources;
    const rightResources = getKit(right).startingResources;

    if (rightResources.lives !== leftResources.lives) {
      return rightResources.lives - leftResources.lives;
    }

    return rightResources.draw - leftResources.draw;
  });

  const best = ranked[0];

  if (best === undefined) {
    return rng.pick([...eligibleKitIds]);
  }

  const bestResources = getKit(best).startingResources;
  const top = ranked.filter((kitId) => {
    const resources = getKit(kitId).startingResources;
    return resources.lives === bestResources.lives && resources.draw === bestResources.draw;
  });

  return rng.pick(top);
}
