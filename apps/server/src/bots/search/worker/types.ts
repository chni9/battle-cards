/**
 * Worker search payload types — technical spec v5 §8.1 (L32-08).
 * Structurally excludes `GameState` (fairness boundary).
 */

import type {
  ActionLogEntryView,
  BotDecisionReason,
  PlayingStateView,
} from '@card-battle/shared';

import type { TurnAction } from '../../../engine/turn/perform-action';

export type SearchBudget =
  | { readonly kind: 'wall-clock'; readonly ms: number }
  | { readonly kind: 'iterations'; readonly n: number };

/**
 * Only serializable view-side inputs. Do not add `GameState` or any server-only
 * authoritative fields — widening this type is how the no-cheating ruling dies.
 */
export interface SearchRequest {
  readonly view: PlayingStateView;
  readonly actionLog: readonly ActionLogEntryView[];
  readonly legalActions: readonly TurnAction[];
  readonly budget: SearchBudget;
  readonly policyId: string;
  /** Opaque until L33-01; null means default profile. */
  readonly weightsProfile: string | null;
}

/** Per-root action score for Normal-tier softmax (L36-03). Server-only. */
export interface SearchActionScore {
  readonly action: TurnAction;
  readonly score: number;
}

export interface SearchStats {
  readonly elapsedMs: number;
  readonly policyId: string;
  /** Iterations actually run (search-v5). */
  readonly iterations?: number;
  /**
   * Root visit counts — Normal softmax (L36-03). Never copy into
   * `BotDecisionReason.params` (#V5-4).
   */
  readonly actionScores?: readonly SearchActionScore[];
}

export interface SearchResponse {
  readonly action: TurnAction;
  readonly reason: BotDecisionReason;
  readonly stats: SearchStats;
}

export interface BotSearchPool {
  readonly size: number;
  request(request: SearchRequest): Promise<SearchResponse>;
  killOneWorker(): void;
  close(): Promise<void>;
}

export type WorkerInbound =
  | { readonly type: 'search'; readonly id: number; readonly request: SearchRequest }
  | { readonly type: 'ping'; readonly id: number };

export type WorkerOutbound =
  | { readonly type: 'result'; readonly id: number; readonly response: SearchResponse }
  | { readonly type: 'error'; readonly id: number; readonly message: string }
  | { readonly type: 'pong'; readonly id: number };
