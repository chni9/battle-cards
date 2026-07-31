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

export interface RewardChoiceRequiredPayload {
  eliminationId: string;
  eliminatedPlayerId: string;
  availableCards: readonly CardInstance[];
  deadlineMs: number;
}
