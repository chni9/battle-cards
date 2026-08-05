/**
 * Shared "no branch yet" score — L29-01.
 *
 * Every family stub (economy, persistents, attacks, turnPool) returns exactly this
 * until its own lot (L29-05..L29-08) adds real scoring. Matches the fallthrough at the
 * end of the pre-split `scorePlayCard` — must stay strictly below `sustain` (= draw).
 */

import type { BotReasonCode } from '@card-battle/shared';

import { HEURISTIC_BAND_WEIGHTS, UNSCORED_PLAY_PENALTY } from '../heuristic-weights';

export function unscoredPlayCardFallthrough(): { score: number; code: BotReasonCode } {
  return {
    score: HEURISTIC_BAND_WEIGHTS.sustain - UNSCORED_PLAY_PENALTY,
    code: 'sustain',
  };
}
