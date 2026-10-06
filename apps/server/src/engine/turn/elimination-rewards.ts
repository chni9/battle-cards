/**
 * Elimination rewards — rules spec §6, technical spec §5.5–§5.6, backlog Lot 6.
 */

import {
  actionReject,
  isAttackCardId,
  type ActionReject,
  type CardId,
  type CardInstance,
  type GameState,
  type KitId,
  type Player,
  type RewardChoice,
} from '@card-battle/shared';

import { takeCardFrom } from '../cards/steal-card';
import {
  grantLives,
  grantPoints,
  grantUpgradePoints,
} from '../economy/grant-resources';
import { transferCardInstance } from '../kits/acquire-card';
import { pickReanimationKit, reanimatePlayer } from '../reanimate-player';
import { createRng, type Rng } from '../rng';
import {
  recordAutoDeactivation,
  type AutoDeactivation,
} from '../specials/auto-deactivation-log';
import { poolDeactivatedPersistentEffects } from '../specials/pool-deactivated';
import { onPlayerEliminatedForAbsorbWindow } from './absorb-window';
import { advanceTurn, findPlayer } from './advance-turn';
import { beginReanimationKitPick } from './generic-sub-choice';
import { cancelPendingSentencesFrom } from './pending-sentences';
import { SUB_CHOICE_MS } from './sub-choice';

/** Re-exports the single `SUB_CHOICE_MS` — technical spec v4 §4.4 (L20-18). */
export const REWARD_SUB_CHOICE_MS = SUB_CHOICE_MS;
export const ELIMINATION_REWARD_LIVES = 4;
export const ELIMINATION_REWARD_POINTS = 8;

export interface EliminationEvent {
  playerId: string;
  eliminatorPlayerId: string | null;
  /** Present for Draw bust (Lot 64). Room defaults other combat elims. */
  reason?: 'gambling';
}

/** Auto-lost persistents from a leave / forfeit / inactivity dump (L56-07). */
export interface PersistentDeactivation {
  ownerPlayerId: string;
  cardId: CardId;
  isUpgraded: boolean;
  turnSequence: number;
}

export interface EliminateWithoutRewardResult {
  eliminated: boolean;
  persistentDeactivations: readonly PersistentDeactivation[];
}

/** Voluntary forfeit / consented leave — may open the existing reward dialog (Lot 71). */
export interface ForfeitEliminationResult extends EliminateWithoutRewardResult {
  rewardChoicePending: boolean;
}

/**
 * Record a third-party source that contributed to an elimination this resolution.
 * Self sources are ignored. Distinct sources only.
 *
 * `attackResolved` (Lot 69): pending attack that applied on the victim's lethal
 * turn counts even when the shield absorbed all damage — delayed turns must not
 * hide contributors who attacked before the finishing hit.
 */
