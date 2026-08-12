/**
 * Kit posterior per opponent from public evidence only — technical spec v5 §4.2
 * (L34-02). No `GameState`. Spy-revealed `kitId` is a point mass; otherwise a
 * uniform prior over `KIT_IDS` is Bayes-updated from the public action log.
 *
 * Contradicted kits get probability 0. Prophet random specials (#V4-27) are weak
 * evidence for the catalog owner — over-inferring searches the wrong world.
 */

import {
  getKit,
  isSpecialCardId,
  KIT_IDS,
  SPECIAL_CARD_IDS,
  type ActionLogEntryView,
  type ActionPlayedLogEntry,
  type CardId,
  type KitId,
  type PlayingStateView,
} from '@card-battle/shared';

import type { KitPosterior } from './types';

const PROPHET_HOLD_PROBABILITY: number = (() => {
  const draws = getKit('prophet').randomStartingSpecialCount ?? 0;
  const n = SPECIAL_CARD_IDS.length;
  return 1 - (1 - 1 / n) ** draws;
})();

function uniformMass(): number[] {
  const share = 1 / KIT_IDS.length;
  return KIT_IDS.map(() => share);
}

function pointMass(kitId: KitId): number[] {
  return KIT_IDS.map((id) => (id === kitId ? 1 : 0));
}

function renormalize(mass: number[]): void {
  let sum = 0;
  for (const value of mass) {
    sum += value;
  }

  if (sum <= 0) {
    const share = 1 / KIT_IDS.length;
    for (let index = 0; index < mass.length; index += 1) {
      mass[index] = share;
    }
    return;
  }

  for (let index = 0; index < mass.length; index += 1) {
    mass[index] = (mass[index] ?? 0) / sum;
  }
}

function isCompletePosterior(
  value: Partial<Record<KitId, number>>,
): value is Record<KitId, number> {
  return KIT_IDS.every((kitId) => typeof value[kitId] === 'number');
}

function toPosterior(mass: readonly number[]): KitPosterior {
  const out: Partial<Record<KitId, number>> = {};

  for (let index = 0; index < KIT_IDS.length; index += 1) {
    const kitId = KIT_IDS[index];
    if (kitId === undefined) {
      throw new Error('kit posterior: KIT_IDS index missing');
    }

    out[kitId] = mass[index] ?? 0;
  }

  if (!isCompletePosterior(out)) {
    throw new Error('kit posterior: incomplete mass');
  }

  return out;
}

function canAcquire(cardId: CardId, kitId: KitId, bought: ReadonlySet<CardId>): boolean {
  if (bought.has(cardId)) {
    return true;
  }

  const kit = getKit(kitId);
  if (kit.specialCards.includes(cardId)) {
    return true;
  }

  return (kit.randomStartingSpecialCount ?? 0) > 0;
}

function specialPlayLikelihood(
  cardId: CardId,
  kitId: KitId,
  bought: ReadonlySet<CardId>,
): number {
  if (!canAcquire(cardId, kitId, bought)) {
    return 0;
  }

  if (bought.has(cardId) || getKit(kitId).specialCards.includes(cardId)) {
    return 1;
  }

  return PROPHET_HOLD_PROBABILITY;
}

function kitsWithImmuneTo(cardId: CardId): readonly KitId[] {
  return KIT_IDS.filter((kitId) => getKit(kitId).traits.immuneTo.includes(cardId));
}

function kitsWithAlwaysUpgraded(cardId: CardId): readonly KitId[] {
  return KIT_IDS.filter((kitId) => getKit(kitId).traits.alwaysUpgraded.includes(cardId));
}

function specialIdsFromPlay(entry: ActionPlayedLogEntry): readonly CardId[] {
  const ids: CardId[] = [];

  if (entry.cardId !== undefined && isSpecialCardId(entry.cardId)) {
    ids.push(entry.cardId);
  }

  if (entry.attacks !== undefined) {
    for (const attack of entry.attacks) {
      if (isSpecialCardId(attack.cardId)) {
        ids.push(attack.cardId);
      }
    }
  }

  return ids;
}

