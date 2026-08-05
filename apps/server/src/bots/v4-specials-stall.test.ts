/**
 * Stall guard for the L29-08 turn-flow specials (technical spec v3 §10.4) — a bot must
 * be able to play Block, Invisibility, Card Absorber, Card Transformer and Reanimation,
 * including the upgraded sub-choices they can raise (pool-pick, special-pick,
 * reanimation-kit), without throwing or freezing the room.
 */

import { describe, expect, it } from 'vitest';

import { createInitialState } from '../engine/create-initial-state';
import { createRng } from '../engine/rng';
import { applyDefaultEliminationRewards } from '../engine/turn/elimination-rewards';
import { performAndCompleteTurn, type TurnSubChoiceHooks } from '../engine/turn/orchestrate-turn';
import { completeReanimationKitPick, performTurnAction } from '../engine/turn/perform-action';
import { buildPlayingViewFor } from '../protocol/build-view-for';
import { decide } from './heuristic-policy';
import {
  pickPoolInstanceIds,
  pickReanimationKitId,
  pickSpecialCardId,
  pickStealInstanceId,
} from './sub-choice-picks';

const NOW_MS = 0;

function noThrowHooks(seed: string): TurnSubChoiceHooks {
  return {
    resolveMirror: () => {
      throw new Error('unexpected Mirror choice');
    },
    resolveSteal: (state, actorId) => {
      const choice = state.stealChoice;

      if (choice?.playerId !== actorId || choice.eligibleInstanceIds.length === 0) {
        return null;
      }

      const view = buildPlayingViewFor({
        recipientSessionId: actorId,
        gameCode: 'TEST',
        state,
        turnDeadlineMs: null,
        actionLog: [],
      });

      return {
        instanceId: pickStealInstanceId(
          view,
          choice.eligibleInstanceIds,
          createRng(`${seed}:steal`),
        ),
      };
    },
    resolvePoolPick: (state, actorId) => {
      const choice = state.subChoice;

      if (choice?.kind !== 'pool-pick' || choice.playerId !== actorId) {
        return null;
      }

      return {
        instanceIds: pickPoolInstanceIds(
          state.pool,
          choice.eligibleInstanceIds,
          choice.maxCount,
          createRng(`${seed}:pool`),
        ),
      };
    },
    resolveSpecialPick: (state, actorId) => {
      const choice = state.subChoice;

      if (choice?.kind !== 'special-pick' || choice.playerId !== actorId) {
        return null;
      }

      return { cardId: pickSpecialCardId(choice.eligibleCardIds, createRng(`${seed}:special`)) };
    },
    resolveReanimationKit: (state, playerId) => {
      const choice = state.subChoice;

      if (choice?.kind !== 'reanimation-kit' || choice.playerId !== playerId) {
        return null;
      }

      return { kitId: pickReanimationKitId(choice.eligibleKitIds, createRng(`${seed}:reanim`)) };
    },
    resolveReward: () => null,
  };
}

