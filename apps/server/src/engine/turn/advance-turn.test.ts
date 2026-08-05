/**
 * Consecutive-turn grant (Block) — technical spec v4 §4.5 (L20-16).
 */

import { ACTION_CARD_IDS } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { buildPlayingViewFor } from '../../protocol/build-view-for';
import { makePlayer } from '../../testing/factories';
import { createInitialState } from '../create-initial-state';
import { createRng } from '../rng';
import { advanceTurn } from './advance-turn';
import { grantBlockTurns } from './grant-block-turns';

const SEED = 'l20-16-block-turns';

function turnRngDraw(seed: string, turnSequence: number): string {
  return createRng(`${seed}:turn:${String(turnSequence)}`).pick(ACTION_CARD_IDS);
}

function buildTurnStartedPayload(
  state: ReturnType<typeof createInitialState>,
  activePlayerId: string,
): { blockTurnsRemaining: number } {
  const activePlayer = state.players.find((player) => player.id === activePlayerId);

  return {
    blockTurnsRemaining: activePlayer?.blockTurnsRemaining ?? 0,
  };
}

describe('grantBlockTurns (L20-16)', () => {
  it('rejects a negative count', () => {
    const player = makePlayer();

    expect(() => {
      grantBlockTurns(player, -1);
    }).toThrow(RangeError);
  });
});

describe('advanceTurn block chain (L20-16)', () => {
  it('grants 3 consecutive turns with distinct turnSequence values and RNG streams', () => {
    const state = createInitialState({
      seed: SEED,
      seats: [
        { id: 'alice', nickname: 'Alice' },
        { id: 'bob', nickname: 'Bob' },
      ],
    });

    const alice = state.players.find((player) => player.id === 'alice');

    if (alice === undefined) {
      throw new Error('missing alice');
    }

    state.currentTurnPlayerId = alice.id;
    state.turnSequence = 0;
    grantBlockTurns(alice, 3);

    const turnSequences: number[] = [state.turnSequence];
    const rngDraws: string[] = [turnRngDraw(SEED, state.turnSequence)];

    for (let step = 0; step < 3; step += 1) {
      advanceTurn(state);
      turnSequences.push(state.turnSequence);
      rngDraws.push(turnRngDraw(SEED, state.turnSequence));
    }

    expect(state.currentTurnPlayerId).toBe('alice');
    expect(turnSequences).toEqual([0, 1, 2, 3]);
    expect(new Set(turnSequences).size).toBe(4);
    expect(new Set(rngDraws.slice(0, 4)).size).toBe(4);

    expect(alice.blockTurnsRemaining).toBe(0);

    advanceTurn(state);
    expect(state.currentTurnPlayerId).toBe('bob');
    expect(state.turnSequence).toBe(4);
    expect(alice.blockAttacksForbidden).toBe(false);
  });

  it('exposes remaining count in the view and TurnStarted payload after each advance', () => {
    const state = createInitialState({
      seed: SEED,
      seats: [
        { id: 'alice', nickname: 'Alice' },
        { id: 'bob', nickname: 'Bob' },
      ],
    });

    const alice = state.players.find((player) => player.id === 'alice');

    if (alice === undefined) {
      throw new Error('missing alice');
    }

    state.currentTurnPlayerId = alice.id;
    grantBlockTurns(alice, 3);

    const expectedRemainingAfterAdvance = [2, 1, 0] as const;

    for (const expectedRemaining of expectedRemainingAfterAdvance) {
      advanceTurn(state);

      const view = buildPlayingViewFor({
        recipientSessionId: 'bob',
        gameCode: 'TEST01',
        state,
        turnDeadlineMs: null,
        actionLog: [],
      });

      const aliceView = view.players.find((player) => player.id === 'alice');
      expect(aliceView?.blockTurnsRemaining).toBe(expectedRemaining);

      const payload = buildTurnStartedPayload(state, alice.id);
      expect(payload.blockTurnsRemaining).toBe(expectedRemaining);
    }
  });

  it('resets the ledger on each granted turn', () => {
    const state = createInitialState({
      seed: SEED,
      seats: [
        { id: 'alice', nickname: 'Alice' },
        { id: 'bob', nickname: 'Bob' },
      ],
    });

    const alice = state.players.find((player) => player.id === 'alice');

    if (alice === undefined) {
      throw new Error('missing alice');
    }

    state.currentTurnPlayerId = alice.id;
    grantBlockTurns(alice, 2);
    alice.turnLedger.livesLost = 5;

    advanceTurn(state);

    expect(alice.turnLedger.livesLost).toBe(0);
    expect(alice.blockTurnsRemaining).toBe(1);
  });
});
