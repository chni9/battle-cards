/**
 * Bot difficulty tiers and decision reasons — technical spec v3 §4.5, §5, §7, L17-05.
 *
 * Wire difficulty values only. Display labels: Easy / Normal / Hard (`formatBotDifficulty`).
 * `BotDecisionReason` is explanatory (#V3-2) — never a second source of game state.
 */

export const BOT_DIFFICULTIES = ['easy', 'normal', 'hard'] as const;

export type BotDifficulty = (typeof BOT_DIFFICULTIES)[number];

export function isBotDifficulty(value: unknown): value is BotDifficulty {
  return (
    typeof value === 'string' && (BOT_DIFFICULTIES as readonly string[]).includes(value)
  );
}

/** Coarse reason codes — technical spec v3 §11 #V3-2 / L17-05 / L36-04. */
export const BOT_REASON_CODES = [
  'lethal-now',
  'survive',
  'deny',
  'pressure',
  'invest',
  'sustain',
  'noise-substitute',
  'mirror-highest-damage',
  'reward-pick',
  'policy-fallback',
  'search-best',
  'search-fallback',
] as const;

export type BotReasonCode = (typeof BOT_REASON_CODES)[number];

export interface BotDecisionReason {
  code: BotReasonCode;
  params?: Readonly<Record<string, string>>;
}

export function isBotReasonCode(value: unknown): value is BotReasonCode {
  return (
    typeof value === 'string' && (BOT_REASON_CODES as readonly string[]).includes(value)
  );
}
