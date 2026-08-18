/**
 * Truncated heuristic rollouts + belief-aware eval — technical spec v5 §6.4–6.5 (L35-05).
 */

import type {
  ActionLogEntryView,
  GameState,
  PlayingStateView,
} from '@card-battle/shared';

import { createRng } from '../../engine/rng';
import {
  findSoleSurvivorId,
  listAvailableRewardCards,
} from '../../engine/turn/elimination-rewards';
import { listLegalActions } from '../../engine/turn/list-legal-actions';
import {
  performAndCompleteTurn,
  type TurnSubChoiceHooks,
} from '../../engine/turn/orchestrate-turn';
import { buildPlayingViewFor } from '../../protocol/build-view-for';
import type { BeliefSummary } from '../belief/types';
import { evaluateFromFeatures } from '../eval/evaluate';
import { extractFeatures } from '../eval/features';
import type { BotPolicy } from '../policy-types';
import type { PolicyWeights } from '../policy-weights';
import { activeSubChoiceKind } from '../../engine/turn/sub-choice';
import { applySearchDecision } from './apply-search-decision';
import { listSearchDecisions, searchDecisionOwner } from './list-search-decisions';

export const SIM_NOW_MS = 0;

export function evaluateWithBelief(
  state: GameState,
  _perspectivePlayerId: string,
  belief: BeliefSummary,
  weights: PolicyWeights,
): Float64Array {
  void _perspectivePlayerId;
  const living = state.players.filter((player) => !player.isEliminated);
  const featureByPlayerId = new Map(
    living.map((player) => [
      player.id,
      extractFeatures(state, player.id, belief),
    ] as const),
  );

  return evaluateFromFeatures(
    state,
    living.map((player) => player.id),
    featureByPlayerId,
    weights,
  );
}

