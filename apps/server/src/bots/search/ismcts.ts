/**
 * ISMCTS with per-iteration re-determinization — technical spec v5 §6.1 (#V5-1).
 */

import type { ActionLogEntryView, PlayingStateView } from '@card-battle/shared';

import { createRng, type Rng } from '../../engine/rng';
import { findSoleSurvivorId } from '../../engine/turn/elimination-rewards';
import type { TurnAction } from '../../engine/turn/perform-action';
import { buildPlayingViewFor } from '../../protocol/build-view-for';
import { inferBelief, sampleDeterminizedState } from '../belief/determinize';
import type { BotPolicy } from '../policy-types';
import type { PolicyWeights } from '../policy-weights';
import { applySearchDecision } from './apply-search-decision';
import { cloneGameState } from './clone-state';
import { infoSetKey, searchDecisionKey } from './info-set-key';
import { listSearchDecisions, searchDecisionOwner } from './list-search-decisions';
import {
  backupValueVector,
  livingSeatIds,
  ownerIndex,
} from './max-n-values';
import { buildDecisionPriors, widenedPriorSlice } from './priors';
import { selectChild } from './puct';
import {
  assertDepthCapRounds,
  resolveSearchLoop,
} from './search-budget';
import {
  evaluateWithBelief,
  rolloutHeuristic,
  SIM_NOW_MS,
} from './search-rollout';
import type { SearchEdge, SearchNode } from './search-types';
import type { SearchActionScore, SearchBudget } from './worker/types';

export interface IsmctsResult {
  readonly action: TurnAction;
  readonly iterations: number;
  readonly actionScores: readonly SearchActionScore[];
}

export interface RunIsmctsArgs {
  readonly view: PlayingStateView;
  readonly actionLog: readonly ActionLogEntryView[];
  readonly legalActions: readonly TurnAction[];
  readonly rng: Rng;
  readonly weights: PolicyWeights;
  readonly budget: SearchBudget | undefined;
  readonly rolloutPolicy: BotPolicy;
  readonly botId: string;
  readonly uniformPrior?: boolean;
}

function collectRootActionScores(root: SearchNode): SearchActionScore[] {
  const scores: SearchActionScore[] = [];

  for (const edge of root.children.values()) {
    if (edge.decision.kind === 'action') {
      scores.push({ action: edge.decision.action, score: edge.visits });
    }
  }

  return scores;
}

