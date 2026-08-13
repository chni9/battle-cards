/**
 * ISMCTS with per-iteration re-determinization — technical spec v5 §6.1 (#V5-1 / L35-01).
 * Scaffold only; iteration loop lands in L35-02…05.
 */

import type { ActionLogEntryView, PlayingStateView } from '@card-battle/shared';

import type { TurnAction } from '../../engine/turn/perform-action';
import type { Rng } from '../../engine/rng';
import type { PolicyWeights } from '../policy-weights';
import type { SearchBudget } from './worker/types';
import type { IsmctsOptions } from './search-types';

export interface IsmctsResult {
  readonly action: TurnAction;
  readonly iterations: number;
}

/**
 * @throws until L35-02…05 implement the tree.
 */
export function runIsmcts(_args: {
  readonly view: PlayingStateView;
  readonly actionLog: readonly ActionLogEntryView[];
  readonly legalActions: readonly TurnAction[];
  readonly rng: Rng;
  readonly weights: PolicyWeights;
  readonly budget: SearchBudget | undefined;
  readonly options: Omit<IsmctsOptions, 'iterations' | 'depthCapRounds' | 'explorationConstant' | 'priorTemperature'>;
}): IsmctsResult {
  void _args;
  throw new Error('runIsmcts: not implemented (L35-02…L35-05)');
}
