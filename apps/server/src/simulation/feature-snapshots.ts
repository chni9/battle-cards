/**
 * Feature-snapshot JSONL for Lot 37 training — backlog L33-06 / L37-01.
 * Off by default; stalled games contribute zero rows (no invented winner).
 * Capture matches search eval: view+log → inferBelief → extractFeatures (no GameState into belief).
 */

import type { ActionLogEntryView, GameState } from '@card-battle/shared';

import { inferBelief } from '../bots/belief/determinize';
import {
  BELIEF_FEATURE_INDICES,
  extractFeatures,
  FEATURE_LAYOUT_VERSION,
} from '../bots/eval/features';
import { buildPlayingViewFor } from '../protocol/build-view-for';

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

/**
 * Belief-matched feature capture for Lot 37.
 * Pre-L37-01 callers that omit `actionLog` get zero belief widths (legacy; do not train on).
 */
export function captureFeatureSnapshot(
  state: GameState,
  actingPlayerId: string,
  actionLog: readonly ActionLogEntryView[] = [],
  gameCode = 'snapshot',
): UnlabeledFeatureSnapshot {
  const view = buildPlayingViewFor({
    recipientSessionId: actingPlayerId,
    gameCode,
    state,
    turnDeadlineMs: null,
    actionLog,
  });
  const belief = inferBelief(view, actionLog);
  const features = extractFeatures(state, actingPlayerId, belief.summary);

  return {
    turnSequence: state.turnSequence,
    actingPlayerId,
    features: [...features],
  };
}

/** True when any belief-width slot is non-zero (post-L37-01 capture with evidence). */
export function snapshotHasBeliefSignal(features: readonly number[]): boolean {
  return BELIEF_FEATURE_INDICES.some((index) => (features[index] ?? 0) !== 0);
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
