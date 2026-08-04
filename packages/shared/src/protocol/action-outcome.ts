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
