/**
 * Elimination rewards — rules spec §6, technical spec §5.5–§5.6, backlog Lot 6.
 */

import {
  type CardInstance,
  type GameState,
  type Player,
  type RewardChoice,
} from '@card-battle/shared';

import { takeCardFrom } from '../cards/steal-card';
import { gainPoints } from '../economy/gain-points';
import { gainUpgradePoints } from '../economy/gain-upgrade-points';
import { transferCardInstance } from '../kits/acquire-card';
import { gainLives } from '../life/gain-lives';
import type { Rng } from '../rng';
import { advanceTurn, findPlayer } from './advance-turn';
import { poolDeactivatedPersistentEffects } from '../specials/pool-deactivated';

export const REWARD_SUB_CHOICE_MS = 20_000;
export const ELIMINATION_REWARD_LIVES = 4;
export const ELIMINATION_REWARD_POINTS = 8;

export interface EliminationEvent {
  playerId: string;
  eliminatorPlayerId: string | null;
}

/**
 * Record a third-party source that dealt life loss or a lethal effect this phase.
 * Self sources are ignored. Distinct sources only.
 */
export function recordEliminationContributor(
  state: GameState,
  victimPlayerId: string,
  sourcePlayerId: string,
  livesLostOrLethal: number,
): void {
  if (livesLostOrLethal <= 0) {
    return;
  }

  if (sourcePlayerId === victimPlayerId) {
    return;
  }

  const already = state.eliminationContributors.some(
    (entry) =>
      entry.victimPlayerId === victimPlayerId && entry.sourcePlayerId === sourcePlayerId,
  );

  if (already) {
    return;
  }

  state.eliminationContributors.push({ victimPlayerId, sourcePlayerId });
}

/**
 * Pick the reward recipient among simultaneous eliminators — rules spec §6 italic.
 * Fewest lives, then fewest points, then seeded random among remaining ties.
 */
export function selectEliminator(
  candidateIds: readonly string[],
  state: GameState,
  rng: Rng,
): string | null {
  if (candidateIds.length === 0) {
    return null;
  }

  if (candidateIds.length === 1) {
    return candidateIds[0] ?? null;
  }

  const candidates = candidateIds
    .map((id) => findPlayer(state, id))
    .filter((player): player is Player => player !== undefined);

  if (candidates.length === 0) {
    return null;
  }

  let minLives = Infinity;

  for (const player of candidates) {
    if (player.lives < minLives) {
      minLives = player.lives;
    }
  }

  const byLives = candidates.filter((player) => player.lives === minLives);

  if (byLives.length === 1) {
    return byLives[0]?.id ?? null;
  }

  let minPoints = Infinity;

  for (const player of byLives) {
    if (player.points < minPoints) {
      minPoints = player.points;
    }
  }

  const byPoints = byLives.filter((player) => player.points === minPoints);

  if (byPoints.length === 1) {
    return byPoints[0]?.id ?? null;
  }

  return rng.pick(byPoints).id;
}

function candidatesForVictim(state: GameState, victimPlayerId: string): string[] {
  const ids: string[] = [];

  for (const entry of state.eliminationContributors) {
    if (entry.victimPlayerId !== victimPlayerId) {
      continue;
    }

    if (!ids.includes(entry.sourcePlayerId)) {
      ids.push(entry.sourcePlayerId);
    }
  }

  return ids;
}

function cleanupEliminatedPlayer(state: GameState, player: Player): void {
  player.pendingEffects = [];
  if (player.activePersistentEffects.length > 0) {
    poolDeactivatedPersistentEffects(state, player.activePersistentEffects);
    player.activePersistentEffects = [];
  }
}

function dumpCardsToPool(state: GameState, player: Player): void {
  state.pool.push(...player.hand, ...player.specialCards);
  player.hand = [];
  player.specialCards = [];
}

/** Freeze kit/cards/tokens before reward hold or pool dump — Lot 19. */
function captureEliminationSnapshot(player: Player, turnSequence: number): void {
  if (player.eliminationSnapshot !== null) {
    return;
  }

  player.eliminationSnapshot = {
    kitId: player.kitId,
    hand: player.hand.map((card) => ({ ...card })),
    specialCards: player.specialCards.map((card) => ({ ...card })),
    lives: player.lives,
    points: player.points,
    upgradePoints: player.upgradePoints,
    shield: player.shield,
    shieldIsUpgraded: player.shieldIsUpgraded,
    turnSequence,
  };
}