export function recordEliminationContributor(
  state: GameState,
  victimPlayerId: string,
  sourcePlayerId: string,
  livesLostOrLethal: number,
  options?: { readonly attackResolved?: true },
): void {
  if (livesLostOrLethal <= 0 && options?.attackResolved !== true) {
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
/**
 * Every lethal contributor receives rewards in this order (Lot 69).
 * Fewest lives, then fewest points, then seeded shuffle within ties.
 */
export function orderEliminators(
  candidateIds: readonly string[],
  state: GameState,
  rng: Rng,
): string[] {
  if (candidateIds.length === 0) {
    return [];
  }

  const candidates = candidateIds
    .map((id) => findPlayer(state, id))
    .filter((player): player is Player => player !== undefined);

  const groups = new Map<string, Player[]>();

  for (const player of candidates) {
    const key = `${String(player.lives)}:${String(player.points)}`;
    const bucket = groups.get(key);

    if (bucket === undefined) {
      groups.set(key, [player]);
    } else {
      bucket.push(player);
    }
  }

  const sortedKeys = [...groups.keys()].sort((left, right) => {
    const leftParts = left.split(':');
    const rightParts = right.split(':');
    const leftLives = Number(leftParts[0] ?? 0);
    const leftPoints = Number(leftParts[1] ?? 0);
    const rightLives = Number(rightParts[0] ?? 0);
    const rightPoints = Number(rightParts[1] ?? 0);

    if (leftLives !== rightLives) {
      return leftLives - rightLives;
    }

    return leftPoints - rightPoints;
  });

  const ordered: string[] = [];

  for (const key of sortedKeys) {
    const bucket = groups.get(key) ?? [];
    ordered.push(...rng.shuffle(bucket).map((player) => player.id));
  }

  return ordered;
}

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

/**
 * Dump remaining persistents to the pool. Combat callers record onto the turn
 * WeakMap; leave/forfeit returns the list so the room can log immediately
 * without sharing that collector (L56-07).
 */
function cleanupEliminatedPlayer(state: GameState, player: Player): AutoDeactivation[] {
  cancelPendingSentencesFrom(state, player.id);
  player.pendingEffects = [];
  if (player.activePersistentEffects.length === 0) {
    return [];
  }

  const dumped: AutoDeactivation[] = player.activePersistentEffects.map((effect) => ({
    ownerPlayerId: player.id,
    cardId: effect.cardId,
    isUpgraded: effect.isUpgraded,
  }));
  poolDeactivatedPersistentEffects(state, player.activePersistentEffects);
  player.activePersistentEffects = [];
  return dumped;
}

function stampPersistentDeactivations(
  state: GameState,
  dumped: readonly AutoDeactivation[],
): PersistentDeactivation[] {
  return dumped.map((entry) => ({
    ...entry,
    turnSequence: state.turnSequence,
  }));
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

function lifecycleElimRng(state: GameState, playerId: string): Rng {
  return createRng(`${state.seed}:lifecycle-elim:${state.turnSequence}:${playerId}`);
}

/**
 * Living seats paid when someone forfeits or leaves the table (rules spec §6, Lot 71).
 * One seat once: a queued attack on the forfeiter, or any active Poison.
 * Captured before cleanup clears the queue and dumps persistents.
 */
function forfeitRewardRecipientIds(state: GameState, forfeiter: Player): string[] {
  const ids: string[] = [];

  const add = (playerId: string): void => {
    if (playerId === forfeiter.id || ids.includes(playerId)) {
      return;
    }

    const candidate = findPlayer(state, playerId);

    if (candidate === undefined || candidate.isEliminated) {
      return;
    }

    ids.push(playerId);
  };

  for (const effect of forfeiter.pendingEffects) {
    if (isAttackCardId(effect.cardId)) {
      add(effect.sourcePlayerId);
    }
  }

  for (const other of state.players) {
    if (other.activePersistentEffects.some((effect) => effect.cardId === 'poison')) {
      add(other.id);
    }
  }

  return ids;
}

/**
 * Eliminate a player who still has lives (absence, inactivity, or voluntary leave).
 * Absence and inactivity pass `payForfeitRewards: false` and dump cards immediately
 * (technical spec §5.7). The Forfeit button and leaving the table pass true: queued
 * attackers and active Poisoners pick before the card dump (Lot 71).
 * Armed Reanimation consumes and revives after the dump, or after rewards drain.
 *
 * Not a typed loss: the player may still have lives; this is administrative state only.
 */
function eliminateAdministrative(
  state: GameState,
  playerId: string,
  rng: Rng,
  nowMs: number,
  payForfeitRewards: boolean,
): ForfeitEliminationResult {
  const player = findPlayer(state, playerId);

  if (player === undefined || player.isEliminated) {
    return { eliminated: false, persistentDeactivations: [], rewardChoicePending: false };
  }

  const rewardRecipients = payForfeitRewards
    ? orderEliminators(forfeitRewardRecipientIds(state, player), state, rng)
    : [];

  consumeArmedReanimation(state, player);
  captureEliminationSnapshot(player, state.turnSequence);
  player.isEliminated = true;
  // Forfeit/absence elimination — technical spec §5.7, rules spec §6.
  // Not a typed loss: the player may still have lives; this is administrative state only.
  player.lives = 0;
  onPlayerEliminatedForAbsorbWindow(state, player);
  const persistentDeactivations = stampPersistentDeactivations(
    state,
    cleanupEliminatedPlayer(state, player),
  );

  if (rewardRecipients.length === 0) {
    dumpCardsToPool(state, player);
    processPendingReanimations(state, rng, nowMs);
    return { eliminated: true, persistentDeactivations, rewardChoicePending: false };
  }

  for (const rewardedEliminatorId of rewardRecipients) {
    state.rewardQueue.push({
      eliminationId: `elim:${state.turnSequence}:${player.id}:${rewardedEliminatorId}`,
      eliminatedPlayerId: player.id,
      eliminatorPlayerId: rewardedEliminatorId,
    });
  }

  if (state.rewardChoice === null) {
    activateRewardHead(state, nowMs);
  }

  return { eliminated: true, persistentDeactivations, rewardChoicePending: true };
}

/**
 * Absence or inactivity. No forfeit rewards — technical spec §5.7, L7-02…L7-04.
 */
export function eliminateWithoutReward(
  state: GameState,
  playerId: string,
  rng: Rng = lifecycleElimRng(state, playerId),
): EliminateWithoutRewardResult {
  const result = eliminateAdministrative(state, playerId, rng, Date.now(), false);
  return {
    eliminated: result.eliminated,
    persistentDeactivations: result.persistentDeactivations,
  };
}

/**
 * Forfeit button or leaving the table while playing (Lot 71).
 * Queued attackers and active Poisoners receive kill picks before cards hit the pool.
 */
export function eliminateForForfeit(
  state: GameState,
  playerId: string,
  rng: Rng = lifecycleElimRng(state, playerId),
  nowMs: number = Date.now(),
): ForfeitEliminationResult {
  return eliminateAdministrative(state, playerId, rng, nowMs, true);
}

/**
 * Players still in the match for sole-survivor / game-over — includes seats with
 * `pendingReanimation` (#V4-11 / §10.3).
 */
export function findSoleSurvivorId(state: GameState): string | null {
  const contenders = state.players.filter(
    (player) => !player.isEliminated || player.pendingReanimation !== null,
  );

  if (contenders.length !== 1) {
    return null;
  }

  return contenders[0]?.id ?? null;
}

/**
 * Contenders after `victim` has been marked eliminated (and after
 * `consumeArmedReanimation`). A pending revive still counts.
 * Designer 2026-08-06: skip elimination rewards when this would leave one
 * contender (game-ending elim) unless the victim is reviving.
 */
function countContendersAfterElim(state: GameState, victim: Player): number {
  return state.players.filter((player) => {
    if (player.id === victim.id) {
      return victim.pendingReanimation !== null;
    }

    return !player.isEliminated || player.pendingReanimation !== null;
  }).length;
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

export interface ProcessEliminationsResult {
  eliminations: EliminationEvent[];
  playerReanimated: readonly { playerId: string; kitId: KitId }[];
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
): ProcessEliminationsResult {
  const events: EliminationEvent[] = [];
  let playerReanimated: readonly { playerId: string; kitId: KitId }[] = [];

  for (const player of state.players) {
    if (player.isEliminated || player.lives > 0) {
      continue;
    }

    consumeArmedReanimation(state, player);
    captureEliminationSnapshot(player, state.turnSequence);
    player.isEliminated = true;
    // Idempotent normalization — technical spec §4.3 step 5, §4.2.
    // Lives were already 0 from typed primitives or lethal effects; not a new loss event.
    player.lives = 0;
    onPlayerEliminatedForAbsorbWindow(state, player);
    const dumped = cleanupEliminatedPlayer(state, player);
    for (const item of dumped) {
      recordAutoDeactivation(state, item.ownerPlayerId, item);
    }

    const candidates = candidatesForVictim(state, player.id);
    const eliminators = orderEliminators(candidates, state, rng);
    const eliminatorPlayerId = eliminators[0] ?? null;

    events.push({ playerId: player.id, eliminatorPlayerId });

    if (eliminators.length === 0) {
      dumpCardsToPool(state, player);
      continue;
    }

    const skipRewardsForGameEnd =
      player.pendingReanimation === null &&
      countContendersAfterElim(state, player) === 1;

    if (skipRewardsForGameEnd) {
      dumpCardsToPool(state, player);
      continue;
    }

    for (const rewardedEliminatorId of eliminators) {
      state.rewardQueue.push({
        eliminationId: `elim:${state.turnSequence}:${player.id}:${rewardedEliminatorId}`,
        eliminatedPlayerId: player.id,
        eliminatorPlayerId: rewardedEliminatorId,
      });
    }
  }

  state.eliminationContributors = [];

  if (state.rewardChoice === null && state.rewardQueue.length > 0) {
    activateRewardHead(state, nowMs);
  } else if (state.rewardQueue.length === 0) {
    playerReanimated = processPendingReanimations(state, rng, nowMs);
  }

  return { eliminations: events, playerReanimated };
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
): { ok: true } | ActionReject {
  if (choice.type !== 'card') {
    return { ok: true };
  }

  if (claimedInstanceIds.has(choice.instanceId)) {
    return actionReject('reward-card-already-chosen');
  }

  const inHand = eliminated.hand.some((card) => card.instanceId === choice.instanceId);
  const inSpecials = eliminated.specialCards.some(
    (card) => card.instanceId === choice.instanceId,
  );

  if (!inHand && !inSpecials) {
    return actionReject('reward-card-unavailable');
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
    grantLives(state, eliminator, ELIMINATION_REWARD_LIVES, 'direct');
    return;
  }

  if (choice.type === 'points') {
    grantPoints(state, eliminator, ELIMINATION_REWARD_POINTS, 'direct');
    return;
  }

  if (choice.type === 'upgradePoint') {
    grantUpgradePoints(state, eliminator, 1, 'direct');
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

  const victimStillHasRewardJobs = state.rewardQueue.some(
    (queued) => queued.eliminatedPlayerId === job.eliminatedPlayerId,
  );

  if (!victimStillHasRewardJobs) {
    const eliminated = findPlayer(state, job.eliminatedPlayerId);

    if (eliminated !== undefined) {
      dumpCardsToPool(state, eliminated);
    }
  }

  state.rewardChoice = null;
  activateRewardHead(state, nowMs);
}

/**
 * Consume an armed Reanimation before cleanup pools all persistents (#V4-11 / L26).
 * Sets `pendingReanimation` and pools the spent card instance.
 */
function consumeArmedReanimation(state: GameState, player: Player): void {
  const effectIndex = player.activePersistentEffects.findIndex(
    (effect) => effect.cardId === 'reanimation',
  );

  if (effectIndex < 0) {
    return;
  }

  const [effect] = player.activePersistentEffects.splice(effectIndex, 1);

  if (effect === undefined) {
    return;
  }

  poolDeactivatedPersistentEffects(state, [effect]);
  player.pendingReanimation = { isUpgraded: effect.isUpgraded };
}

/**
 * After cards are dumped (no-reward / lifecycle / post-reward), revive if pending.
 * Base: seeded random kit. Upgraded: caller raises `reanimation-kit` via
 * `processPendingReanimations` (#V4-13 / L26-02).
 */
function completePendingReanimationIfReady(
  state: GameState,
  player: Player,
  rng: Rng,
): { playerId: string; kitId: KitId } | null {
  if (player.pendingReanimation === null || player.pendingReanimation.isUpgraded) {
    return null;
  }

  const kitId = pickReanimationKit(rng);
  reanimatePlayer(state, player, kitId, rng);
  return { playerId: player.id, kitId };
}

/**
 * After the reward queue drains: revive base pending immediately; raise at most one
 * upgraded kit pick on `GameState.subChoice` (serial with rewards, never parallel).
 */
export function processPendingReanimations(
  state: GameState,
  rng: Rng,
  nowMs: number,
): readonly { playerId: string; kitId: KitId }[] {
  const reanimated: { playerId: string; kitId: KitId }[] = [];

  for (const player of state.players) {
    const entry = completePendingReanimationIfReady(state, player, rng);

    if (entry !== null) {
      reanimated.push(entry);
    }
  }

  if (state.subChoice !== null) {
    return reanimated;
  }

  const next = state.players.find((player) => player.pendingReanimation?.isUpgraded === true);

  if (next !== undefined) {
    beginReanimationKitPick(state, { playerId: next.id, nowMs });
  }

  return reanimated;
}

export type ApplyRewardResult =
  | {
      ok: true;
      rewardChoicePending: boolean;
      /** True when upgraded Reanimation kit pick is waiting (L26-02). */
      subChoicePending?: boolean;
      winnerPlayerId: string | null;
      /**
       * False when forfeit rewards end and the interrupted living seat keeps
       * the turn (Lot 71). Omitted while another reward job is still queued.
       */
      turnAdvanced?: boolean;
      /** Reanimation revives completed when rewards drain (L30-06). */
      playerReanimated?: readonly { playerId: string; kitId: KitId }[];
      /** Opaque public history — picks never included (L9-02). */
      rewardsClaimed: {
        eliminatorPlayerId: string;
        eliminatedPlayerId: string;
      };
    }
  | ActionReject;

/**
 * Apply the eliminator's two reward picks for the active job.
 */
export function applyEliminationRewardChoices(
  state: GameState,
  chooserPlayerId: string,
  eliminationId: string,
  choices: readonly [RewardChoice, RewardChoice],
  nowMs: number = Date.now(),
  rng: Rng = createRng(`${state.seed}:reward:${state.turnSequence}`),
): ApplyRewardResult {
  const active = state.rewardChoice;

  if (active?.eliminationId !== eliminationId) {
    return actionReject('no-matching-elimination-reward');
  }

  if (active.eliminatorPlayerId !== chooserPlayerId) {
    return actionReject('only-eliminator-chooses-rewards');
  }

  const head = state.rewardQueue[0];

  if (head?.eliminationId !== eliminationId) {
    return actionReject('no-matching-elimination-reward');
  }

  const eliminator = findPlayer(state, active.eliminatorPlayerId);
  const eliminated = findPlayer(state, active.eliminatedPlayerId);

  if (eliminator === undefined || eliminated === undefined) {
    return actionReject('unknown-player');
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
  return { ...resumeAfterRewards(state, rng, nowMs), rewardsClaimed };
}

/**
 * Default on sub-choice expiry: 2 × 4 lives (technical spec §5.6).
 */
export function applyDefaultEliminationRewards(
  state: GameState,
  nowMs: number = Date.now(),
  rng: Rng = createRng(`${state.seed}:reward-default:${state.turnSequence}`),
): ApplyRewardResult {
  const active = state.rewardChoice;

  if (active === null) {
    return actionReject('no-elimination-reward-pending');
  }

  return applyEliminationRewardChoices(
    state,
    active.eliminatorPlayerId,
    active.eliminationId,
    [{ type: 'lives' }, { type: 'lives' }],
    nowMs,
    rng,
  );
}

export function resumeAfterRewards(
  state: GameState,
  rng: Rng = createRng(`${state.seed}:resume-rewards:${state.turnSequence}`),
  nowMs: number = Date.now(),
): {
  ok: true;
  rewardChoicePending: boolean;
  subChoicePending?: boolean;
  winnerPlayerId: string | null;
  turnAdvanced?: boolean;
  playerReanimated?: readonly { playerId: string; kitId: KitId }[];
} {
  if (state.rewardChoice !== null || state.rewardQueue.length > 0) {
    return { ok: true, rewardChoicePending: true, winnerPlayerId: null };
  }

  const playerReanimated = processPendingReanimations(state, rng, nowMs);

  if (state.subChoice?.kind === 'reanimation-kit') {
    return {
      ok: true,
      rewardChoicePending: false,
      subChoicePending: true,
      winnerPlayerId: null,
      turnAdvanced: false,
      ...(playerReanimated.length > 0 ? { playerReanimated } : {}),
    };
  }

  const winnerPlayerId = findSoleSurvivorId(state);

  if (winnerPlayerId !== null) {
    delete state.suppressTurnAdvanceAfterRewards;
    state.currentTurnPlayerId = null;
    return {
      ok: true,
      rewardChoicePending: false,
      winnerPlayerId,
      turnAdvanced: false,
      ...(playerReanimated.length > 0 ? { playerReanimated } : {}),
    };
  }

  const current =
    state.currentTurnPlayerId === null
      ? undefined
      : findPlayer(state, state.currentTurnPlayerId);
  const holdTurn =
    state.suppressTurnAdvanceAfterRewards === true &&
    current !== undefined &&
    !current.isEliminated;

  delete state.suppressTurnAdvanceAfterRewards;

  if (holdTurn) {
    return {
      ok: true,
      rewardChoicePending: false,
      winnerPlayerId: null,
      turnAdvanced: false,
      ...(playerReanimated.length > 0 ? { playerReanimated } : {}),
    };
  }

  advanceTurn(state);

  return {
    ok: true,
    rewardChoicePending: false,
    winnerPlayerId: null,
    turnAdvanced: true,
    ...(playerReanimated.length > 0 ? { playerReanimated } : {}),
  };
}

export function hasPendingEliminationRewards(state: GameState): boolean {
  return state.rewardChoice !== null || state.rewardQueue.length > 0;
}
