/**
 * The words of the bot seat marker — technical spec v3 §6, §7 (L17-03) and v7 §6.2. One source
 * for `BotSeatLabel`'s chip and for callers that need the words as plain text, such as the arena
 * seat's `title` (L74-04, designer answer Q1). The arena cannot import `bots/` (Lot 74 import
 * rule), so it reads the words here. It lives in a `.ts` because react-refresh forbids a
 * non-component export in a `.tsx`.
 */

import type { BotDifficulty } from '@card-battle/shared';
import { formatBotDifficulty } from '../../bots/format-bot-difficulty';

export interface BotSeatLabelParts {
  /** "Bot", in `--text-2` on the chip. */
  readonly word: string;
  /** "Easy", "Normal" or "Hard" (`formatBotDifficulty`), in `--text` on the chip. */
  readonly tier: string;
}

export function botSeatLabelParts(difficulty: BotDifficulty): BotSeatLabelParts {
  return { word: 'Bot', tier: formatBotDifficulty(difficulty) };
}

/** "Bot · {Easy|Normal|Hard}": the text `BotSeatLabel` shows. */
export function botSeatLabelText(difficulty: BotDifficulty): string {
  const { word, tier } = botSeatLabelParts(difficulty);
  return `${word} · ${tier}`;
}
