/**
 * Display labels for bot difficulty — closes #V3-4 (L17-01).
 * Wire values stay `easy` / `normal` / `hard`; UI copy is Title Case.
 */

import type { BotDifficulty } from '@card-battle/shared';

const LABELS: Record<BotDifficulty, string> = {
  easy: 'Easy',
  normal: 'Normal',
  hard: 'Hard',
};

export function formatBotDifficulty(difficulty: BotDifficulty): string {
  return LABELS[difficulty];
}
