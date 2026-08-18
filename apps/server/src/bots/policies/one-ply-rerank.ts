/**
 * One-round Phase A re-rank — L33-05 structural edge over pure greedy.
 *
 * Delayed resolution (golden rule 3): an attack aimed at an opponent resolves on
 * *their* turn, after they act. Ranking right after our own turn barely sees
 * pressure land. For each top-K candidate we:
 *   1. Determinize the view (Lot 34) into a plausible full state
 *   2. Apply the candidate and complete our turn
 *   3. Advance intervening opponent turns with greedy `decideWithReason`
 *      until it is our seat again (one round)
 *   4. Score by Phase A `evaluate` self win-prob, averaged over worlds
 *   5. Flip from greedy only when the best candidate beats greedy by MARGIN
 *      (noise flips against a near-optimal hand-tuned yardstick are harmful)
 */

import type {
  ActionLogEntryView,
  GameState,
  PlayingStateView,
} from '@card-battle/shared';

import { createRng, type Rng } from '../../engine/rng';
import type { TurnAction } from '../../engine/turn/perform-action';
import {
  performAndCompleteTurn,
  type TurnSubChoiceHooks,
} from '../../engine/turn/orchestrate-turn';
import {
  findSoleSurvivorId,
  listAvailableRewardCards,
} from '../../engine/turn/elimination-rewards';
import { listLegalActions } from '../../engine/turn/list-legal-actions';
import { buildPlayingViewFor } from '../../protocol/build-view-for';
import { determinizeFromView } from '../belief/determinize';
import { evaluate } from '../eval/evaluate';
import {
  decideWithReason,
  scoreActions,
  type PolicyDecision,
  type ScoredAction,
} from '../heuristic-policy';
import type { BotPolicy } from '../policy-types';
import type { PolicyWeights } from '../policy-weights';
import { cloneGameState } from '../search/clone-state';

/** Fixed clock for headless sims (same convention as run-game). */
const SIM_NOW_MS = 0;

/** How many top-scoring actions to re-rank. */
export const ONE_PLY_TOP_K = 6;

/** Determinized worlds averaged per decision (belief noise). */
export const ONE_PLY_WORLD_COUNT = 2;

/**
 * Minimum win-prob gain over greedy before we flip.
 * Below this, stay with the hand-tuned prior (v4-class action weights).
 */
const FLIP_MARGIN = 0.025;

export function decideWithOnePlyRerank(
  view: PlayingStateView,
  actions: readonly TurnAction[],
  rng: Rng,
  weights: PolicyWeights,
  policy: BotPolicy,
  actionLog: readonly ActionLogEntryView[],
): PolicyDecision {
  if (actions.length === 0) {
    throw new RangeError('decide received an empty action list');
  }

  if (actions.length === 1) {
    return decideWithReason(view, actions, rng, weights);
  }

  const scored = scoreActions(view, actions, rng, weights);
  const ranked = [...scored].sort((left, right) => right.score - left.score);
  const candidates = ranked.slice(0, Math.min(ONE_PLY_TOP_K, ranked.length));
  const greedy = candidates[0];

  if (greedy === undefined) {
    return decideWithReason(view, actions, rng, weights);
  }

  if (candidates.length === 1) {
    return { action: greedy.action, reason: { code: greedy.code } };
  }

  const seed = `${view.gameCode}:${view.you}:${String(view.turnSequence)}:1ply`;
  const greedyValue = meanCandidateValue(
    greedy,
    view,
    actionLog,
    weights,
    policy,
    `${seed}:greedy`,
  );

  if (greedyValue === null) {
    return { action: greedy.action, reason: { code: greedy.code } };
  }

  let best = greedy;
  let bestValue = greedyValue;

  for (const candidate of candidates.slice(1)) {
    const value = meanCandidateValue(
      candidate,
      view,
      actionLog,
      weights,
      policy,
      `${seed}:${candidate.code}`,
    );

    if (value === null) {
      continue;
    }

    if (value > bestValue + 1e-12) {
      bestValue = value;
      best = candidate;
    } else if (
      Math.abs(value - bestValue) <= 1e-12 &&
      candidate.score > best.score
    ) {
      best = candidate;
    }
  }

  if (bestValue < greedyValue + FLIP_MARGIN) {
    return { action: greedy.action, reason: { code: greedy.code } };
  }

  return { action: best.action, reason: { code: best.code } };
}

