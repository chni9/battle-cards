/**
 * Bot policy contract — technical spec v5 §7.1 (L32-02).
 *
 * `decide` takes no `GameState` (v3 decision 2, not reopened). Public action log
 * arrives on `ctx` (#V5-9); Spy-revealed fields stay on the per-recipient view.
 */

import type {
  ActionLogEntryView,
  CardInstance,
  KitId,
  PlayingStateView,
  SpecialCardId,
} from '@card-battle/shared';

import type { TurnAction } from '../engine/turn/perform-action';
import type { Rng } from '../engine/rng';
import type {
  MirrorPolicyPick,
  PolicyDecision,
  RewardPolicyPicks,
} from './heuristic-policy';
import type { SearchBudget } from './search/worker/types';

export type { MirrorPolicyPick, PolicyDecision, RewardPolicyPicks };

/** Extensible decide context — action log now; weights profile for L33-01. */
export interface PolicyDecideContext {
  readonly actionLog: readonly ActionLogEntryView[];
  /**
   * Checked-in profile id. `null` / omitted → policy's closed-over weights.
   * Arena and optimizer only; room path uses registered policy defaults.
   */
  readonly weightsProfile?: string | null;
  /** Iteration / wall-clock budget — search-v5 (L35); heuristics ignore it. */
  readonly budget?: SearchBudget;
}

export interface BotPolicy {
  readonly id: string;
  readonly weightsHash: string;
  decide(
    view: PlayingStateView,
    actions: readonly TurnAction[],
    rng: Rng,
    ctx: PolicyDecideContext,
  ): PolicyDecision;
  pickMirrorRedirect(
    view: PlayingStateView,
    rng: Rng,
    eligibleEffectIds?: readonly string[],
  ): MirrorPolicyPick | null;
  pickEliminationRewards(
    view: PlayingStateView,
    availableCards: readonly CardInstance[],
    lifeLimit: number,
    rng: Rng,
  ): RewardPolicyPicks;
  pickStealInstanceId(
    view: PlayingStateView,
    eligibleInstanceIds: readonly string[],
    rng: Rng,
  ): string;
  pickPoolInstanceIds(
    poolCards: readonly CardInstance[],
    eligibleIds: readonly string[],
    maxCount: number,
    rng: Rng,
  ): string[];
  pickSpecialCardId(eligibleCardIds: readonly SpecialCardId[], rng: Rng): SpecialCardId;
  pickReanimationKitId(eligibleKitIds: readonly KitId[], rng: Rng): KitId;
}
