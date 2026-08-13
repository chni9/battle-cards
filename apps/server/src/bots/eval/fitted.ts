/**
 * Fitted evaluator models — technical spec v5 §5.3 / Lot 37.
 * Plain JSON + pure TypeScript inference (no ONNX / native / Python runtime).
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { stableStringify } from '../weights-hash';
import { FEATURE_DIM, FEATURE_LAYOUT_VERSION, type FeatureVector } from './features';

export type FittedModelKind = 'logistic' | 'gbdt';

export interface FittedLogisticModel {
  readonly kind: 'logistic';
  readonly featureLayoutVersion: number;
  readonly featureDim: number;
  readonly intercept: number;
  readonly weights: readonly number[];
  readonly contentHash: string;
  readonly trainedOn: {
    readonly datasetManifestHash: string;
    readonly policyId: string;
    readonly gamesApprox: number;
    readonly createdAt: string;
  };
}

export interface FittedGbdtNode {
  readonly featureIndex?: number;
  readonly threshold?: number;
  readonly left?: number;
  readonly right?: number;
  readonly value?: number;
}

export interface FittedGbdtModel {
  readonly kind: 'gbdt';
  readonly featureLayoutVersion: number;
  readonly featureDim: number;
  readonly learningRate: number;
  readonly initLogit: number;
  readonly trees: readonly { readonly nodes: readonly FittedGbdtNode[] }[];
  readonly contentHash: string;
  readonly trainedOn: {
    readonly datasetManifestHash: string;
    readonly policyId: string;
    readonly gamesApprox: number;
    readonly createdAt: string;
  };
}

export type FittedModel = FittedLogisticModel | FittedGbdtModel;

const MODELS_DIR = dirname(fileURLToPath(import.meta.url));

/** Checked-in model id → filename under `bots/eval/models/`. */
const MODEL_FILES: Readonly<Record<string, string>> = {
  'logistic-v5': 'logistic-v5.json',
};

const modelCache = new Map<string, FittedModel>();

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function computeFittedModelContentHash(
  model: Omit<FittedLogisticModel, 'contentHash'> | Omit<FittedGbdtModel, 'contentHash'>,
): string {
  return createHash('sha256').update(stableStringify(model)).digest('hex').slice(0, 16);
}

export function assertCompatibleLayout(model: FittedModel): void {
  if (model.featureLayoutVersion !== FEATURE_LAYOUT_VERSION) {
    throw new Error(
      `Fitted model layout ${String(model.featureLayoutVersion)} ≠ ${String(FEATURE_LAYOUT_VERSION)}`,
    );
  }

  if (model.featureDim !== FEATURE_DIM) {
    throw new Error(
      `Fitted model dim ${String(model.featureDim)} ≠ ${String(FEATURE_DIM)}`,
    );
  }
}

export function parseFittedModel(raw: unknown): FittedModel {
  if (!isPlainObject(raw)) {
    throw new Error('Fitted model must be an object');
  }

  const kind = raw['kind'];

  if (kind === 'logistic') {
    const weights = raw['weights'];
    if (
      !Array.isArray(weights) ||
      !weights.every((entry): entry is number => typeof entry === 'number' && Number.isFinite(entry))
    ) {
      throw new Error('logistic.weights must be finite numbers');
    }

    const intercept = raw['intercept'];
    const featureLayoutVersion = raw['featureLayoutVersion'];
    const featureDim = raw['featureDim'];
    const contentHash = raw['contentHash'];
    const trainedOn = raw['trainedOn'];

    if (typeof intercept !== 'number' || !Number.isFinite(intercept)) {
      throw new Error('logistic.intercept must be finite');
    }

    if (typeof featureLayoutVersion !== 'number' || typeof featureDim !== 'number') {
      throw new Error('logistic missing layout fields');
    }

    if (typeof contentHash !== 'string' || contentHash === '') {
      throw new Error('logistic.contentHash required');
    }

    if (!isPlainObject(trainedOn)) {
      throw new Error('logistic.trainedOn required');
    }

    const datasetManifestHash = trainedOn['datasetManifestHash'];
    const policyId = trainedOn['policyId'];
    const gamesApprox = trainedOn['gamesApprox'];
    const createdAt = trainedOn['createdAt'];

    if (typeof datasetManifestHash !== 'string') {
      throw new Error('logistic.trainedOn.datasetManifestHash must be a string');
    }

    if (typeof policyId !== 'string') {
      throw new Error('logistic.trainedOn.policyId must be a string');
    }

    if (typeof createdAt !== 'string') {
      throw new Error('logistic.trainedOn.createdAt must be a string');
    }

    const model: FittedLogisticModel = {
      kind: 'logistic',
      featureLayoutVersion,
      featureDim,
      intercept,
      weights,
      contentHash,
      trainedOn: {
        datasetManifestHash,
        policyId,
        gamesApprox: typeof gamesApprox === 'number' ? gamesApprox : 0,
        createdAt,
      },
    };
    assertCompatibleLayout(model);
    const expected = computeFittedModelContentHash({
      kind: model.kind,
      featureLayoutVersion: model.featureLayoutVersion,
      featureDim: model.featureDim,
      intercept: model.intercept,
      weights: model.weights,
      trainedOn: model.trainedOn,
    });

    if (expected !== model.contentHash) {
      throw new Error(`logistic contentHash mismatch: ${model.contentHash} ≠ ${expected}`);
    }

    return model;
  }

  if (kind === 'gbdt') {
    throw new Error('GBDT model parsing reserved for L37-03');
  }

  throw new Error(`Unknown fitted model kind: ${String(kind)}`);
}

export function loadFittedModel(modelId: string): FittedModel {
  const cached = modelCache.get(modelId);

  if (cached !== undefined) {
    return cached;
  }

  const fileName = MODEL_FILES[modelId];

  if (fileName === undefined) {
    throw new Error(`Unknown fitted model id: ${modelId}`);
  }

  const raw = JSON.parse(
    readFileSync(join(MODELS_DIR, 'models', fileName), 'utf8'),
  ) as unknown;
  const model = parseFittedModel(raw);
  modelCache.set(modelId, model);
  return model;
}

/** Clear cache — tests only. */
export function clearFittedModelCache(): void {
  modelCache.clear();
}

export function logitFromFeatures(model: FittedModel, features: FeatureVector): number {
  assertCompatibleLayout(model);

  if (features.length !== model.featureDim) {
    throw new Error(
      `Feature length ${String(features.length)} ≠ model dim ${String(model.featureDim)}`,
    );
  }

  if (model.kind === 'logistic') {
    let logit = model.intercept;

    for (let index = 0; index < model.weights.length; index += 1) {
      logit += (features[index] ?? 0) * (model.weights[index] ?? 0);
    }

    return logit;
  }

  // GBDT: sum init + lr * tree leaves
  let logit = model.initLogit;

  for (const tree of model.trees) {
    let nodeIndex = 0;
    let guard = 0;

    while (guard < tree.nodes.length + 2) {
      guard += 1;
      const node = tree.nodes[nodeIndex];

      if (node === undefined) {
        break;
      }

      if (node.value !== undefined && node.featureIndex === undefined) {
        logit += model.learningRate * node.value;
        break;
      }

      const featureIndex = node.featureIndex ?? 0;
      const threshold = node.threshold ?? 0;
      const goLeft = (features[featureIndex] ?? 0) <= threshold;
      nodeIndex = goLeft ? (node.left ?? 0) : (node.right ?? 0);
    }
  }

  return logit;
}

export function listFittedModelIds(): readonly string[] {
  return Object.keys(MODEL_FILES).sort();
}