function zeroKitsUnless(
  mass: number[],
  keep: (kitId: KitId) => boolean,
): void {
  for (let index = 0; index < KIT_IDS.length; index += 1) {
    const kitId = KIT_IDS[index];
    if (kitId === undefined || keep(kitId)) {
      continue;
    }

    mass[index] = 0;
  }
}

function applySpecialPlay(mass: number[], cardId: CardId, bought: ReadonlySet<CardId>): void {
  for (let index = 0; index < KIT_IDS.length; index += 1) {
    const kitId = KIT_IDS[index];
    if (kitId === undefined) {
      continue;
    }

    mass[index] = (mass[index] ?? 0) * specialPlayLikelihood(cardId, kitId, bought);
  }
}

/**
 * Posterior over the opponent's kit from the acting seat's view and the public log.
 * `spied.kitId` short-circuits to a point mass (technical spec v5 §4.2).
 */
export function kitPosteriorForOpponent(
  opponentPlayerId: string,
  view: PlayingStateView,
  log: readonly ActionLogEntryView[],
): KitPosterior {
  const opponent = view.players.find((player) => player.id === opponentPlayerId);
  const spiedKitId = opponent?.spied?.kitId;
  if (spiedKitId !== undefined) {
    return toPosterior(pointMass(spiedKitId));
  }

  const mass = uniformMass();
  const boughtSpecials = new Set<CardId>();
  let spentUpgrade = false;

  for (const entry of log) {
    if (entry.kind === 'actionResolved') {
      if (entry.targetPlayerId !== opponentPlayerId || entry.outcome !== 'immune') {
        continue;
      }

      // Invisibility (and Cloning-on-invisible) reports `immune` for cards no kit
      // lists in `immuneTo`. Do not zero the roster — resolve-pending.ts applies
      // invisibility before kit `immuneTo`. Untouchable thief/spy is the catalog tell.
      if (kitsWithImmuneTo(entry.cardId).length === 0) {
        continue;
      }

      zeroKitsUnless(mass, (kitId) => getKit(kitId).traits.immuneTo.includes(entry.cardId));
      renormalize(mass);
      continue;
    }

    if (entry.kind !== 'actionPlayed' || entry.actorPlayerId !== opponentPlayerId) {
      continue;
    }

    if (entry.action === 'buySpecialCard' && entry.cardId !== undefined) {
      boughtSpecials.add(entry.cardId);
      continue;
    }

    if (entry.action === 'upgradeCard' || entry.action === 'buyUpgradePoint') {
      spentUpgrade = true;
      continue;
    }

    if (entry.action === 'playMultipleAttacks') {
      zeroKitsUnless(
        mass,
        (kitId) => getKit(kitId).traits.allowsMultipleAttacksPerTurn,
      );
    }

    if (
      entry.action === 'playCard' &&
      entry.isUpgraded === true &&
      entry.cardId !== undefined &&
      !spentUpgrade
    ) {
      // Free upgrade is a trait tell only when some kit actually lists the card.
      if (kitsWithAlwaysUpgraded(entry.cardId).length > 0) {
        const cardId = entry.cardId;
        zeroKitsUnless(mass, (kitId) => getKit(kitId).traits.alwaysUpgraded.includes(cardId));
      }
    }

    if (entry.action === 'playCard' || entry.action === 'playMultipleAttacks') {
      for (const cardId of specialIdsFromPlay(entry)) {
        applySpecialPlay(mass, cardId, boughtSpecials);
      }
    }

    renormalize(mass);
  }

  return toPosterior(mass);
}

const SAMPLE_BINS: readonly number[] = Array.from({ length: 10_000 }, (_, index) => index);

/**
 * Weighted sample from a kit posterior. Uses only `rng.pick` (L34-02 contract).
 */
export function sampleKit(
  posterior: KitPosterior,
  rng: { pick: <T>(xs: readonly T[]) => T },
): KitId {
  const bin = rng.pick(SAMPLE_BINS);
  const unit = (bin + 0.5) / SAMPLE_BINS.length;
  let cumulative = 0;

  for (const kitId of KIT_IDS) {
    cumulative += posterior[kitId];
    if (unit < cumulative) {
      return kitId;
    }
  }

  const support = KIT_IDS.filter((kitId) => posterior[kitId] > 0);
  if (support.length === 0) {
    return rng.pick(KIT_IDS);
  }

  return rng.pick(support);
}
