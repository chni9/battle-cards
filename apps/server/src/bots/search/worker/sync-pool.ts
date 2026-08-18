/**
 * Test double — resolves SearchRequest on the same thread (L32-08).
 */

import { getPolicy } from '../../registry';
import { createRng } from '../../../engine/rng';
import type { BotSearchPool } from './types';
import type { SearchRequest, SearchResponse } from './types';

/** Same-thread pool for Vitest and fallback harnesses (L32-08). */
export class SyncSearchPool implements BotSearchPool {
  readonly size = 1;
  private failNext = false;

  failNextRequest(): void {
    this.failNext = true;
  }

  request(request: SearchRequest): Promise<SearchResponse> {
    if (this.failNext) {
      this.failNext = false;
      return Promise.reject(new Error('simulated worker crash'));
    }

    const policy = getPolicy(request.policyId);
    const rng = createRng(
      `sync-pool:${request.policyId}:${String(request.view.turnSequence)}`,
    );
    const decision = policy.decide(request.view, request.legalActions, rng, {
      actionLog: request.actionLog,
      weightsProfile: request.weightsProfile,
      budget: request.budget,
    });

    return Promise.resolve({
      action: decision.action,
      reason: decision.reason,
      stats: {
        elapsedMs: 0,
        policyId: policy.id,
        ...(decision.searchDiagnostics !== undefined
          ? {
              iterations: decision.searchDiagnostics.iterations,
              actionScores: decision.searchDiagnostics.actionScores,
            }
          : {}),
      },
    });
  }

  killOneWorker(): void {
    this.failNext = true;
  }

  close(): Promise<void> {
    return Promise.resolve();
  }
}
