/**
 * Post-elimination Absorber window — designer 2026-08-07.
 */

import { describe, expect, it } from 'vitest';

import { createInitialState } from '../create-initial-state';
import {
  clearAbsorbWindow,
  isAbsorberTargetable,
  isAbsorbWindowOpen,
  onPlayerEliminatedForAbsorbWindow,
  tickAbsorbWindowsOnBeginTurn,
} from './absorb-window';

describe('absorb window', () => {
  it('opens with every other living seat and closes after each has begun a turn', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
        { id: 'c', nickname: 'C' },
        { id: 'd', nickname: 'D' },
      ],
      seed: 'absorb-window-cycle',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');
    const c = state.players.find((player) => player.id === 'c');
    const d = state.players.find((player) => player.id === 'd');

    if (a === undefined || b === undefined || c === undefined || d === undefined) {
      return;
    }

    d.isEliminated = true;
    d.turnLedger.livesLost = 4;
    onPlayerEliminatedForAbsorbWindow(state, d);

    expect(d.absorbWindowPendingPlayerIds).toEqual(['a', 'b', 'c']);
    expect(isAbsorbWindowOpen(d)).toBe(true);
    expect(isAbsorberTargetable(d)).toBe(true);

    tickAbsorbWindowsOnBeginTurn(state, 'a');
    expect(d.absorbWindowPendingPlayerIds).toEqual(['b', 'c']);
    tickAbsorbWindowsOnBeginTurn(state, 'b');
    expect(d.absorbWindowPendingPlayerIds).toEqual(['c']);
    tickAbsorbWindowsOnBeginTurn(state, 'c');
    expect(d.absorbWindowPendingPlayerIds).toBeNull();
    expect(isAbsorberTargetable(d)).toBe(false);
    expect(d.turnLedger.livesLost).toBe(0);
  });

  it('prunes mid-window death so pending cannot stick forever', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
        { id: 'c', nickname: 'C' },
      ],
      seed: 'absorb-window-prune',
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');
    const c = state.players.find((player) => player.id === 'c');

    if (a === undefined || b === undefined || c === undefined) {
      return;
    }

    c.isEliminated = true;
    onPlayerEliminatedForAbsorbWindow(state, c);
    expect(c.absorbWindowPendingPlayerIds).toEqual(['a', 'b']);

    b.isEliminated = true;
    onPlayerEliminatedForAbsorbWindow(state, b);
    expect(c.absorbWindowPendingPlayerIds).toEqual(['a']);
    expect(b.absorbWindowPendingPlayerIds).toEqual(['a']);

    tickAbsorbWindowsOnBeginTurn(state, 'a');
    expect(c.absorbWindowPendingPlayerIds).toBeNull();
    expect(b.absorbWindowPendingPlayerIds).toBeNull();
  });

  it('clearAbsorbWindow drops the pending set without resetting ledger', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'absorb-window-clear',
    });
    const b = state.players.find((player) => player.id === 'b');

    if (b === undefined) {
      return;
    }

    b.isEliminated = true;
    b.turnLedger.livesLost = 2;
    onPlayerEliminatedForAbsorbWindow(state, b);
    clearAbsorbWindow(b);
    expect(b.absorbWindowPendingPlayerIds).toBeNull();
    expect(b.turnLedger.livesLost).toBe(2);
  });
});
