/**
 * Frozen `heuristic-v4` yardstick — technical spec v5 §7.1 / backlog L32-03.
 *
 * If this test fails, do **not** update the expectations. Move the behaviour
 * change into a new policy id. Updating this fixture moves the yardstick and
 * makes every prior arena measurement uninterpretable.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { KIT_IDS, type ActionLogEntryView, type KitId } from '@card-battle/shared';

import { createInitialState } from '../../engine/create-initial-state';
import { createRng } from '../../engine/rng';
import { listAvailableRewardCards } from '../../engine/turn/elimination-rewards';
import { listLegalActions } from '../../engine/turn/list-legal-actions';
import { performAndCompleteTurn } from '../../engine/turn/orchestrate-turn';
import type { TurnAction } from '../../engine/turn/perform-action';
import { buildPlayingViewFor } from '../../protocol/build-view-for';
import { SIM_NOW_MS } from '../../simulation/run-game';
import { HEURISTIC_V4_POLICY_ID, getPolicy } from '../registry';
import { computeHeuristicV4WeightsHash } from '../weights-hash';

interface FreezeTraceStep {
  turnSequence: number;
  action: TurnAction;
}

interface FreezeFixture {
  weightsHash: string;
  traces: Record<string, FreezeTraceStep[]>;
}

const fixture = JSON.parse(
  readFileSync(join(import.meta.dirname, 'heuristic-v4.freeze.json'), 'utf8'),
) as FreezeFixture;

function collectBot0Trace(kit: KitId): FreezeTraceStep[] {
  const policy = getPolicy(HEURISTIC_V4_POLICY_ID);
  const state = createInitialState({
    seats: [
      { id: 'bot-0', nickname: 'A' },
      { id: 'bot-1', nickname: 'B' },
    ],
    seed: `l32-03-freeze:${kit}`,
    kitAssignment: [kit, 'assassin'],
  });
  const actionLog: ActionLogEntryView[] = [];
  const traces: FreezeTraceStep[] = [];
  let steps = 0;

  while (steps < 12 && state.players.filter((player) => !player.isEliminated).length > 1) {
    const botId = state.currentTurnPlayerId;

    if (botId === null) {
      break;
    }

    const view = buildPlayingViewFor({
      recipientSessionId: botId,
      gameCode: 'FREEZE',
      state,
      turnDeadlineMs: null,
      actionLog,
    });
    const actions = listLegalActions(state, botId);

    if (actions.length === 0) {
      break;
    }

    const rng = createRng(`${state.seed}:bot:${botId}:${state.turnSequence}`);
    const decision = policy.decide(view, actions, rng, { actionLog });

    if (botId === 'bot-0') {
      traces.push({ turnSequence: state.turnSequence, action: decision.action });
    }

    const hooks = {
      resolveMirror: (s: typeof state, actorId: string) => {
        const mirrorView = buildPlayingViewFor({
          recipientSessionId: actorId,
          gameCode: 'FREEZE',
          state: s,
          turnDeadlineMs: null,
          actionLog,
        });
        const pick = policy.pickMirrorRedirect(
          mirrorView,
          createRng(`${s.seed}:bot:${actorId}:mirror:${s.turnSequence}`),
          s.mirrorChoice?.eligibleEffectIds,
        );

        if (pick === null) {
          throw new Error('Mirror pending but policy returned null');
        }

        return pick;
      },
      resolveSteal: (s: typeof state, actorId: string) => {
        const choice = s.stealChoice;

        if (choice?.playerId !== actorId || choice.eligibleInstanceIds.length === 0) {
          throw new Error('steal pending without candidates');
        }

        const stealView = buildPlayingViewFor({
          recipientSessionId: actorId,
          gameCode: 'FREEZE',
          state: s,
          turnDeadlineMs: null,
          actionLog,
        });

        return {
          instanceId: policy.pickStealInstanceId(
            stealView,
            choice.eligibleInstanceIds,
            createRng(`${s.seed}:bot:${actorId}:steal:${s.turnSequence}`),
          ),
        };
      },
      resolvePoolPick: (s: typeof state, actorId: string) => {
        const choice = s.subChoice;

        if (choice?.kind !== 'pool-pick' || choice.playerId !== actorId) {
          throw new Error('pool pick pending without subChoice');
        }

        return {
          instanceIds: policy.pickPoolInstanceIds(
            s.pool,
            choice.eligibleInstanceIds,
            choice.maxCount,
            createRng(`${s.seed}:bot:${actorId}:pool:${s.turnSequence}`),
          ),
        };
      },
      resolveSpecialPick: (s: typeof state, actorId: string) => {
        const choice = s.subChoice;

        if (choice?.kind !== 'special-pick' || choice.playerId !== actorId) {
          throw new Error('special pick pending without subChoice');
        }

        return {
          cardId: policy.pickSpecialCardId(
            choice.eligibleCardIds,
            createRng(`${s.seed}:bot:${actorId}:special:${s.turnSequence}`),
          ),
        };
      },
      resolveReanimationKit: (s: typeof state, playerId: string) => {
        const choice = s.subChoice;

        if (choice?.kind !== 'reanimation-kit' || choice.playerId !== playerId) {
          throw new Error('reanimation kit pending without subChoice');
        }

        return {
          kitId: policy.pickReanimationKitId(
            choice.eligibleKitIds,
            createRng(`${s.seed}:bot:${playerId}:reanim:${s.turnSequence}`),
          ),
        };
      },
      resolveReward: (s: typeof state) => {
        const choice = s.rewardChoice;

        if (choice === null) {
          throw new Error('reward pending without rewardChoice');
        }

        const rewardView = buildPlayingViewFor({
          recipientSessionId: choice.eliminatorPlayerId,
          gameCode: 'FREEZE',
          state: s,
          turnDeadlineMs: null,
          actionLog,
        });
        const available = listAvailableRewardCards(s, choice.eliminatedPlayerId);
        const picks = policy.pickEliminationRewards(
          rewardView,
          available,
          s.lifeLimit,
          createRng(
            `${s.seed}:bot:${choice.eliminatorPlayerId}:reward:${s.turnSequence}`,
          ),
        );

        return {
          chooserPlayerId: choice.eliminatorPlayerId,
          eliminationId: choice.eliminationId,
          choices: picks.choices,
        };
      },
    };

    const result = performAndCompleteTurn(state, botId, decision.action, hooks, {
      nowMs: SIM_NOW_MS,
    });

    if (!result.ok) {
      const draw = performAndCompleteTurn(state, botId, { type: 'draw' }, hooks, {
        nowMs: SIM_NOW_MS,
      });

      if (!draw.ok) {
        break;
      }
    }

    steps += 1;
  }

  return traces;
}

describe('heuristic-v4 freeze (L32-03)', () => {
  it('locks weightsHash of heuristic-weights + life-thresholds', () => {
    expect(computeHeuristicV4WeightsHash()).toBe(fixture.weightsHash);
    expect(getPolicy(HEURISTIC_V4_POLICY_ID).weightsHash).toBe(fixture.weightsHash);
  });

  it('covers all 15 kits in the fixture', () => {
    expect(Object.keys(fixture.traces).sort()).toEqual([...KIT_IDS].sort());
  });

  for (const kit of KIT_IDS) {
    it(`locks bot-0 action trace for ${kit}`, () => {
      const expected = fixture.traces[kit];

      if (expected === undefined) {
        throw new Error(`missing freeze fixture for ${kit}`);
      }

      expect(collectBot0Trace(kit)).toEqual(expected);
    });
  }
});
