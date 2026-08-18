/**
 * Client copy for bot reason codes — L17-05 / #V3-2.
 * Explanatory only; never drives table legality.
 */

import type { BotDecisionReason, BotReasonCode } from '@card-battle/shared';

const SENTENCES: Record<BotReasonCode, string> = {
  'lethal-now': 'Going for a confirmed elimination.',
  survive: 'Playing to survive incoming damage.',
  deny: 'Denying an opponent’s advantage.',
  pressure: 'Pressuring the most threatening opponent.',
  invest: 'Investing for a stronger later turn.',
  sustain: 'Sustaining resources for the long game.',
  'noise-substitute': 'Difficulty noise — a random legal action.',
  'mirror-highest-damage': 'Mirror redirected the highest-damage attack.',
  'reward-pick': 'Claimed elimination rewards.',
  'policy-fallback': 'Fell back to a safe draw.',
  'search-best': 'Chose the search’s best action.',
  'search-fallback': 'Search failed — fell back to the heuristic.',
};

export function formatBotReason(reason: BotDecisionReason): string {
  const base = SENTENCES[reason.code];
  const params = reason.params;

  if (reason.code === 'reward-pick' && params !== undefined) {
    const first = params['first'];
    const second = params['second'];
    if (first !== undefined && second !== undefined) {
      return `${base} (${first}, then ${second}).`;
    }
  }

  return base;
}
