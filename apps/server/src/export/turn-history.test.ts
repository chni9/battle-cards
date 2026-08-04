/**
 * Turn-history snapshot helpers — Lot 19 Excel export.
 */

import { describe, expect, it } from 'vitest';

import { createInitialState } from '../engine/create-initial-state';
import { performTurnAction } from '../engine/turn/perform-action';
import { queueEffect } from '../engine/turn/queue-effect';
import { buildExportTurnRow, snapshotPlayersForExport } from './turn-history';

describe('turn-history export snapshots (L19-03)', () => {
  it('captures before/after lives when damage resolves', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'Alice' },
        { id: 'b', nickname: 'Bob' },
      ],
      seed: 'export-snap',
    });
    const bob = state.players.find((player) => player.id === 'b');

    if (bob === undefined) {
      throw new Error('missing bob');
    }

    bob.lives = 10;
    queueEffect({
      state,
      sourcePlayerId: 'a',
      targetPlayerId: 'b',
      cardId: 'basic-attack',
      isUpgraded: false,
    });

    const before = snapshotPlayersForExport(state);
    state.currentTurnPlayerId = 'b';
    const result = performTurnAction(state, 'b', { type: 'draw' });
    expect(result.ok).toBe(true);
    const after = snapshotPlayersForExport(state);

    const bobBefore = before.find((row) => row.playerId === 'b');
    const bobAfter = after.find((row) => row.playerId === 'b');
    expect(bobBefore?.lives).toBe(10);
    expect(bobAfter?.lives).toBe(9);
    expect(bobBefore?.pendingAttacks).toHaveLength(1);
    expect(bobAfter?.pendingAttacks).toHaveLength(0);

    const row = buildExportTurnRow({
      turnSequence: 1,
      actorPlayerId: 'b',
      action: 'draw',
      before,
      after,
    });
    expect(row.before[1]?.lives).toBe(10);
    expect(row.after[1]?.lives).toBe(9);
  });
});
