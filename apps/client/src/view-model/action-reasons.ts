/**
 * Disabled reasons — technical spec v7 §10.6, §11; Lot 73 (L73-06).
 *
 * One code per reason a V7 action can show disabled, and the one copy table for them. Every
 * V7 action model (card actions, self strip, shop) builds its availability with
 * `availabilityFor`, so a reason is present exactly when the action is disabled.
 */

/**
 * The fixed list (Lot 73 plan, Appendix A). `reanimation-armed` is appended last by designer
 * decision 2026-10-27: a second Reanimation is greyed while one is armed (`reanimation.ts`
 * `canPlay`, #V4-12c).
 */
export const DISABLED_REASONS = [
  'not-your-turn',
  'actions-locked',
  'invisibility',
  'attack-ban',
  'not-enough-points',
  'not-enough-lives',
  'no-upgrade-point',
  'no-valid-target',
  'nothing-to-consume',
  'temporarily-unavailable',
  'no-living-spy',
  'pool-empty',
  'reanimation-armed',
] as const;

export type DisabledReason = (typeof DISABLED_REASONS)[number];

/**
 * Player-facing copy, written in `DISABLED_REASONS` order (Lot 73 plan, Appendix B, New strings).
 * V2 text is reused where the same case had text: the illegal-action titles and the card dialog
 * lines. `actions-locked` drops the V2 card-only tail ("you can still read the card") because the
 * shop and Unspy share it.
 */
export const DISABLED_REASON_COPY: Record<DisabledReason, string> = {
  'not-your-turn': 'Not your turn',
  'actions-locked': 'Actions locked',
  invisibility: "Invisible: you can't act on other players",
  'attack-ban': 'Block: attacks banned this turn',
  'not-enough-points': 'Not enough points',
  'not-enough-lives': 'Not enough lives',
  'no-upgrade-point': 'No upgrade points',
  'no-valid-target': 'No valid target',
  'nothing-to-consume': 'No action or attack card in hand to transform.',
  'temporarily-unavailable': 'Temporarily unavailable',
  'no-living-spy': 'Nobody is spying on you',
  'pool-empty': 'Pool empty',
  'reanimation-armed': 'Reanimation already armed',
};

/** `reason` is null exactly when `enabled` is true. */
export interface ActionAvailability {
  enabled: boolean;
  reason: DisabledReason | null;
}

/** The only builder of an `ActionAvailability`: the first disabled reason found, or null. */
export function availabilityFor(reason: DisabledReason | null): ActionAvailability {
  return { enabled: reason === null, reason };
}