describe('L29-08: turn-flow specials never stall the room', () => {
  it('bot plays Block without throwing', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l29-08-block',
      kitAssignment: ['assassin', 'kamikaze'],
    });
    const a = state.players.find((player) => player.id === 'a');

    if (a === undefined) {
      throw new Error('missing a');
    }

    a.points = 20;
    a.specialCards = [{ instanceId: 'blk-1', cardId: 'block', isUpgraded: false }];
    state.currentTurnPlayerId = a.id;

    const view = buildPlayingViewFor({
      recipientSessionId: a.id,
      gameCode: 'TEST',
      state,
      turnDeadlineMs: null,
      actionLog: [],
    });
    const decision = decide(view, [{ type: 'playCard', instanceId: 'blk-1' }], createRng('block-decide'));
    const result = performAndCompleteTurn(state, a.id, decision, noThrowHooks('block'), {
      nowMs: NOW_MS,
    });
    expect(result.ok).toBe(true);
  });

  it('bot plays Invisibility without throwing', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l29-08-invis',
      kitAssignment: ['assassin', 'kamikaze'],
    });
    const a = state.players.find((player) => player.id === 'a');

    if (a === undefined) {
      throw new Error('missing a');
    }

    a.points = 20;
    a.specialCards = [{ instanceId: 'inv-1', cardId: 'invisibility', isUpgraded: false }];
    state.currentTurnPlayerId = a.id;

    const result = performAndCompleteTurn(
      state,
      a.id,
      { type: 'playCard', instanceId: 'inv-1' },
      noThrowHooks('invis'),
      { nowMs: NOW_MS },
    );
    expect(result.ok).toBe(true);
  });

  it('bot plays upgraded Card Absorber and resolves the pool-pick sub-choice without throwing', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l29-08-absorber',
      kitAssignment: ['assassin', 'kamikaze'],
    });
    const a = state.players.find((player) => player.id === 'a');

    if (a === undefined) {
      throw new Error('missing a');
    }

    a.points = 20;
    a.specialCards = [{ instanceId: 'cab-1', cardId: 'card-absorber', isUpgraded: true }];
    state.pool = [
      { instanceId: 'pool-1', cardId: 'basic-attack', isUpgraded: false },
      { instanceId: 'pool-2', cardId: 'shield', isUpgraded: false },
      { instanceId: 'pool-3', cardId: 'poison', isUpgraded: false },
    ];
    state.currentTurnPlayerId = a.id;

    const result = performAndCompleteTurn(
      state,
      a.id,
      { type: 'playCard', instanceId: 'cab-1' },
      noThrowHooks('absorber'),
      { nowMs: NOW_MS },
    );
    expect(result.ok).toBe(true);
    expect(state.subChoice).toBeNull();
    expect(a.hand.length + a.specialCards.length).toBeGreaterThan(0);
  });

  it('bot plays upgraded Card Transformer and resolves the special-pick sub-choice without throwing', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l29-08-transformer',
      kitAssignment: ['assassin', 'kamikaze'],
    });
    const a = state.players.find((player) => player.id === 'a');

    if (a === undefined) {
      throw new Error('missing a');
    }

    a.points = 20;
    a.hand = [{ instanceId: 'basic-1', cardId: 'basic-attack', isUpgraded: false }];
    a.specialCards = [{ instanceId: 'ctr-1', cardId: 'card-transformer', isUpgraded: true }];
    state.currentTurnPlayerId = a.id;

    const result = performAndCompleteTurn(
      state,
      a.id,
      { type: 'playCard', instanceId: 'ctr-1', consumeInstanceId: 'basic-1' },
      noThrowHooks('transformer'),
      { nowMs: NOW_MS },
    );
    expect(result.ok).toBe(true);
    expect(state.subChoice).toBeNull();
    expect(a.specialCards.some((card) => card.cardId !== 'card-transformer')).toBe(true);
  });

  it('bot arms upgraded Reanimation, is eliminated, and resolves the reanimation-kit sub-choice without throwing', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l29-08-reanimation',
      kitAssignment: ['assassin', 'kamikaze'],
    });
    const a = state.players.find((player) => player.id === 'a');
    const b = state.players.find((player) => player.id === 'b');

    if (a === undefined || b === undefined) {
      throw new Error('missing players');
    }

    a.lives = 10;
    b.lives = 1;
    b.points = 20;
    b.specialCards = [{ instanceId: 'rea-1', cardId: 'reanimation', isUpgraded: true }];
    state.currentTurnPlayerId = b.id;

    const armed = performAndCompleteTurn(
      state,
      b.id,
      { type: 'playCard', instanceId: 'rea-1' },
      noThrowHooks('reanim-arm'),
      { nowMs: NOW_MS },
    );
    expect(armed.ok).toBe(true);
    expect(
      b.activePersistentEffects.some(
        (effect) => effect.cardId === 'reanimation' && effect.isUpgraded,
      ),
    ).toBe(true);

    b.pendingEffects = [
      {
        id: 'hit-1',
        cardId: 'basic-attack',
        sourcePlayerId: a.id,
        targetPlayerId: b.id,
        queuedAt: 0,
        isUpgraded: false,
        damageMultiplier: 1,
        redirectedBy: null,
        chosenInstanceId: null,
      },
    ];
    state.currentTurnPlayerId = b.id;
    expect(performTurnAction(state, b.id, { type: 'draw' }).ok).toBe(true);
    expect(applyDefaultEliminationRewards(state).ok).toBe(true);
    expect(state.subChoice?.kind).toBe('reanimation-kit');
    expect(b.isEliminated).toBe(true);

    const choice = state.subChoice;

    if (choice?.kind !== 'reanimation-kit') {
      throw new Error('reanimation-kit sub-choice not raised');
    }

    const kitId = pickReanimationKitId(choice.eligibleKitIds, createRng('reanim-kit-final'));
    let completed: ReturnType<typeof completeReanimationKitPick> | undefined;
    expect(() => {
      completed = completeReanimationKitPick(
        state,
        b.id,
        kitId,
        createRng('reanim-kit-resume'),
        NOW_MS,
      );
    }).not.toThrow();
    expect(completed?.ok).toBe(true);
    expect(state.subChoice).toBeNull();
    expect(b.isEliminated).toBe(false);
  });
});
