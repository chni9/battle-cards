/**
 * Search decision / node types — technical spec v5 §6 / Lot 35 (L35-01 scaffold).
 * A node is one player decision (main action or sub-choice), not a full turn.
 */

import type { KitId, RewardChoice, SpecialCardId, SubChoiceKind } from '@card-battle/shared';

import type { TurnAction } from '../../engine/turn/perform-action';

/** Main turn action or a single mid-resolution sub-choice pick. */
export type SearchDecision =
  | { readonly kind: 'action'; readonly action: TurnAction }
  | {
      readonly kind: 'mirror';
      readonly pendingEffectId: string;
      readonly newTargetPlayerId: string;
    }
  | { readonly kind: 'steal-pick'; readonly instanceId: string }
  | { readonly kind: 'pool-pick'; readonly instanceIds: readonly string[] }
  | { readonly kind: 'special-pick'; readonly cardId: SpecialCardId }
  | { readonly kind: 'reanimation-kit'; readonly kitId: KitId }
  | {
      readonly kind: 'elimination-reward';
      readonly chooserPlayerId: string;
      readonly eliminationId: string;
      readonly choices: readonly [RewardChoice, RewardChoice];
    };

export type SearchDecisionKind = SearchDecision['kind'] | SubChoiceKind;

/**
 * ISMCTS node keyed by information set (owner + decision kind + legal fingerprint).
 * Value vector is per living player (max^n); filled in L35-03.
 */
export interface SearchNode {
  readonly infoSetKey: string;
  readonly ownerPlayerId: string;
  readonly decisionKind: SearchDecision['kind'];
  visits: number;
  /** Sum of backed-up win-prob components, indexed like living-seat order at root. */
  valueSums: Float64Array;
  children: Map<string, SearchEdge>;
}

export interface SearchEdge {
  readonly decisionKey: string;
  readonly decision: SearchDecision;
  prior: number;
  visits: number;
  child: SearchNode | null;
}

export interface IsmctsOptions {
  readonly iterations: number;
  readonly depthCapRounds: number;
  readonly explorationConstant: number;
  readonly priorTemperature: number;
  /** Acting seat id (root owner). */
  readonly perspectivePlayerId: string;
  readonly botId: string;
  readonly gameSeed: string;
  readonly turnSequence: number;
}
