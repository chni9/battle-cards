/**
 * Worker-thread fitness evaluator — L33-03 (no GameState on the wire).
 * Weights + matchup descriptors only; GameState is created inside the worker.
 */

import { parentPort } from 'node:worker_threads';

import { parsePolicyWeights, type PolicyWeights } from '../bots/policy-weights';
import {
  evaluateFitnessAgainstGauntlet,
  type FitnessResult,
} from './fitness-gauntlet';
import type { FitMatchup } from './fit-split';

export interface FitnessJob {
  readonly type: 'fitness';
  readonly id: number;
  readonly weights: PolicyWeights;
  readonly matchups: readonly FitMatchup[];
  readonly maxTurns?: number;
  readonly difficulty?: 'easy' | 'normal' | 'hard';
}

export type FitnessWorkerInbound = FitnessJob | { readonly type: 'ping'; readonly id: number };

export type FitnessWorkerOutbound =
  | { readonly type: 'result'; readonly id: number; readonly result: FitnessResult }
  | { readonly type: 'pong'; readonly id: number }
  | { readonly type: 'error'; readonly id: number; readonly message: string };

if (parentPort === null) {
  throw new Error('fitness-worker must run as a worker thread');
}

const port = parentPort;

port.on('message', (message: FitnessWorkerInbound) => {
  try {
    if (message.type === 'ping') {
      port.postMessage({ type: 'pong', id: message.id } satisfies FitnessWorkerOutbound);
      return;
    }

    const weights = parsePolicyWeights(message.weights);
    const result = evaluateFitnessAgainstGauntlet(weights, message.matchups, {
      ...(message.maxTurns !== undefined ? { maxTurns: message.maxTurns } : {}),
      ...(message.difficulty !== undefined ? { difficulty: message.difficulty } : {}),
    });
    port.postMessage({
      type: 'result',
      id: message.id,
      result,
    } satisfies FitnessWorkerOutbound);
  } catch (error) {
    port.postMessage({
      type: 'error',
      id: message.id,
      message: error instanceof Error ? error.message : String(error),
    } satisfies FitnessWorkerOutbound);
  }
});
