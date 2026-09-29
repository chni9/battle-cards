/**
 * Effect resolution outcome — `actionResolved` / `ActionResolvedEvent` (technical spec §4.2).
 */

export const ACTION_RESOLUTION_OUTCOMES = [
  'applied',
  'immune',
  'cancelled',
  'blocked',
] as const;

export type ActionResolutionOutcome = (typeof ACTION_RESOLUTION_OUTCOMES)[number];

/** Which card produced `outcome: 'blocked'` (PROTOCOL_VERSION 42 / Lot 68). */
export const BLOCKED_BY_CARD_IDS = ['attack-thief', 'block'] as const;

export type BlockedByCardId = (typeof BLOCKED_BY_CARD_IDS)[number];

export function isBlockedByCardId(value: string): value is BlockedByCardId {
  return (BLOCKED_BY_CARD_IDS as readonly string[]).includes(value);
}
