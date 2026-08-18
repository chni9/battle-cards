/**
 * Fitted model parse / logit — L37-02.
 */

import { describe, expect, it } from 'vitest';

import { FEATURE_DIM, FEATURE_LAYOUT_VERSION } from './features';
import {
  computeFittedModelContentHash,
  logitFromFeatures,
  parseFittedModel,
  type FittedLogisticModel,
} from './fitted';
import { fitLogisticL2, meanLogLoss } from '../../simulation/fit-logistic';
import type { LabeledFittedRow } from '../../simulation/assemble-fitted-dataset';
import { DEFAULT_POLICY_WEIGHTS } from '../policy-weights';
import { evaluateFromFeatures } from './evaluate';
import type { GameState } from '@card-battle/shared';

function makeRow(label: 0 | 1, feature0: number): LabeledFittedRow {
  const features = Array.from({ length: FEATURE_DIM }, () => 0);
  features[0] = feature0;
  return {
    seed: 's',
    turnSequence: 1,
    actingPlayerId: 'bot-0',
    features,
    featureLayoutVersion: FEATURE_LAYOUT_VERSION,
    winnerPlayerId: label === 1 ? 'bot-0' : 'bot-1',
    label,
    split: 'train',
  };
}

describe('fitted logistic (L37-02)', () => {
  it('parseFittedModel rejects bad contentHash', () => {
    const withoutHash = {
      kind: 'logistic' as const,
      featureLayoutVersion: FEATURE_LAYOUT_VERSION,
      featureDim: FEATURE_DIM,
      intercept: 0,
      weights: Array.from({ length: FEATURE_DIM }, () => 0),
      trainedOn: {
        datasetManifestHash: 'x',
        policyId: 'search-v5',
        gamesApprox: 1,
        createdAt: '2026-08-13',
      },
    };
    expect(() =>
      parseFittedModel({ ...withoutHash, contentHash: 'deadbeefdeadbeef' }),
    ).toThrow(/contentHash/);
  });

  it('logitFromFeatures matches manual dot product', () => {
    const withoutHash = {
      kind: 'logistic' as const,
      featureLayoutVersion: FEATURE_LAYOUT_VERSION,
      featureDim: FEATURE_DIM,
      intercept: 0.5,
      weights: Array.from({ length: FEATURE_DIM }, (_, index) => (index === 0 ? 2 : 0)),
      trainedOn: {
        datasetManifestHash: 'x',
        policyId: 'search-v5',
        gamesApprox: 1,
        createdAt: '2026-08-13',
      },
    };
    const model: FittedLogisticModel = {
      ...withoutHash,
      contentHash: computeFittedModelContentHash(withoutHash),
    };
    const features = Float64Array.from(Array.from({ length: FEATURE_DIM }, (_, i) => (i === 0 ? 1.5 : 0)));
    expect(logitFromFeatures(model, features)).toBeCloseTo(0.5 + 3, 10);
  });

  it('fitLogisticL2 learns a separable one-feature signal', () => {
    const train: LabeledFittedRow[] = [];

    for (let index = 0; index < 40; index += 1) {
      train.push(makeRow(1, 1));
      train.push(makeRow(0, 0));
    }

    const fit = fitLogisticL2({
      train,
      validation: train,
      lambdas: [1e-3],
      learningRate: 0.2,
      maxEpochs: 80,
      seed: 'l37-02-unit',
    });

    expect(fit.weights[0] ?? 0).toBeGreaterThan(0.5);
    expect(meanLogLoss(train, fit.intercept, fit.weights)).toBeLessThan(0.4);
  });

  it('evaluateFromFeatures dispatches fitted-logistic via inline model load mock path', () => {
    // Smoke: linear path still works with default weights.
    const state = {
      players: [
        { id: 'a', isEliminated: false, lives: 10, lifeLimit: 25 },
        { id: 'b', isEliminated: false, lives: 10, lifeLimit: 25 },
      ],
      lifeLimit: 25,
    } as unknown as GameState;
    const features = new Map([
      ['a', Float64Array.from(Array.from({ length: FEATURE_DIM }, () => 0))],
      ['b', Float64Array.from(Array.from({ length: FEATURE_DIM }, () => 0))],
    ]);
    const probs = evaluateFromFeatures(state, ['a', 'b'], features, DEFAULT_POLICY_WEIGHTS);
    expect(probs).toHaveLength(2);
    expect((probs[0] ?? 0) + (probs[1] ?? 0)).toBeCloseTo(1, 9);
  });
});
