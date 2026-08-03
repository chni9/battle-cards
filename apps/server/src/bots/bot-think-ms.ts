/**
 * Bot think delay — technical spec v3 §4.2.
 *
 * Follows TURN_DURATION_MS's *shape* (env override) but must not inherit its
 * 5_000 ms clamp — that would reject every sensible bot delay.
 * Tunable default: 900 ms. Simulator sets 0 (L18).
 */

export function readBotThinkMs(): number {
  const raw = process.env['BOT_THINK_MS'];

  if (raw === undefined) {
    return 900;
  }

  const parsed = Number(raw);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 900;
  }

  return parsed;
}
