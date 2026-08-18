/**
 * Parallel fitness pool for (1+λ)-ES — L33-03.
 * Reuses L32-08 worker-thread sizing; payloads never include GameState.
 */

import { availableParallelism } from 'node:os';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';

import type { PolicyWeights } from '../bots/policy-weights';
import type { FitnessResult } from './fitness-gauntlet';
import type { FitMatchup } from './fit-split';
import type { FitnessWorkerInbound, FitnessWorkerOutbound } from './fitness-worker';

const WORKER_PATH = fileURLToPath(new URL('./fitness-worker.ts', import.meta.url));

interface Pending {
  readonly resolve: (result: FitnessResult) => void;
  readonly reject: (error: Error) => void;
}

export class FitnessWorkerPool {
  private readonly workers: Worker[] = [];
  private readonly pending = new Map<number, Pending>();
  private nextId = 1;
  private closed = false;

  constructor(size?: number) {
    const cores = availableParallelism();
    const configured = size ?? Math.max(1, Math.min(cores, 8));
    for (let index = 0; index < configured; index += 1) {
      const worker = new Worker(WORKER_PATH, {
        execArgv: ['--import', 'tsx'],
      });
      worker.on('message', (message: FitnessWorkerOutbound) => {
        this.onMessage(message);
      });
      worker.on('error', (error: Error) => {
        this.failAll(error);
      });
      this.workers.push(worker);
    }
  }

  get size(): number {
    return this.workers.length;
  }

  async evaluate(
    weights: PolicyWeights,
    matchups: readonly FitMatchup[],
    options: { readonly maxTurns?: number; readonly difficulty?: 'easy' | 'normal' | 'hard' } = {},
  ): Promise<FitnessResult> {
    if (this.closed || this.workers.length === 0) {
      throw new Error('fitness worker pool is closed');
    }

    if (matchups.length === 0) {
      return { wins: 0, losses: 0, stalls: 0, games: 0, winRate: 0 };
    }

    const chunkCount = Math.min(this.workers.length, matchups.length);
    const chunkSize = Math.ceil(matchups.length / chunkCount);
    const chunks: FitMatchup[][] = [];
    for (let index = 0; index < matchups.length; index += chunkSize) {
      chunks.push([...matchups.slice(index, index + chunkSize)]);
    }

    const partials = await Promise.all(
      chunks.map(async (chunk, chunkIndex) => {
        const worker = this.workers[chunkIndex % this.workers.length];
        if (worker === undefined) {
          throw new Error('fitness worker pool has no workers');
        }

        const id = this.nextId;
        this.nextId += 1;

        return new Promise<FitnessResult>((resolve, reject) => {
          this.pending.set(id, { resolve, reject });
          const message: FitnessWorkerInbound = {
            type: 'fitness',
            id,
            weights,
            matchups: chunk,
            ...(options.maxTurns !== undefined ? { maxTurns: options.maxTurns } : {}),
            ...(options.difficulty !== undefined ? { difficulty: options.difficulty } : {}),
          };
          worker.postMessage(message);
        });
      }),
    );

    let wins = 0;
    let losses = 0;
    let stalls = 0;
    let games = 0;
    for (const partial of partials) {
      wins += partial.wins;
      losses += partial.losses;
      stalls += partial.stalls;
      games += partial.games;
    }

    const decided = wins + losses;
    return {
      wins,
      losses,
      stalls,
      games,
      winRate: decided === 0 ? 0 : wins / decided,
    };
  }

  async close(): Promise<void> {
    this.closed = true;
    await Promise.all(this.workers.map(async (worker) => worker.terminate()));
    this.workers.length = 0;
  }

  private onMessage(message: FitnessWorkerOutbound): void {
    if (message.type === 'pong') {
      return;
    }

    const pending = this.pending.get(message.id);
    if (pending === undefined) {
      return;
    }

    this.pending.delete(message.id);

    if (message.type === 'error') {
      pending.reject(new Error(message.message));
      return;
    }

    pending.resolve(message.result);
  }

  private failAll(error: Error): void {
    for (const pending of this.pending.values()) {
      pending.reject(error);
    }
    this.pending.clear();
  }
}
