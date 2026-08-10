/**
 * Worker-thread pool for bot decisions — technical spec v5 §8.1 (L32-08).
 */

import { availableParallelism } from 'node:os';
import { Worker } from 'node:worker_threads';
import { fileURLToPath } from 'node:url';

import type { BotSearchPool, SearchRequest, SearchResponse, WorkerInbound, WorkerOutbound } from './types';
import { SyncSearchPool } from './sync-pool';

const WORKER_PATH = fileURLToPath(new URL('./search-worker.ts', import.meta.url));

export type { BotSearchPool } from './types';

export interface SearchPoolOptions {
  readonly size?: number;
  readonly requestTimeoutMs?: number;
  /** Test hook — custom Worker factory. */
  readonly createWorker?: () => Worker;
}

interface Pending {
  readonly resolve: (response: SearchResponse) => void;
  readonly reject: (error: Error) => void;
  readonly timer: ReturnType<typeof setTimeout>;
}

export class SearchWorkerPool implements BotSearchPool {
  private readonly workers: Worker[] = [];
  private readonly pending = new Map<number, Pending>();
  private nextId = 1;
  private rr = 0;
  private readonly requestTimeoutMs: number;
  private closed = false;

  constructor(options: SearchPoolOptions = {}) {
    const cores = availableParallelism();
    const configured = options.size ?? Math.max(1, Math.min(cores - 1, 4));
    this.requestTimeoutMs = options.requestTimeoutMs ?? 5_000;
    const factory =
      options.createWorker ??
      (() =>
        new Worker(WORKER_PATH, {
          execArgv: ['--import', 'tsx'],
        }));

    for (let index = 0; index < configured; index += 1) {
      const worker = factory();
      worker.on('message', (message: WorkerOutbound) => {
        this.onMessage(message);
      });
      worker.on('error', (error: Error) => {
        this.failAll(error);
      });
      worker.on('exit', (code) => {
        if (!this.closed && code !== 0) {
          this.failAll(new Error(`search worker exited with code ${String(code)}`));
        }
      });
      this.workers.push(worker);
    }
  }

  get size(): number {
    return this.workers.length;
  }

  async request(request: SearchRequest): Promise<SearchResponse> {
    if (this.closed || this.workers.length === 0) {
      throw new Error('search worker pool is closed');
    }

    const worker = this.workers[this.rr % this.workers.length];
    this.rr += 1;

    if (worker === undefined) {
      throw new Error('search worker pool has no workers');
    }

    const id = this.nextId;
    this.nextId += 1;

    return await new Promise<SearchResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`search worker timed out after ${String(this.requestTimeoutMs)}ms`));
      }, this.requestTimeoutMs);

      this.pending.set(id, { resolve, reject, timer });
      const inbound: WorkerInbound = { type: 'search', id, request };
      worker.postMessage(inbound);
    });
  }

  /** Test helper — terminate one worker to simulate a crash. */
  killOneWorker(): void {
    const worker = this.workers[0];

    if (worker !== undefined) {
      void worker.terminate();
    }
  }

  async close(): Promise<void> {
    this.closed = true;

    for (const [, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(new Error('search worker pool closed'));
    }

    this.pending.clear();
    await Promise.all(this.workers.map(async (worker) => worker.terminate()));
    this.workers.length = 0;
  }

  private onMessage(message: WorkerOutbound): void {
    if (message.type === 'pong') {
      return;
    }

    const pending = this.pending.get(message.id);

    if (pending === undefined) {
      return;
    }

    clearTimeout(pending.timer);
    this.pending.delete(message.id);

    if (message.type === 'result') {
      pending.resolve(message.response);
      return;
    }

    pending.reject(new Error(message.message));
  }

  private failAll(error: Error): void {
    for (const [id, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(error);
      this.pending.delete(id);
    }
  }
}

let sharedPool: BotSearchPool | null = null;

export function getSharedSearchPool(): BotSearchPool {
  if (sharedPool !== null) {
    return sharedPool;
  }

  // Vitest stays on the sync double so unit tests do not spawn worker threads.
  if (process.env['VITEST'] !== undefined) {
    sharedPool = new SyncSearchPool();
    return sharedPool;
  }

  sharedPool = new SearchWorkerPool();
  return sharedPool;
}

export async function closeSharedSearchPool(): Promise<void> {
  if (sharedPool !== null) {
    await sharedPool.close();
    sharedPool = null;
  }
}
