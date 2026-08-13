/**
 * Search worker entry — technical spec v5 §8.1 (L32-08).
 * Resolves a registered policy; never receives `GameState`.
 */

import { parentPort } from 'node:worker_threads';

import { createRng } from '../../../engine/rng';
import { getPolicy } from '../../registry';
import type { WorkerInbound, WorkerOutbound } from './types';

if (parentPort === null) {
  throw new Error('search-worker must run as a worker_thread');
}

const port = parentPort;

port.on('message', (message: WorkerInbound) => {
  if (message.type === 'ping') {
    const outbound: WorkerOutbound = { type: 'pong', id: message.id };
    port.postMessage(outbound);
    return;
  }

  const started = Date.now();

  try {
    const policy = getPolicy(message.request.policyId);
    const rng = createRng(
      `worker:${message.request.policyId}:${String(message.request.view.turnSequence)}:${String(message.id)}`,
    );
    const decision = policy.decide(
      message.request.view,
      message.request.legalActions,
      rng,
      {
        actionLog: message.request.actionLog,
        weightsProfile: message.request.weightsProfile,
        budget: message.request.budget,
      },
    );

    const outbound: WorkerOutbound = {
      type: 'result',
      id: message.id,
      response: {
        action: decision.action,
        reason: decision.reason,
        stats: {
          elapsedMs: Date.now() - started,
          policyId: policy.id,
        },
      },
    };
    port.postMessage(outbound);
  } catch (error) {
    const outbound: WorkerOutbound = {
      type: 'error',
      id: message.id,
      message: error instanceof Error ? error.message : 'worker search failed',
    };
    port.postMessage(outbound);
  }
});
