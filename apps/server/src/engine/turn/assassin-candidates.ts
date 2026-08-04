/**
 * Bounded Assassin `playMultipleAttacks` candidates — technical spec v3 §4.3 (L16-02).
 *
 * Deliberate non-exhaustive approximation: sizes 2–3 only, greedy, hard cap 8.
 * Full subset × target enumeration must never be written.
 */

import {
  attackDamageFor,
  getKit,
  isSharedAttackCardId,
  type CardInstance,
  type GameState,
  type Player,
} from '@card-battle/shared';

import { findHandler } from '../../cards/registry';
import { createRng } from '../rng';
import type { TurnAction } from './perform-action';
import { playPointsCost } from './play-cost';

/** Tunable default — technical spec v3 §4.3. */
export const ASSASSIN_CANDIDATE_CAP = 8;

interface AttackPick {
  instance: CardInstance;
  damage: number;
}

interface AttackSlot {
  instanceId: string;
  targetPlayerId: string;
}

export function listAssassinMultiAttackCandidates(
  state: GameState,
  actor: Player,
): readonly TurnAction[] {
  if (!getKit(actor.kitId).traits.allowsMultipleAttacksPerTurn) {
    return [];
  }

  const attacks = rankAttackCopies(actor);
  const targets = rankOpponentTargets(state, actor);

  if (attacks.length < 2 || targets.length < 1) {
    return [];
  }

  const raw = buildRawCandidates(attacks, targets);
  const out: TurnAction[] = [];
  const seen = new Set<string>();

  for (const attacksSlots of raw) {
    if (out.length >= ASSASSIN_CANDIDATE_CAP) {
      break;
    }

    const key = candidateKey(attacksSlots);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);

    if (!isAffordableCandidate(state, actor, attacksSlots)) {
      continue;
    }

    out.push({ type: 'playMultipleAttacks', attacks: attacksSlots });
  }

  return out;
}

function rankAttackCopies(actor: Player): AttackPick[] {
  const picks: AttackPick[] = [];

  for (const instance of actor.hand) {
    if (!isSharedAttackCardId(instance.cardId)) {
      continue;
    }

    picks.push({
      instance,
      damage: attackDamageFor(instance.cardId, instance.isUpgraded),
    });
  }

  picks.sort((left, right) => {
    if (right.damage !== left.damage) {
      return right.damage - left.damage;
    }

    return left.instance.instanceId.localeCompare(right.instance.instanceId);
  });

  return picks;
}

/**
 * Living opponents in seeded shuffle order — view-derivable (alive ids only).
 * Must not read hidden lives: §10.1 / L16-03. Policy threat ranking is separate (§4.4).
 */
function rankOpponentTargets(state: GameState, actor: Player): Player[] {
  const living = state.players.filter(
    (player) => player.id !== actor.id && !player.isEliminated,
  );
  const rng = createRng(`${state.seed}:list-legal-targets:${actor.id}:${state.turnSequence}`);
  return rng.shuffle(living);
}

function buildRawCandidates(
  attacks: readonly AttackPick[],
  targets: readonly Player[],
): AttackSlot[][] {
  const a1 = attacks[0];
  const a2 = attacks[1];
  const a3 = attacks[2];
  const t1 = targets[0];
  const t2 = targets[1];
  const t3 = targets[2];

  if (a1 === undefined || a2 === undefined || t1 === undefined) {
    return [];
  }

  const candidates: AttackSlot[][] = [];

  // 1. Top-2 → top target
  candidates.push([
    { instanceId: a1.instance.instanceId, targetPlayerId: t1.id },
    { instanceId: a2.instance.instanceId, targetPlayerId: t1.id },
  ]);

  if (t2 !== undefined) {
    // 2. Top-2 split across top two
    candidates.push([
      { instanceId: a1.instance.instanceId, targetPlayerId: t1.id },
      { instanceId: a2.instance.instanceId, targetPlayerId: t2.id },
    ]);
    // 3. Swapped split
    candidates.push([
      { instanceId: a1.instance.instanceId, targetPlayerId: t2.id },
      { instanceId: a2.instance.instanceId, targetPlayerId: t1.id },
    ]);
  }

  if (a3 !== undefined) {
    // 4. Size 3 all on T1
    candidates.push([
      { instanceId: a1.instance.instanceId, targetPlayerId: t1.id },
      { instanceId: a2.instance.instanceId, targetPlayerId: t1.id },
      { instanceId: a3.instance.instanceId, targetPlayerId: t1.id },
    ]);

    if (t2 !== undefined) {
      // 5. Size 3 mix
      candidates.push([
        { instanceId: a1.instance.instanceId, targetPlayerId: t1.id },
        { instanceId: a2.instance.instanceId, targetPlayerId: t2.id },
        { instanceId: a3.instance.instanceId, targetPlayerId: t1.id },
      ]);
      candidates.push([
        { instanceId: a1.instance.instanceId, targetPlayerId: t1.id },
        { instanceId: a2.instance.instanceId, targetPlayerId: t2.id },
        { instanceId: a3.instance.instanceId, targetPlayerId: t2.id },
      ]);
    }

    if (t2 !== undefined && t3 !== undefined) {
      // 6. Size 3 across top three
      candidates.push([
        { instanceId: a1.instance.instanceId, targetPlayerId: t1.id },
        { instanceId: a2.instance.instanceId, targetPlayerId: t2.id },
        { instanceId: a3.instance.instanceId, targetPlayerId: t3.id },
      ]);
    }

    // 7–8. Size-2 with A3 replacing A2
    candidates.push([
      { instanceId: a1.instance.instanceId, targetPlayerId: t1.id },
      { instanceId: a3.instance.instanceId, targetPlayerId: t1.id },
    ]);

    if (t2 !== undefined) {
      candidates.push([
        { instanceId: a1.instance.instanceId, targetPlayerId: t1.id },
        { instanceId: a3.instance.instanceId, targetPlayerId: t2.id },
      ]);
    }
  }

  return candidates;
}

function candidateKey(attacks: readonly AttackSlot[]): string {
  return attacks.map((slot) => `${slot.instanceId}>${slot.targetPlayerId}`).join('|');
}

function isAffordableCandidate(
  state: GameState,
  actor: Player,
  attacks: readonly AttackSlot[],
): boolean {
  let totalCost = 0;
  const rng = createRng(`${state.seed}:list-legal-assassin-check`);

  for (const slot of attacks) {
    const instance = actor.hand.find((card) => card.instanceId === slot.instanceId);

    if (instance === undefined || !isSharedAttackCardId(instance.cardId)) {
      return false;
    }

    const target = state.players.find((player) => player.id === slot.targetPlayerId);

    if (target === undefined || target.isEliminated || target.id === actor.id) {
      return false;
    }

    const handler = findHandler(instance.cardId);

    if (handler === undefined) {
      return false;
    }

    if (
      !handler.canPlay({
        state,
        sourcePlayerId: actor.id,
        targetPlayerId: slot.targetPlayerId,
        card: instance,
        quantity: null,
        rng,
        nowMs: 0,
      })
    ) {
      return false;
    }

    totalCost += playPointsCost(instance.cardId);
  }

  return actor.points >= totalCost;
}
