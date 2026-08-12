/**
 * State evaluator acceptance — technical spec v5 §5.1 / backlog L33-02.
 */

import { describe, expect, it } from 'vitest';

import { KIT_IDS } from '@card-battle/shared';

import { createInitialState } from '../../engine/create-initial-state';
import { cloneGameState } from '../search/clone-state';
import { DEFAULT_POLICY_WEIGHTS } from '../policy-weights';
import {
  assertWinProbabilitiesNormalized,
  evaluate,
} from './evaluate';
import {
  BELIEF_FEATURE_INDICES,
  extractFeatures,
  FEATURE_DIM,
  FEATURE_LAYOUT_VERSION,
  FEATURE_NAMES,
} from './features';

describe('evaluate / features (L33-02)', () => {
  it('exposes a stable feature layout version and matching dim', () => {
    expect(FEATURE_LAYOUT_VERSION).toBe(1);
    expect(FEATURE_NAMES).toHaveLength(FEATURE_DIM);
    expect(DEFAULT_POLICY_WEIGHTS.evaluator.linearWeights).toHaveLength(FEATURE_DIM);
  });

  it('belief feature slots are reserved zeros', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l33-02-belief-zero',
    });
    const features = extractFeatures(state, 'a');

    for (const index of BELIEF_FEATURE_INDICES) {
      expect(features[index]).toBe(0);
    }
  });

  it('fills belief life-width slots when BeliefSummary is passed (L34-03)', () => {
    const state = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l34-03-belief-fill',
    });
    const features = extractFeatures(state, 'a', {
      lifeWidthByOpponentOffset: [0.12, 0, 0],
    });
    expect(features[BELIEF_FEATURE_INDICES[0] ?? -1]).toBe(0.12);
    expect(features[BELIEF_FEATURE_INDICES[1] ?? -1]).toBe(0);
    expect(features[BELIEF_FEATURE_INDICES[2] ?? -1]).toBe(0);
  });

  it('is monotone in self lives', () => {
    const base = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l33-02-mono-lives',
    });
    const low = cloneGameState(base);
    const high = cloneGameState(base);
    const lowSelf = low.players.find((player) => player.id === 'a');
    const highSelf = high.players.find((player) => player.id === 'a');

    if (lowSelf === undefined || highSelf === undefined) {
      throw new Error('missing seats');
    }

    lowSelf.lives = 4;
    highSelf.lives = 12;

    const lowP = evaluate(low, 'a')[0] ?? 0;
    const highP = evaluate(high, 'a')[0] ?? 0;
    expect(highP).toBeGreaterThan(lowP);
  });

  it('is monotone in living opponent count', () => {
    const three = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
        { id: 'c', nickname: 'C' },
      ],
      seed: 'l33-02-mono-opponents',
    });
    const two = cloneGameState(three);
    const eliminated = two.players.find((player) => player.id === 'c');

    if (eliminated === undefined) {
      throw new Error('missing c');
    }

    eliminated.isEliminated = true;
    eliminated.lives = 0;

    const selfIndexThree = three.players
      .filter((player) => !player.isEliminated)
      .findIndex((player) => player.id === 'a');
    const selfIndexTwo = two.players
      .filter((player) => !player.isEliminated)
      .findIndex((player) => player.id === 'a');

    const pThree = evaluate(three, 'a')[selfIndexThree] ?? 0;
    const pTwo = evaluate(two, 'a')[selfIndexTwo] ?? 0;
    expect(pTwo).toBeGreaterThan(pThree);
  });

  it('is monotone in pending outgoing damage vs opponent', () => {
    const base = createInitialState({
      seats: [
        { id: 'a', nickname: 'A' },
        { id: 'b', nickname: 'B' },
      ],
      seed: 'l33-02-mono-outgoing',
    });
    const withHit = cloneGameState(base);
    const target = withHit.players.find((player) => player.id === 'b');

    if (target === undefined) {
      throw new Error('missing b');
    }

    target.pendingEffects.push({
      id: 'pending-1',
      sourcePlayerId: 'a',
      targetPlayerId: 'b',
      cardId: 'super-attack',
      isUpgraded: true,
      queuedAt: 1,
      damageMultiplier: 1,
      redirectedBy: null,
      chosenInstanceId: null,
    });

    const baseP = evaluate(base, 'a')[0] ?? 0;
    const hitP = evaluate(withHit, 'a')[0] ?? 0;
    expect(hitP).toBeGreaterThan(baseP);
  });

  it('win probabilities sum to 1 on 1000 random reachable positions', () => {
    for (let index = 0; index < 1000; index += 1) {
      const seatCount = 2 + (index % 3);
      const seats = Array.from({ length: seatCount }, (_, seat) => ({
        id: `p${String(seat)}`,
        nickname: `P${String(seat)}`,
      }));
      const kitAssignment = seats.map((_, seat) => {
        const kit = KIT_IDS[(index + seat) % KIT_IDS.length];

        if (kit === undefined) {
          throw new Error('KIT_IDS empty');
        }

        return kit;
      });
      const state = createInitialState({
        seats,
        seed: `l33-02-sum:${String(index)}`,
        kitAssignment,
      });

      // Mild mid-game mutation still reachable from deal (resources + pending).
      if (index % 5 === 0) {
        const self = state.players[0];
        const foe = state.players[1];

        if (self !== undefined && foe !== undefined) {
          self.lives = Math.max(1, self.lives - (index % 3));
          foe.pendingEffects.push({
            id: `pend-${String(index)}`,
            sourcePlayerId: self.id,
            targetPlayerId: foe.id,
            cardId: 'basic-attack',
            isUpgraded: false,
            queuedAt: index,
            damageMultiplier: 1,
            redirectedBy: null,
            chosenInstanceId: null,
          });
        }
      }

      const living = state.players.filter((player) => !player.isEliminated);
      const values = evaluate(state, living[0]?.id ?? 'p0');
      assertWinProbabilitiesNormalized(values, 1e-6);
      expect(values).toHaveLength(living.length);
    }
  });
});