function meanCandidateValue(
  candidate: ScoredAction,
  view: PlayingStateView,
  actionLog: readonly ActionLogEntryView[],
  weights: PolicyWeights,
  policy: BotPolicy,
  seedPrefix: string,
): number | null {
  const values: number[] = [];

  for (let world = 0; world < ONE_PLY_WORLD_COUNT; world += 1) {
    try {
      const root = determinizeFromView(
        view,
        actionLog,
        createRng(`${seedPrefix}:world:${String(world)}`),
      );
      const next = cloneGameState(root);
      const hooks = onePlyHooks(policy, actionLog, view.gameCode);
      const applied = performAndCompleteTurn(next, view.you, candidate.action, hooks, {
        nowMs: SIM_NOW_MS,
        rng: createRng(`${seedPrefix}:apply:${String(world)}`),
      });

      if (!applied.ok) {
        continue;
      }

      advanceOpponentsGreedy(
        next,
        view.you,
        weights,
        policy,
        actionLog,
        view.gameCode,
        `${seedPrefix}:adv:${String(world)}`,
      );

      values.push(selfWinProbability(next, view.you, weights));
    } catch {
      // Bad determinization / incomplete reconstruct — skip this world.
    }
  }

  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Play greedy turns for every seat until `selfId` acts again (one round), or
 * the game ends. Caps at living opponents so a bug cannot loop forever.
 */
function advanceOpponentsGreedy(
  state: GameState,
  selfId: string,
  weights: PolicyWeights,
  policy: BotPolicy,
  actionLog: readonly ActionLogEntryView[],
  gameCode: string,
  seedPrefix: string,
): void {
  const livingAtStart = state.players.filter((player) => !player.isEliminated).length;
  const maxSteps = Math.max(1, livingAtStart);

  for (let step = 0; step < maxSteps; step += 1) {
    if (findSoleSurvivorId(state) !== null) {
      return;
    }

    const actorId = state.currentTurnPlayerId;

    if (actorId === null || actorId === selfId) {
      return;
    }

    const actorView = buildPlayingViewFor({
      recipientSessionId: actorId,
      gameCode,
      state,
      turnDeadlineMs: null,
      actionLog,
    });
    const legal = listLegalActions(state, actorId);

    if (legal.length === 0) {
      return;
    }

    const decision = decideWithReason(
      actorView,
      legal,
      createRng(`${seedPrefix}:opp:${actorId}:${String(state.turnSequence)}`),
      weights,
    );
    const hooks = onePlyHooks(policy, actionLog, gameCode);
    const result = performAndCompleteTurn(state, actorId, decision.action, hooks, {
      nowMs: SIM_NOW_MS,
      rng: createRng(`${seedPrefix}:apply-opp:${actorId}:${String(step)}`),
    });

    if (!result.ok) {
      return;
    }
  }
}

function selfWinProbability(
  state: GameState,
  playerId: string,
  weights: PolicyWeights,
): number {
  const living = state.players.filter((player) => !player.isEliminated);
  const index = living.findIndex((player) => player.id === playerId);

  if (index < 0) {
    return 0;
  }

  const probs = evaluate(state, playerId, weights);
  return probs[index] ?? 0;
}

function onePlyHooks(
  policy: BotPolicy,
  actionLog: readonly ActionLogEntryView[],
  gameCode: string,
): TurnSubChoiceHooks {
  return {
    resolveMirror: (state, actorId) => {
      const mirrorView = buildPlayingViewFor({
        recipientSessionId: actorId,
        gameCode,
        state,
        turnDeadlineMs: null,
        actionLog,
      });
      const pick = policy.pickMirrorRedirect(
        mirrorView,
        createRng(`${state.seed}:bot:${actorId}:mirror:${String(state.turnSequence)}`),
        state.mirrorChoice?.eligibleEffectIds,
      );

      if (pick === null) {
        throw new Error('Mirror pending but policy returned null');
      }

      return pick;
    },
    resolveSteal: (state, actorId) => {
      const choice = state.stealChoice;

      if (choice === null || choice.eligibleInstanceIds.length === 0) {
        throw new Error('steal pending without eligibles');
      }

      const stealView = buildPlayingViewFor({
        recipientSessionId: actorId,
        gameCode,
        state,
        turnDeadlineMs: null,
        actionLog,
      });

      return {
        instanceId: policy.pickStealInstanceId(
          stealView,
          choice.eligibleInstanceIds,
          createRng(`${state.seed}:bot:${actorId}:steal:${String(state.turnSequence)}`),
        ),
      };
    },
    resolvePoolPick: (state, actorId) => {
      const choice = state.subChoice;

      if (choice?.kind !== 'pool-pick' || choice.playerId !== actorId) {
        throw new Error('pool pick pending without subChoice');
      }

      return {
        instanceIds: policy.pickPoolInstanceIds(
          state.pool,
          choice.eligibleInstanceIds,
          choice.maxCount,
          createRng(`${state.seed}:bot:${actorId}:pool:${String(state.turnSequence)}`),
        ),
      };
    },
    resolveSpecialPick: (state, actorId) => {
      const choice = state.subChoice;

      if (choice?.kind !== 'special-pick' || choice.playerId !== actorId) {
        throw new Error('special pick pending without subChoice');
      }

      return {
        cardId: policy.pickSpecialCardId(
          choice.eligibleCardIds,
          createRng(`${state.seed}:bot:${actorId}:special:${String(state.turnSequence)}`),
        ),
      };
    },
    resolveReanimationKit: (state, playerId) => {
      const choice = state.subChoice;

      if (choice?.kind !== 'reanimation-kit' || choice.playerId !== playerId) {
        throw new Error('reanimation kit pending without subChoice');
      }

      return {
        kitId: policy.pickReanimationKitId(
          choice.eligibleKitIds,
          createRng(
            `${state.seed}:bot:${playerId}:reanim-kit:${String(state.turnSequence)}`,
          ),
        ),
      };
    },
    resolveReward: (state) => {
      const choice = state.rewardChoice;

      if (choice === null) {
        throw new Error('reward pending without rewardChoice');
      }

      const rewardView = buildPlayingViewFor({
        recipientSessionId: choice.eliminatorPlayerId,
        gameCode,
        state,
        turnDeadlineMs: null,
        actionLog,
      });
      const available = listAvailableRewardCards(state, choice.eliminatedPlayerId);
      const picks = policy.pickEliminationRewards(
        rewardView,
        available,
        state.lifeLimit,
        createRng(
          `${state.seed}:bot:${choice.eliminatorPlayerId}:reward:${String(state.turnSequence)}`,
        ),
      );

      return {
        chooserPlayerId: choice.eliminatorPlayerId,
        eliminationId: choice.eliminationId,
        choices: picks.choices,
      };
    },
  };
}
