/**
 * Elimination reward choice payloads — technical spec §5.2–§5.6, rules spec §6.
 */

import type { CardInstance } from '../domain/card';

export type RewardChoice =
  | { type: 'lives' }
  | { type: 'points' }
  | { type: 'upgradePoint' }
  | { type: 'card'; instanceId: string };

export interface ChooseEliminationRewardPayload {
  eliminationId: string;
  choices: [RewardChoice, RewardChoice];
}

/**
 * Carried inside the generic `subChoiceRequired` event (technical spec v4 §4.4,
 * backlog L20-18) — `kind` discriminates it from `MirrorChoiceRequiredPayload`.
 */
export interface RewardChoiceRequiredPayload {
  kind: 'elimination-reward';
  eliminationId: string;
  eliminatedPlayerId: string;
  availableCards: readonly CardInstance[];
  deadlineMs: number;
}
