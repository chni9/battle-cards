/**
 * Simulator action-log copy of public Draw-bust — L63-03 / PR #45 Bugbot.
 */

import { toActionPlayedPayload, type ActionLogEntryView } from '@card-battle/shared';
import { describe, expect, it } from 'vitest';

import { createInitialState } from '../engine/create-initial-state';
import { performTurnAction } from '../engine/turn/perform-action';
import { scriptedRng } from '../testing/factories';
import { appendTurnResultLog } from './run-game';

describe('appendTurnResultLog public drawBust (L63-03)', () => {
  const seats = [
    { id: 'a', nickname: 'Alice' },
    { id: 'b', nickname: 'Bob' },
  ] as const;

  it('stores drawBust on the simulated action log when Draw busts', () => {
    const state = createInitialState({
      seats,
      seed: 'sim-log-draw-bust',
      kitAssignment: ['gambler', 'kamikaze'],
    });
    const actor = state.players.find((player) => player.kitId === 'gambler');
    expect(actor).toBeDefined();
    if (actor === undefined) {
      return;
    }

    state.currentTurnPlayerId = actor.id;
    actor.lives = 14;
    actor.points = 0;
    actor.pendingEffects = [];
    actor.activePersistentEffects = [];
    actor.hand = [];
    actor.specialCards = [];

    const result = performTurnAction(state, actor.id, { type: 'draw' }, scriptedRng([0]));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const log: ActionLogEntryView[] = [];
    appendTurnResultLog(log, result);
    const played = log.find((entry) => entry.kind === 'actionPlayed');
    expect(played).toEqual({
      kind: 'actionPlayed',
      actorPlayerId: actor.id,
      action: 'draw',
      turnSequence: result.actionPlayed.turnSequence,
      drawBust: true,
    });
    expect(toActionPlayedPayload(result.actionPlayed).drawBust).toBe(true);
  });

  it('omits drawBust on a safe Draw', () => {
    const state = createInitialState({
      seats,
      seed: 'sim-log-draw-safe',
      kitAssignment: ['gambler', 'kamikaze'],
    });
    const actor = state.players.find((player) => player.kitId === 'gambler');
    expect(actor).toBeDefined();
    if (actor === undefined) {
      return;
    }

    state.currentTurnPlayerId = actor.id;
    actor.lives = 14;
    actor.points = 0;
    actor.pendingEffects = [];
    actor.activePersistentEffects = [];
    actor.drawGain = 47;

    const result = performTurnAction(state, actor.id, { type: 'draw' }, scriptedRng([1]));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const log: ActionLogEntryView[] = [];
    appendTurnResultLog(log, result);
    const played = log.find((entry) => entry.kind === 'actionPlayed');
    expect(played?.kind).toBe('actionPlayed');
    if (played?.kind !== 'actionPlayed') {
      return;
    }

    expect(played.action).toBe('draw');
    expect(played.drawBust).toBeUndefined();
    expect(played.drawGain).toBe(47);
    expect(toActionPlayedPayload(result.actionPlayed).drawBust).toBeUndefined();
    expect(toActionPlayedPayload(result.actionPlayed).drawGain).toBe(47);
  });
});
