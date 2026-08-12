/**
 * Which Classic kits have a unique public tell that can force top-1 collapse
 * (technical spec v5 §4.2 / L34-02).
 *
 * Derived from `KIT_CATALOG`, with two hard rules that live in this module:
 * - Prophet is **never** uniqueness-guaranteed from specials alone (#V4-27 random
 *   starting specials). Residual Prophet mass after a unique-owner special is
 *   expected; trait tells (multi-attack, immuneTo, alwaysUpgraded) can still
 *   zero Prophet.
 * - A special in `specialCards` of more than one kit is not a uniqueness tell.
 *   Today that is `imposition` (Untouchable and Duplicator).
 *
 * Trait tells that uniquely identify a kit: `allowsMultipleAttacksPerTurn`
 * (Assassin), `immuneTo` thief/spy (Untouchable), and `alwaysUpgraded` card ids
 * owned by exactly one kit (e.g. Warrior shop attacks, Juggernaut shield).
 *
 * **If we add kits with shared or random specials, update this module and the
 * Belief section of `docs/agent/bots.md`.** The derivation below will not know
 * that a new random-deal kit should be excluded unless that rule is encoded here.
 */

import {
  getKit,
  KIT_IDS,
  SPECIAL_CARD_IDS,
  type CardId,
  type KitId,
} from '@card-battle/shared';

function uniqueSpecialOwnerKitIds(): ReadonlySet<KitId> {
  const owners = new Set<KitId>();

  for (const cardId of SPECIAL_CARD_IDS) {
    const kits = kitsOwningSpecial(cardId);
    if (kits.length !== 1) {
      continue;
    }

    const owner = kits[0];
    if (owner !== undefined && owner !== 'prophet') {
      owners.add(owner);
    }
  }

  return owners;
}

function uniqueTraitKitIds(): ReadonlySet<KitId> {
  const unique = new Set<KitId>();
  const multiAttack = KIT_IDS.filter(
    (kitId) => getKit(kitId).traits.allowsMultipleAttacksPerTurn,
  );

  if (multiAttack.length === 1 && multiAttack[0] !== undefined) {
    unique.add(multiAttack[0]);
  }

  const immuneCards = new Set<CardId>();
  const alwaysUpgradedCards = new Set<CardId>();

  for (const kitId of KIT_IDS) {
    const traits = getKit(kitId).traits;
    for (const cardId of traits.immuneTo) {
      immuneCards.add(cardId);
    }

    for (const cardId of traits.alwaysUpgraded) {
      alwaysUpgradedCards.add(cardId);
    }
  }

  for (const cardId of immuneCards) {
    const kits = KIT_IDS.filter((kitId) => getKit(kitId).traits.immuneTo.includes(cardId));
    if (kits.length === 1 && kits[0] !== undefined) {
      unique.add(kits[0]);
    }
  }

  for (const cardId of alwaysUpgradedCards) {
    const kits = KIT_IDS.filter((kitId) =>
      getKit(kitId).traits.alwaysUpgraded.includes(cardId),
    );
    if (kits.length === 1 && kits[0] !== undefined) {
      unique.add(kits[0]);
    }
  }

  return unique;
}

/**
 * Kits that own `cardId` in `KIT_CATALOG.specialCards`.
 * Prophet is never listed (empty `specialCards`; random deal is not ownership).
 */
export function kitsOwningSpecial(cardId: CardId): readonly KitId[] {
  return KIT_IDS.filter((kitId) => getKit(kitId).specialCards.includes(cardId));
}

const UNIQUENESS_SET: ReadonlySet<KitId> = (() => {
  const ids = new Set<KitId>();

  for (const kitId of uniqueSpecialOwnerKitIds()) {
    if (kitId !== 'prophet') {
      ids.add(kitId);
    }
  }

  for (const kitId of uniqueTraitKitIds()) {
    if (kitId !== 'prophet') {
      ids.add(kitId);
    }
  }

  return ids;
})();

/** Classic kits with at least one unique public tell. Prophet is never included. */
export const UNIQUENESS_GUARANTEED_KIT_IDS: readonly KitId[] = KIT_IDS.filter((kitId) =>
  UNIQUENESS_SET.has(kitId),
);

export function isUniquenessGuaranteedKit(kitId: KitId): boolean {
  return UNIQUENESS_SET.has(kitId);
}
