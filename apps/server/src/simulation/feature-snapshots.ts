/**
 * Feature-snapshot JSONL for Lot 37 training — backlog L33-06.
 * Off by default; stalled games contribute zero rows (no invented winner).
 */

import type { GameState } from '@card-battle/shared';

import {
  extractFeatures,
  FEATURE_LAYOUT_VERSION,
} from '../bots/eval/features';

export interface FeatureSnapshotRow {
  readonly seed: string;
  readonly turnSequence: number;
  readonly actingPlayerId: string;
  readonly features: readonly number[];
  readonly featureLayoutVersion: number;
  readonly winnerPlayerId: string;
}

export interface UnlabeledFeatureSnapshot {
  readonly turnSequence: number;
  readonly actingPlayerId: string;
  readonly features: readonly number[];
}

export function captureFeatureSnapshot(
  state: GameState,
  actingPlayerId: string,
): UnlabeledFeatureSnapshot {
  const features = extractFeatures(state, actingPlayerId);
  return {
    turnSequence: state.turnSequence,
    actingPlayerId,
    features: [...features],
  };
}

export function labelFeatureSnapshots(
  seed: string,
  unlabeled: readonly UnlabeledFeatureSnapshot[],
  winnerPlayerId: string,
): FeatureSnapshotRow[] {
  return unlabeled.map((row) => ({
    seed,
    turnSequence: row.turnSequence,
    actingPlayerId: row.actingPlayerId,
    features: row.features,
    featureLayoutVersion: FEATURE_LAYOUT_VERSION,
    winnerPlayerId,
  }));
}

export function serializeFeatureSnapshotRow(row: FeatureSnapshotRow): string {
  return `${JSON.stringify(row)}\n`;
}