/**
 * Eliminate a player who still has lives (absence, inactivity, or Leave forfeit).
 * No eliminator → cards to the pool immediately — technical spec §5.7, L7-02…L7-04.
 *
 * @returns true when the player was newly eliminated.
 */
export function eliminateWithoutReward(state: GameState, playerId: string): boolean {
  const player = findPlayer(state, playerId);

  if (player === undefined || player.isEliminated) {
    return false;
  }

  captureEliminationSnapshot(player, state.turnSequence);
  player.isEliminated = true;
  // Forfeit/absence elimination — technical spec §5.7, rules spec §6.
  // Not a typed loss: the player may still have lives; this is administrative state only.
  player.lives = 0;
  cleanupEliminatedPlayer(state, player);
  dumpCardsToPool(state, player);
  return true;
}

/** Sole remaining non-eliminated player, or null if the match is not decided. */
export function findSoleSurvivorId(state: GameState): string | null {
  const alive = state.players.filter((player) => !player.isEliminated);

  if (alive.length !== 1) {
    return null;
  }

  return alive[0]?.id ?? null;
}

function activateRewardHead(state: GameState, nowMs: number): void {
  const head = state.rewardQueue[0];

  if (head === undefined) {
    state.rewardChoice = null;
    return;
  }

  state.rewardChoice = {
    eliminationId: head.eliminationId,
    eliminatorPlayerId: head.eliminatorPlayerId,
    eliminatedPlayerId: head.eliminatedPlayerId,
    deadlineMs: nowMs + REWARD_SUB_CHOICE_MS,
  };
}

/**
 * Mark players at 0 lives, attribute eliminators, enqueue rewards or pool cards.
 *
 * `eliminationId` is seed-derived (not `randomUUID`) so scripted / simulated games can
 * deep-equal `GameState` — technical spec v3 §8.1 / §10.3 companion to clock injection.
 */
export function processEliminations(
  state: GameState,
  rng: Rng,
  nowMs: number = Date.now(),
): EliminationEvent[] {
  const events: EliminationEvent[] = [];

  for (const player of state.players) {
    if (player.isEliminated || player.lives > 0) {
      continue;
    }

    captureEliminationSnapshot(player, state.turnSequence);
    player.isEliminated = true;
    // Idempotent normalization — technical spec §4.3 step 5, §4.2.
    // Lives were already 0 from typed primitives or lethal effects; not a new loss event.
    player.lives = 0;
    cleanupEliminatedPlayer(state, player);

    const candidates = candidatesForVictim(state, player.id);
    const eliminatorPlayerId = selectEliminator(candidates, state, rng);

    events.push({ playerId: player.id, eliminatorPlayerId });

    if (eliminatorPlayerId === null) {
      dumpCardsToPool(state, player);
      continue;
    }

    state.rewardQueue.push({
      eliminationId: `elim:${state.turnSequence}:${player.id}`,
      eliminatedPlayerId: player.id,
      eliminatorPlayerId,
    });
  }

  state.eliminationContributors = [];

  if (state.rewardChoice === null && state.rewardQueue.length > 0) {
    activateRewardHead(state, nowMs);
  }

  return events;
}

export function listAvailableRewardCards(state: GameState, eliminatedPlayerId: string): CardInstance[] {
  const player = findPlayer(state, eliminatedPlayerId);

  if (player === undefined) {
    return [];
  }

  return [...player.hand, ...player.specialCards];
}

function validateChoice(
  eliminated: Player,
  choice: RewardChoice,
  claimedInstanceIds: Set<string>,
): { ok: true } | { ok: false; message: string } {
  if (choice.type !== 'card') {
    return { ok: true };
  }

  if (claimedInstanceIds.has(choice.instanceId)) {
    return { ok: false, message: 'That card was already chosen as a reward.' };
  }

  const inHand = eliminated.hand.some((card) => card.instanceId === choice.instanceId);
  const inSpecials = eliminated.specialCards.some(
    (card) => card.instanceId === choice.instanceId,
  );

  if (!inHand && !inSpecials) {
    return { ok: false, message: 'That card is not available.' };
  }

  claimedInstanceIds.add(choice.instanceId);
  return { ok: true };
}

