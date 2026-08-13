/**
 * Room decision-latency bench — technical spec v5 §8.2 (L36-05).
 *
 * Concurrent search-v5 wall-clock decisions (simulates multi-room load).
 * Run: `pnpm --filter @card-battle/server bench:room-latency`
 */

import { performance } from 'node:perf_hooks';

import { createInitialState } from '../../engine/create-initial-state';
import { createRng } from '../../engine/rng';
import { listLegalActions } from '../../engine/turn/list-legal-actions';
import { buildPlayingViewFor } from '../../protocol/build-view-for';
import { readBotThinkMs } from '../bot-think-ms';
import { roomSearchBudgetMs } from '../bot-driver';
import { searchV5Policy } from '../policies/search-v5';

function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) {
    return 0;
  }

  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index] ?? 0;
}

function fixtureView() {
  const state = createInitialState({
    seats: [
      { id: 'a', nickname: 'A' },
      { id: 'b', nickname: 'B' },
      { id: 'c', nickname: 'C' },
      { id: 'd', nickname: 'D' },
    ],
    seed: 'l36-05-latency',
    kitAssignment: ['assassin', 'kamikaze', 'untouchable', 'prophet'],
  });
  state.currentTurnPlayerId = 'a';
  const alice = state.players.find((player) => player.id === 'a');

  if (alice !== undefined) {
    alice.points = 20;
    alice.hand = [
      { instanceId: 'atk', cardId: 'super-attack', isUpgraded: false },
      { instanceId: 'tax', cardId: 'tax', isUpgraded: false },
    ];
  }

  const view = buildPlayingViewFor({
    recipientSessionId: 'a',
    gameCode: 'LAT',
    state,
    turnDeadlineMs: null,
    actionLog: [],
  });
  const legal = listLegalActions(state, 'a');
  return { view, legal };
}

function measureTier(): void {
  const thinkMs = readBotThinkMs();
  const { view, legal } = fixtureView();
  const concurrentRooms = 4;
  const decisionsPerRoom = 8;

  console.log(`thinkMs=${String(thinkMs)} concurrentRooms=${String(concurrentRooms)}`);

  for (const difficulty of ['normal', 'hard'] as const) {
    const budgetMs = roomSearchBudgetMs(thinkMs, difficulty);
    const samples: number[] = [];

    const runOne = (index: number): void => {
      const started = performance.now();
      searchV5Policy.decide(view, legal, createRng(`l36-05-${difficulty}-${String(index)}`), {
        actionLog: [],
        budget: { kind: 'wall-clock', ms: budgetMs },
      });
      samples.push(performance.now() - started);
    };

    for (let room = 0; room < concurrentRooms; room += 1) {
      for (let decision = 0; decision < decisionsPerRoom; decision += 1) {
        runOne(room * decisionsPerRoom + decision);
      }
    }
    samples.sort((left, right) => left - right);

    const p50 = percentile(samples, 50);
    const p95 = percentile(samples, 95);
    const p99 = percentile(samples, 99);

    console.log(
      JSON.stringify({
        difficulty,
        budgetMs,
        n: samples.length,
        p50Ms: Number(p50.toFixed(1)),
        p95Ms: Number(p95.toFixed(1)),
        p99Ms: Number(p99.toFixed(1)),
        maxMs: Number((samples[samples.length - 1] ?? 0).toFixed(1)),
        insideEnvelope: p99 <= thinkMs,
      }),
    );
  }
}

measureTier();
