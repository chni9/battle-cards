/**
 * Public bot-reason sanitizer — #V5-4 / L36-04.
 * Why panel is visible to every seat; never attach numeric eval aggregates.
 */

import type { BotDecisionReason } from '@card-battle/shared';

const FORBIDDEN_PARAM_KEYS = [
  'visits',
  'visit',
  'winProbability',
  'winProb',
  'eval',
  'value',
  'score',
  'iterations',
  'q',
] as const;

/**
 * Returns a reason safe for the public action log, or throws if params leak
 * search/eval aggregates (numeric or forbidden keys).
 */
export function assertPublicBotReason(reason: BotDecisionReason): BotDecisionReason {
  const params = reason.params;

  if (params === undefined) {
    return reason;
  }

  for (const key of Object.keys(params)) {
    const normalized = key.toLowerCase();

    for (const forbidden of FORBIDDEN_PARAM_KEYS) {
      if (normalized.includes(forbidden.toLowerCase())) {
        throw new Error(`bot reason params must not include ${key} (#V5-4)`);
      }
    }

    const value = params[key];

    if (value !== undefined && /^-?\d+(\.\d+)?$/.test(value)) {
      throw new Error(`bot reason params must not carry numeric values (#V5-4): ${key}`);
    }
  }

  return reason;
}
