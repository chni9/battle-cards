/**
 * First-real-game hint ids — technical spec v6 §5.2 / L46-01.
 * `leave` is not a hint (designer 2026-08-26).
 */

export const HINT_IDS = [
  'your-turn',
  'draw',
  'resources',
  'incoming',
  'hidden-kit',
  'shop',
] as const;

export type HintId = (typeof HINT_IDS)[number];

export function isHintId(value: unknown): value is HintId {
  return typeof value === 'string' && (HINT_IDS as readonly string[]).includes(value);
}