export function runIsmcts(args: RunIsmctsArgs): IsmctsResult {
  const startedMs = Date.now();
  const loop = resolveSearchLoop(args.budget, startedMs);
  const depthCapRounds = assertDepthCapRounds(args.weights.search.depthCapRounds);
  const exploration = args.weights.search.explorationConstant;
  const belief = inferBelief(args.view, args.actionLog);
  const nodes = new Map<string, SearchNode>();
  const rootOwner = args.view.you;

  const rootDecisions = args.legalActions.map((action) => ({
    kind: 'action' as const,
    action,
  }));

  if (rootDecisions.length === 0) {
    throw new Error('runIsmcts: empty legal action set');
  }

  if (rootDecisions.length === 1) {
    const only = rootDecisions[0];

    if (only === undefined) {
      throw new Error('runIsmcts: missing sole action');
    }

    return {
      action: only.action,
      iterations: 0,
      actionScores: [{ action: only.action, score: 1 }],
    };
  }

  const rootPriors = buildDecisionPriors(
    rootDecisions,
    args.view,
    args.rng,
    args.weights,
    { uniform: args.uniformPrior === true },
  );
  const rootKey = infoSetKey(
    rootOwner,
    'action',
    rootPriors.map((entry) => entry.decisionKey),
  );

  const ensureNode = (
    key: string,
    ownerPlayerId: string,
    decisionKind: SearchNode['decisionKind'],
    livingCount: number,
  ): SearchNode => {
    let node = nodes.get(key);

    if (node === undefined) {
      node = {
        infoSetKey: key,
        ownerPlayerId,
        decisionKind,
        visits: 0,
        valueSums: new Float64Array(livingCount),
        children: new Map(),
      };
      nodes.set(key, node);
    } else if (node.valueSums.length !== livingCount) {
      node.valueSums = new Float64Array(livingCount);
    }

    return node;
  };

  ensureNode(rootKey, rootOwner, 'action', 4);

  let iterationsRun = 0;
  const maxIterations =
    loop.mode === 'iterations' ? loop.n : loop.safetyMaxIterations;

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    if (loop.mode === 'wall-clock' && Date.now() >= loop.deadlineMs) {
      break;
    }

    iterationsRun += 1;
    const iterRng = createRng(
      `${args.view.gameCode}:bot:${args.botId}:${String(args.view.turnSequence)}:search:${String(iteration)}`,
    );
    const state = cloneGameState(
      sampleDeterminizedState(belief, args.view, args.actionLog, iterRng),
    );
    const living = livingSeatIds(state.players);
    const startSequence = state.turnSequence;
    const pathNodes: SearchNode[] = [];
    const pathEdges: SearchEdge[] = [];

    let node = ensureNode(rootKey, rootOwner, 'action', living.length);
    pathNodes.push(node);

    // Selection + one expansion
    for (let depth = 0; depth < 64; depth += 1) {
      if (findSoleSurvivorId(state) !== null) {
        break;
      }

      const roundsElapsed =
        (state.turnSequence - startSequence) / Math.max(1, living.length);

      if (roundsElapsed >= depthCapRounds) {
        break;
      }

      const owner = searchDecisionOwner(state);

      if (owner === null) {
        break;
      }

      const ownerView = buildPlayingViewFor({
        recipientSessionId: owner,
        gameCode: args.view.gameCode,
        state,
        turnDeadlineMs: null,
        actionLog: args.actionLog,
      });
      const decisions = listSearchDecisions(state);

      if (decisions.length === 0) {
        break;
      }

      const decisionKind = decisions[0]?.kind ?? 'action';
      const useRootPriors =
        depth === 0 && owner === rootOwner && decisionKind === 'action';
      const priors = useRootPriors
        ? rootPriors
        : buildDecisionPriors(decisions, ownerView, iterRng, args.weights, {
            uniform: args.uniformPrior === true,
          });
      const key = useRootPriors
        ? rootKey
        : infoSetKey(
            owner,
            decisionKind,
            priors.map((entry) => entry.decisionKey),
          );

      node = ensureNode(key, owner, decisionKind, living.length);

      if (pathNodes[pathNodes.length - 1] !== node) {
        pathNodes.push(node);
      }

      const slice = widenedPriorSlice(priors, Math.max(1, node.visits));

      for (const entry of slice) {
        if (!node.children.has(entry.decisionKey)) {
          node.children.set(entry.decisionKey, {
            decisionKey: entry.decisionKey,
            decision: entry.decision,
            prior: entry.prior,
            visits: 0,
            child: null,
          });
          break;
        }
      }

      if (node.children.size === 0) {
        break;
      }

      const edge = selectChild(node, ownerIndex(living, owner), exploration);
      pathEdges.push(edge);

      const isNew = edge.child === null;

      if (isNew) {
        const child = ensureNode(
          `${key}>${edge.decisionKey}`,
          owner,
          edge.decision.kind,
          living.length,
        );
        edge.child = child;
      }

      const applied = applySearchDecision(state, edge.decision, iterRng, SIM_NOW_MS);

      if (!applied.ok) {
        break;
      }

      if (edge.child !== null) {
        pathNodes.push(edge.child);
      }

      if (isNew) {
        break;
      }
    }

    rolloutHeuristic(
      state,
      args.rolloutPolicy,
      args.actionLog,
      args.view.gameCode,
      depthCapRounds,
      startSequence,
      living.length,
      `${args.view.gameCode}:bot:${args.botId}:${String(args.view.turnSequence)}:roll:${String(iteration)}`,
    );

    const values = evaluateWithBelief(state, rootOwner, belief.summary, args.weights);

    for (const pathNode of pathNodes) {
      if (pathNode.valueSums.length !== values.length) {
        pathNode.valueSums = new Float64Array(values.length);
      }

      backupValueVector(pathNode.valueSums, values);
      pathNode.visits += 1;
    }

    for (const edge of pathEdges) {
      edge.visits += 1;
    }
  }

  const root = nodes.get(rootKey);

  if (root === undefined || root.children.size === 0) {
    const fallback = rootPriors[0]?.decision;

    if (fallback?.kind !== 'action') {
      throw new Error('runIsmcts: no root children');
    }

    return {
      action: fallback.action,
      iterations: iterationsRun,
      actionScores: [{ action: fallback.action, score: 1 }],
    };
  }

  let best: SearchEdge | null = null;

  for (const edge of root.children.values()) {
    if (best === null || edge.visits > best.visits) {
      best = edge;
      continue;
    }

    if (edge.visits === best.visits) {
      if (searchDecisionKey(edge.decision).localeCompare(searchDecisionKey(best.decision)) < 0) {
        best = edge;
      }
    }
  }

  if (best?.decision.kind !== 'action') {
    throw new Error('runIsmcts: best root edge is not an action');
  }

  return {
    action: best.decision.action,
    iterations: iterationsRun,
    actionScores: collectRootActionScores(root),
  };
}
