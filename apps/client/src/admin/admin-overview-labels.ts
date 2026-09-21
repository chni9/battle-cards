/**
 * Human labels for Overview series (Lot 62). Chart primitives consume these.
 */

import {
  SHARED_CARD_IDS,
  getCard,
  getSpecialCard,
  type AdminBotDifficultyBucket,
  type AdminDurationBucketId,
  type AdminElimReasonId,
  type AdminOverviewPersistentId,
  type AdminPlayedActionId,
  type AdminShopMixActionId,
  type AdminWinnerLivesBucketId,
  type ActionResolutionOutcome,
  type CardId,
  type FeedbackKind,
  type KitId,
} from '@card-battle/shared';

import { kitDisplayName } from './admin-present';

const PLAYED_ACTION_LABELS: Record<AdminPlayedActionId, string> = {
  draw: 'Draw',
  playCard: 'Play card',
  playMultipleAttacks: 'Multi-attack',
  buyCard: 'Buy card',
  sellCard: 'Sell card',
  upgradeCard: 'Upgrade card',
  buyUpgradePoint: 'Buy upgrade point',
  sellUpgradePoint: 'Sell upgrade point',
  buySpecialCard: 'Buy special',
  buyPoolCard: 'Buy from pool',
  clearSpy: 'Unspy',
  deactivatePersistent: 'Deactivate persistent',
  activateDuplication: 'Activate duplication',
};

const DURATION_BUCKET_LABELS: Record<AdminDurationBucketId, string> = {
  under5min: 'Under 5 min',
  from5to15min: '5–15 min',
  from15to30min: '15–30 min',
  over30min: '30+ min',
};

const WINNER_LIVES_BUCKET_LABELS: Record<AdminWinnerLivesBucketId, string> = {
  '1to5': '1–5 lives',
  '6to10': '6–10 lives',
  '11to15': '11–15 lives',
  '16plus': '16+ lives',
};

const ELIM_REASON_LABELS: Record<AdminElimReasonId, string> = {
  combat: 'Combat',
  absence: 'Absent',
  inactivity: 'Inactive',
  leave: 'Left',
  gambling: 'Gambling',
};

const COMBAT_OUTCOME_LABELS: Record<ActionResolutionOutcome, string> = {
  applied: 'Applied',
  immune: 'Immune',
  cancelled: 'Cancelled',
  blocked: 'Blocked',
};

const BOT_DIFFICULTY_LABELS: Record<AdminBotDifficultyBucket, string> = {
  easy: 'Easy',
  normal: 'Normal',
  hard: 'Hard',
  mixed: 'Mixed',
};

const FEEDBACK_KIND_LABELS: Record<FeedbackKind, string> = {
  bug: 'Bug',
  confusion: 'Confusion',
  idea: 'Idea',
};

const SHARED_ID_SET = new Set<string>(SHARED_CARD_IDS);

export function playedActionLabel(action: string): string {
  if (action in PLAYED_ACTION_LABELS) {
    return PLAYED_ACTION_LABELS[action as AdminPlayedActionId];
  }
  return action;
}

export function shopMixLabel(action: AdminShopMixActionId): string {
  return playedActionLabel(action);
}

export function adminCardLabel(cardId: string): string {
  const special = getSpecialCard(cardId);
  if (special !== undefined) {
    return special.name;
  }
  if (SHARED_ID_SET.has(cardId)) {
    return getCard(cardId as CardId)?.name ?? cardId;
  }
  return cardId;
}

export function durationBucketLabel(bucket: string): string {
  if (bucket in DURATION_BUCKET_LABELS) {
    return DURATION_BUCKET_LABELS[bucket as AdminDurationBucketId];
  }
  return bucket;
}

export function winnerLivesBucketLabel(bucket: string): string {
  if (bucket in WINNER_LIVES_BUCKET_LABELS) {
    return WINNER_LIVES_BUCKET_LABELS[bucket as AdminWinnerLivesBucketId];
  }
  return bucket;
}

export function elimReasonLabel(reason: string): string {
  if (reason in ELIM_REASON_LABELS) {
    return ELIM_REASON_LABELS[reason as AdminElimReasonId];
  }
  return reason;
}

export function combatOutcomeLabel(outcome: string): string {
  if (outcome in COMBAT_OUTCOME_LABELS) {
    return COMBAT_OUTCOME_LABELS[outcome as ActionResolutionOutcome];
  }
  return outcome;
}

export function botDifficultyLabel(difficulty: string): string {
  if (difficulty in BOT_DIFFICULTY_LABELS) {
    return BOT_DIFFICULTY_LABELS[difficulty as AdminBotDifficultyBucket];
  }
  return difficulty;
}

export function feedbackKindLabel(kind: string): string {
  if (kind in FEEDBACK_KIND_LABELS) {
    return FEEDBACK_KIND_LABELS[kind as FeedbackKind];
  }
  return kind;
}

export function occupancyLabel(occupancy: number): string {
  return `${String(occupancy)} seats`;
}

export function hourUtcLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00 UTC`;
}

export function seatIndexLabel(seatIndex: number): string {
  return `Seat ${String(seatIndex + 1)}`;
}

export function persistentCardLabel(cardId: AdminOverviewPersistentId): string {
  return adminCardLabel(cardId);
}

export function opponentMixLabel(hasBots: boolean): string {
  return hasBots ? 'With bots' : 'Humans only';
}

export function kitPointLabel(kitId: KitId): string {
  return kitDisplayName(kitId);
}
