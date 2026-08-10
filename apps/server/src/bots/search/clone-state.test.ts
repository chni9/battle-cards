/**
 * Clone independence + live-state mutation guard — technical spec v5 §10.1 (L32-04).
 *
 * The second test may not be skipped, weakened, or moved behind a flag.
 */

import { describe, expect, it } from 'vitest';

import type { ActionLogEntryView, GameState, PendingEffect } from '@card-battle/shared';

import { createInitialState } from '../../engine/create-initial-state';
import { createRng } from '../../engine/rng';
import { listLegalActions } from '../../engine/turn/list-legal-actions';
import { makeCounterEffect } from '../../testing/factories';
import { buildPlayingViewFor } from '../../protocol/build-view-for';
import { getDefaultPolicy } from '../registry';
import { cloneGameState } from './clone-state';

function makePending(overrides: Partial<PendingEffect> = {}): PendingEffect {
  return {
    id: 'pe-1',
    sourcePlayerId: 'b',
    targetPlayerId: 'a',
    cardId: 'basic-attack',
    queuedAt: 0,
    isUpgraded: false,
    damageMultiplier: 1,
    redirectedBy: null,
    chosenInstanceId: null,
    ...overrides,
  };
}

function assertPlainJsonGraph(value: unknown, path = 'root'): void {
  if (value === null || typeof value !== 'object') {
    return;
  }

  expect(value, path).not.toBeInstanceOf(Map);
  expect(value, path).not.toBeInstanceOf(Set);
  expect(value, path).not.toBeInstanceOf(Date);
  expect(
    Object.getPrototypeOf(value) === Object.prototype || Array.isArray(value),
    path,
  ).toBe(true);

  if (Array.isArray(value)) {
    for (const [index, entry] of value.entries()) {
      assertPlainJsonGraph(entry, `${path}[${String(index)}]`);
    }

    return;
  }

  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    assertPlainJsonGraph(entry, `${path}.${key}`);
  }
}

function mutateEveryMutableField(state: GameState): void {
  state.lifeLimit = 99;
  state.nextPoolInstanceSeq = 9_999;
  state.currentTurnPlayerId = 'mutated-turn';
  state.turnSequence = 9_999;
  state.seed = 'mutated-seed';

  state.pool.push({
    instanceId: 'mutated-pool',
    cardId: 'tax',
    isUpgraded: true,
  });
  const poolCard = state.pool[0];

  if (poolCard !== undefined) {
    poolCard.isUpgraded = !poolCard.isUpgraded;
    poolCard.instanceId = `${poolCard.instanceId}:mut`;
  }

  state.visibility.push({
    viewerId: 'x',
    subjectId: 'y',
    level: 'kit-and-cards',
  });
  state.eliminationContributors.push({
    sourcePlayerId: 'x',
    victimPlayerId: 'y',
  });
  state.rewardQueue.push({
    eliminationId: 'mut-elim',
    eliminatorPlayerId: 'x',
    eliminatedPlayerId: 'y',
  });

  state.mirrorChoice = {
    playerId: 'mut',
    isUpgraded: false,
    eligibleEffectIds: ['pe'],
    deadlineMs: 1,
  };
  state.stealChoice = {
    playerId: 'mut',
    victimPlayerId: 'y',
    eligibleInstanceIds: ['i'],
    pendingSpiedVictimIds: [],
    cardIsUpgraded: false,
    deadlineMs: 1,
  };
  state.subChoice = {
    kind: 'pool-pick',
    playerId: 'mut',
    eligibleInstanceIds: ['i'],
    maxCount: 1,
    cardIsUpgraded: true,
    deadlineMs: 1,
  };
  state.rewardChoice = {
    eliminationId: 'mut-elim',
    eliminatorPlayerId: 'x',
    eliminatedPlayerId: 'y',
    deadlineMs: 1,
  };

  for (const player of state.players) {
    player.nickname = `${player.nickname}:mut`;
    player.lives += 1;
    player.points += 1;
    player.upgradePoints += 1;
    player.shield += 1;
    player.shieldIsUpgraded = !player.shieldIsUpgraded;
    player.isEliminated = !player.isEliminated;
    player.blockTurnsRemaining += 1;
    player.blockAttacksForbidden = !player.blockAttacksForbidden;
    player.attackBlockCharges += 1;
    player.duplicationActive = !player.duplicationActive;
    player.hand.push({
      instanceId: `${player.id}:mut-hand`,
      cardId: 'spy',
      isUpgraded: false,
    });
    player.specialCards.push({
      instanceId: `${player.id}:mut-special`,
      cardId: 'block',
      isUpgraded: false,
    });
    player.pendingEffects.push(
      makePending({
        id: `${player.id}:mut-pending`,
        sourcePlayerId: player.id,
        targetPlayerId: player.id,
      }),
    );
    player.activePersistentEffects.push(
      makeCounterEffect({
        id: `${player.id}:mut-persist`,
        cardId: 'imposition',
        counter: 3,
      }),
    );
    player.turnLedger.livesLost += 1;
    player.turnLedger.pointsSpent += 1;
    player.turnLedger.upgradePointsSpent += 1;
    player.turnLedger.pointsLostToTheft += 1;
    player.turnLedger.upgradePointsLostToTheft += 1;
    player.connectionState.status = 'absent';
    player.connectionState.disconnectedAt = 123;
    player.connectionState.automaticTurnsTaken += 1;
    player.connectionState.consecutiveTimeouts += 1;
    player.eliminationSnapshot = {
      kitId: player.kitId,
      hand: [],
      specialCards: [],
      lives: 0,
      points: 0,
      upgradePoints: 0,
      shield: 0,
      shieldIsUpgraded: false,
      turnSequence: 1,
    };
    player.pendingReanimation = { isUpgraded: true };
    player.absorbWindowPendingPlayerIds = ['x'];

    const handCard = player.hand[0];

    if (handCard !== undefined) {
      handCard.isUpgraded = !handCard.isUpgraded;
    }
  }
}

