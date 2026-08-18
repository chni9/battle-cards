/**
 * Shared "no branch yet" score — L29-01.
 *
 * Every family stub (economy, persistents, attacks, turnPool) returns exactly this
 * until its own lot (L29-05..L29-08) adds real scoring. Matches the fallthrough at the
 * end of the pre-split `scorePlayCard` — must stay strictly below `sustain` (= draw).
 */

import type { BotReasonCode } from '@card-battle/shared';

import type { PolicyWeights } from '../policy-weights';

export function unscoredPlayCardFallthrough(
  weights: PolicyWeights,
): { score: number; code: BotReasonCode } {
  return {
    score: weights.action.bands.sustain - weights.action.unscoredPlayPenalty,
    code: 'sustain',
  };
}
