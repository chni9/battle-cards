/**
 * Observable bot fallback stages — technical spec v5 §8.2 (L36-02).
 * Greppable in production without a debugger.
 */

export const FALLBACK_LOG_PREFIX = 'bot.fallback' as const;

export const FALLBACK_STAGES = [
  'worker_timeout',
  'worker_crash',
  'illegal_action',
  'heuristic',
  'draw',
] as const;

export type FallbackStage = (typeof FALLBACK_STAGES)[number];

export function logBotFallback(stage: FallbackStage, detail?: string): void {
  if (detail === undefined || detail === '') {
    console.warn(`${FALLBACK_LOG_PREFIX}.${stage}`);
    return;
  }

  console.warn(`${FALLBACK_LOG_PREFIX}.${stage} ${detail}`);
}

export function classifyWorkerFailure(error: unknown): Exclude<FallbackStage, 'heuristic' | 'draw'> {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('timed out')) {
    return 'worker_timeout';
  }

  if (message.includes('illegal')) {
    return 'illegal_action';
  }

  return 'worker_crash';
}
