/**
 * Bot difficulty tiers — technical spec v3 §4.5, §5, §7.
 *
 * Wire values only. Display labels are a separate product question (#V3-4 / L17).
 * One definition imported by server and client (`AGENTS.md` §4).
 */

export const BOT_DIFFICULTIES = ['easy', 'normal', 'hard'] as const;

export type BotDifficulty = (typeof BOT_DIFFICULTIES)[number];

export function isBotDifficulty(value: unknown): value is BotDifficulty {
  return (
    typeof value === 'string' && (BOT_DIFFICULTIES as readonly string[]).includes(value)
  );
}
