/**
 * Worker-thread policy-vs-gauntlet evaluator — L35-07.
 * Resolves the candidate by registry id inside the worker (no GameState on the wire).
 */

import { parentPort } from 'node:worker_threads';

import { getPolicy } from '../bots/registry';
import {
  evaluatePolicyAgainstGauntlet,
  type FitnessResult,
} from './fitness-gauntlet';
import type { FitMatchup } from './fit-split';

export interface PolicyGateJob {
  readonly type: 'policy-gate';
  readonly id: number;
  readonly policyId: string;
  readonly matchups: readonly FitMatchup[];
  readonly maxTurns?: number;
  readonly difficulty?: 'easy' | 'normal' | 'hard';
}

export type PolicyGateInbound = PolicyGateJob | { readonly type: 'ping'; readonly id: number };

export type PolicyGateOutbound =
  | { readonly type: 'result'; readonly id: number; readonly result: FitnessResult }
  | { readonly type: 'pong'; readonly id: number }
  | { readonly type: 'error'; readonly id: number; readonly message: string };

if (parentPort === null) {
  throw new Error('policy-gate-worker must run as a worker thread');
}

const port = parentPort;

port.on('message', (message: PolicyGateInbound) => {
  try {
    if (message.type === 'ping') {
      port.postMessage({ type: 'pong', id: message.id } satisfies PolicyGateOutbound);
      return;
    }

    const candidate = getPolicy(message.policyId);
    const result = evaluatePolicyAgainstGauntlet(candidate, message.matchups, {
      ...(message.maxTurns !== undefined ? { maxTurns: message.maxTurns } : {}),
      ...(message.difficulty !== undefined ? { difficulty: message.difficulty } : {}),
    });
    port.postMessage({
      type: 'result',
      id: message.id,
      result,
    } satisfies PolicyGateOutbound);
  } catch (error) {
    port.postMessage({
      type: 'error',
      id: message.id,
      message: error instanceof Error ? error.message : String(error),
    } satisfies PolicyGateOutbound);
  }
});