function applyOneChoice(
  state: GameState,
  eliminator: Player,
  eliminated: Player,
  choice: RewardChoice,
): void {
  if (choice.type === 'lives') {
    gainLives(eliminator, ELIMINATION_REWARD_LIVES, state.lifeLimit);
    return;
  }

  if (choice.type === 'points') {
    gainPoints(eliminator, ELIMINATION_REWARD_POINTS, 'direct');
    return;
  }

  if (choice.type === 'upgradePoint') {
    gainUpgradePoints(eliminator, 1, 'direct');
    return;
  }

  const card = takeCardFrom(eliminated, choice.instanceId);

  if (card !== undefined) {
    transferCardInstance(eliminator, card);
  }
}

function finishRewardJob(state: GameState, nowMs: number): void {
  const job = state.rewardQueue.shift();

  if (job === undefined) {
    state.rewardChoice = null;
    return;
  }

  const eliminated = findPlayer(state, job.eliminatedPlayerId);

  if (eliminated !== undefined) {
    dumpCardsToPool(state, eliminated);
  }

  state.rewardChoice = null;
  activateRewardHead(state, nowMs);
}

export type ApplyRewardResult =
  | {
      ok: true;
      rewardChoicePending: boolean;
      winnerPlayerId: string | null;
      /** Opaque public history — picks never included (L9-02). */
      rewardsClaimed: {
        eliminatorPlayerId: string;
        eliminatedPlayerId: string;
      };
    }
  | { ok: false; message: string };

/**
 * Apply the eliminator's two reward picks for the active job.
 */
export function applyEliminationRewardChoices(
  state: GameState,
  chooserPlayerId: string,
  eliminationId: string,
  choices: readonly [RewardChoice, RewardChoice],
  nowMs: number = Date.now(),
): ApplyRewardResult {
  const active = state.rewardChoice;

  if (active?.eliminationId !== eliminationId) {
    return { ok: false, message: 'No matching elimination reward pending.' };
  }

  if (active.eliminatorPlayerId !== chooserPlayerId) {
    return { ok: false, message: 'Only the eliminator may choose rewards.' };
  }

  const head = state.rewardQueue[0];

  if (head?.eliminationId !== eliminationId) {
    return { ok: false, message: 'No matching elimination reward pending.' };
  }

  const eliminator = findPlayer(state, active.eliminatorPlayerId);
  const eliminated = findPlayer(state, active.eliminatedPlayerId);

  if (eliminator === undefined || eliminated === undefined) {
    return { ok: false, message: 'Unknown player.' };
  }

  const claimed = new Set<string>();
  const firstCheck = validateChoice(eliminated, choices[0], claimed);

  if (!firstCheck.ok) {
    return firstCheck;
  }

  const secondCheck = validateChoice(eliminated, choices[1], claimed);

  if (!secondCheck.ok) {
    return secondCheck;
  }

  const rewardsClaimed = {
    eliminatorPlayerId: active.eliminatorPlayerId,
    eliminatedPlayerId: active.eliminatedPlayerId,
  };

  applyOneChoice(state, eliminator, eliminated, choices[0]);
  applyOneChoice(state, eliminator, eliminated, choices[1]);

  finishRewardJob(state, nowMs);
  return { ...resumeAfterRewards(state), rewardsClaimed };
}

/**
 * Default on sub-choice expiry: 2 × 4 lives (technical spec §5.6).
 */
export function applyDefaultEliminationRewards(
  state: GameState,
  nowMs: number = Date.now(),
): ApplyRewardResult {
  const active = state.rewardChoice;

  if (active === null) {
    return { ok: false, message: 'No elimination reward pending.' };
  }

  return applyEliminationRewardChoices(
    state,
    active.eliminatorPlayerId,
    active.eliminationId,
    [{ type: 'lives' }, { type: 'lives' }],
    nowMs,
  );
}

function findWinner(state: GameState): string | null {
  const alive = state.players.filter((player) => !player.isEliminated);

  if (alive.length === 1) {
    return alive[0]?.id ?? null;
  }

  return null;
}

export function resumeAfterRewards(state: GameState): {
  ok: true;
  rewardChoicePending: boolean;
  winnerPlayerId: string | null;
} {
  if (state.rewardChoice !== null || state.rewardQueue.length > 0) {
    return { ok: true, rewardChoicePending: true, winnerPlayerId: null };
  }

  const winnerPlayerId = findWinner(state);

  if (winnerPlayerId === null) {
    advanceTurn(state);
  } else {
    state.currentTurnPlayerId = null;
  }

  return { ok: true, rewardChoicePending: false, winnerPlayerId };
}

export function hasPendingEliminationRewards(state: GameState): boolean {
  return state.rewardChoice !== null || state.rewardQueue.length > 0;
}