export function heuristicRolloutHooks(
  policy: BotPolicy,
  actionLog: readonly ActionLogEntryView[],
  gameCode: string,
): TurnSubChoiceHooks {
  return {
    resolveMirror: (state, actorId) => {
      const view = buildPlayingViewFor({
        recipientSessionId: actorId,
        gameCode,
        state,
        turnDeadlineMs: null,
        actionLog,
      });
      const pick = policy.pickMirrorRedirect(
        view,
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

      const view = buildPlayingViewFor({
        recipientSessionId: actorId,
        gameCode,
        state,
        turnDeadlineMs: null,
        actionLog,
      });
      return {
        instanceId: policy.pickStealInstanceId(
          view,
          choice.eligibleInstanceIds,
          createRng(`${state.seed}:bot:${actorId}:steal:${String(state.turnSequence)}`),
        ),
      };
    },
    resolvePoolPick: (state, actorId) => {
      const choice = state.subChoice;

      if (choice?.kind !== 'pool-pick') {
        throw new Error('pool-pick pending mismatch');
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

      if (choice?.kind !== 'special-pick') {
        throw new Error('special-pick pending mismatch');
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

      if (choice?.kind !== 'reanimation-kit') {
        throw new Error('reanimation-kit pending mismatch');
      }

      return {
        kitId: policy.pickReanimationKitId(
          choice.eligibleKitIds,
          createRng(`${state.seed}:bot:${playerId}:reanim:${String(state.turnSequence)}`),
        ),
      };
    },
    resolveReward: (state) => {
      const choice = state.rewardChoice;

      if (choice === null) {
        return null;
      }

      const view = buildPlayingViewFor({
        recipientSessionId: choice.eliminatorPlayerId,
        gameCode,
        state,
        turnDeadlineMs: null,
        actionLog,
      });
      const available = listAvailableRewardCards(state, choice.eliminatedPlayerId);
      const picks = policy.pickEliminationRewards(
        view,
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

/**
 * Roll out with the base heuristic until `depthCapRounds` complete rounds from
 * `startTurnSequence`, or the game ends. Mutates `state`.
 */
export function rolloutHeuristic(
  state: GameState,
  policy: BotPolicy,
  actionLog: readonly ActionLogEntryView[],
  gameCode: string,
  depthCapRounds: number,
  startTurnSequence: number,
  livingAtRoot: number,
  rngSeed: string,
): void {
  const hooks = heuristicRolloutHooks(policy, actionLog, gameCode);
  const targetSequence = startTurnSequence + depthCapRounds * Math.max(1, livingAtRoot);
  let guard = 0;

  while (guard < 256) {
    guard += 1;

    if (findSoleSurvivorId(state) !== null) {
      return;
    }

    if (state.turnSequence >= targetSequence) {
      return;
    }

    // Drain search-style sub-choices with heuristic picks via applySearchDecision
    // so rollouts never use a silent fixed hook outside the policy.
    if (activeSubChoiceKind(state) !== null) {
      const owner = searchDecisionOwner(state);

      if (owner === null) {
        return;
      }

      const view = buildPlayingViewFor({
        recipientSessionId: owner,
        gameCode,
        state,
        turnDeadlineMs: null,
        actionLog,
      });
      const decisions = listSearchDecisions(state);

      if (decisions.length === 0) {
        return;
      }

      const pick = pickHeuristicSubChoice(policy, view, decisions, state, rngSeed);
      const applied = applySearchDecision(
        state,
        pick,
        createRng(`${rngSeed}:roll:sub:${String(guard)}`),
        SIM_NOW_MS,
      );

      if (!applied.ok) {
        return;
      }

      continue;
    }

    const actorId = state.currentTurnPlayerId;

    if (actorId === null) {
      return;
    }

    const view = buildPlayingViewFor({
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

    const decision = policy.decide(view, legal, createRng(`${rngSeed}:roll:${actorId}:${String(guard)}`), {
      actionLog,
    });
    const result = performAndCompleteTurn(state, actorId, decision.action, hooks, {
      nowMs: SIM_NOW_MS,
      rng: createRng(`${rngSeed}:roll-apply:${String(guard)}`),
    });

    if (!result.ok) {
      return;
    }
  }
}

function pickHeuristicSubChoice(
  policy: BotPolicy,
  view: PlayingStateView,
  decisions: readonly import('./search-types').SearchDecision[],
  state: GameState,
  rngSeed: string,
): import('./search-types').SearchDecision {
  const first = decisions[0];

  if (first === undefined) {
    throw new Error('pickHeuristicSubChoice: empty');
  }

  const kind = first.kind;
  const rng = createRng(`${rngSeed}:sub:${kind}`);

  if (kind === 'mirror') {
    const pick = policy.pickMirrorRedirect(
      view,
      rng,
      state.mirrorChoice?.eligibleEffectIds,
    );

    if (pick === null) {
      return first;
    }

    const match = decisions.find(
      (decision) =>
        decision.kind === 'mirror' &&
        decision.pendingEffectId === pick.pendingEffectId &&
        decision.newTargetPlayerId === pick.newTargetPlayerId,
    );
    return match ?? first;
  }

  if (kind === 'steal-pick') {
    const ids = decisions.flatMap((decision) =>
      decision.kind === 'steal-pick' ? [decision.instanceId] : [],
    );
    const instanceId = policy.pickStealInstanceId(view, ids, rng);
    return (
      decisions.find(
        (decision) => decision.kind === 'steal-pick' && decision.instanceId === instanceId,
      ) ?? first
    );
  }

  if (kind === 'special-pick') {
    const ids = decisions.flatMap((decision) =>
      decision.kind === 'special-pick' ? [decision.cardId] : [],
    );
    const cardId = policy.pickSpecialCardId(ids, rng);
    return (
      decisions.find(
        (decision) => decision.kind === 'special-pick' && decision.cardId === cardId,
      ) ?? first
    );
  }

  if (kind === 'reanimation-kit') {
    const ids = decisions.flatMap((decision) =>
      decision.kind === 'reanimation-kit' ? [decision.kitId] : [],
    );
    const kitId = policy.pickReanimationKitId(ids, rng);
    return (
      decisions.find(
        (decision) => decision.kind === 'reanimation-kit' && decision.kitId === kitId,
      ) ?? first
    );
  }

  if (kind === 'pool-pick') {
    const choice = state.subChoice;

    if (choice?.kind !== 'pool-pick') {
      return first;
    }

    const ids = policy.pickPoolInstanceIds(
      state.pool,
      choice.eligibleInstanceIds,
      choice.maxCount,
      rng,
    );
    const key = [...ids].sort().join(',');
    return (
      decisions.find(
        (decision) =>
          decision.kind === 'pool-pick' &&
          [...decision.instanceIds].sort().join(',') === key,
      ) ?? first
    );
  }

  if (kind === 'elimination-reward') {
    const choice = state.rewardChoice;

    if (choice === null) {
      return first;
    }

    const available = listAvailableRewardCards(state, choice.eliminatedPlayerId);
    const picks = policy.pickEliminationRewards(view, available, state.lifeLimit, rng);
    return {
      kind: 'elimination-reward',
      chooserPlayerId: choice.eliminatorPlayerId,
      eliminationId: choice.eliminationId,
      choices: picks.choices,
    };
  }

  return first;
}