describe('cloneGameState (L32-04)', () => {
  it('proves GameState is a plain JSON graph (no Map/Set/Date/class)', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l32-04-plain',
      kitAssignment: ['assassin', 'kamikaze'],
    });

    assertPlainJsonGraph(state);
  });

  it('clone then mutate every mutable field leaves the original untouched', () => {
    const original = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l32-04-independence',
      kitAssignment: ['assassin', 'kamikaze'],
    });
    const a = original.players[0];

    if (a === undefined) {
      throw new Error('missing player');
    }

    a.pendingEffects.push(
      makePending({
        id: 'pe-1',
        sourcePlayerId: 'b',
        targetPlayerId: 'a',
      }),
    );
    a.activePersistentEffects.push(
      makeCounterEffect({ id: 'persist-1', cardId: 'imposition', counter: 2 }),
    );
    original.pool.push({ instanceId: 'pool-1', cardId: 'tax', isUpgraded: false });
    original.visibility.push({
      viewerId: 'a',
      subjectId: 'b',
      level: 'kit-and-cards',
    });

    const snapshot = structuredClone(original);
    const clone = cloneGameState(original);
    mutateEveryMutableField(clone);

    expect(original).toEqual(snapshot);
    expect(clone).not.toEqual(snapshot);
  });

  it('bot decide against a view does not mutate the live GameState', () => {
    const state = createInitialState({
      seats: [
        { id: 'bot-0', nickname: 'A' },
        { id: 'bot-1', nickname: 'B' },
      ],
      seed: 'l32-04-live-guard',
      kitAssignment: ['assassin', 'kamikaze'],
    });
    state.currentTurnPlayerId = 'bot-0';

    const before = structuredClone(state);
    const actionLog: ActionLogEntryView[] = [];
    const view = buildPlayingViewFor({
      recipientSessionId: 'bot-0',
      gameCode: 'GUARD',
      state,
      turnDeadlineMs: null,
      actionLog,
    });
    const actions = listLegalActions(state, 'bot-0');
    const rng = createRng(`${state.seed}:bot:bot-0:${state.turnSequence}`);
    getDefaultPolicy().decide(view, actions, rng, { actionLog });

    expect(state).toEqual(before);
  });
});
