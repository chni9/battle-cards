/**
 * Classic occupancy — designer 2026-08-29 (was 2–4 through V5 / #V4-30).
 * Rules spec §1 Number of Players.
 */

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;

/**
 * Solo opponent counts (total seats = 1 human + N bots).
 * Length is `MAX_PLAYERS - 1`.
 */
export const SOLO_OPPONENT_COUNTS = [1, 2, 3, 4, 5] as const;

export type SoloOpponentCount = (typeof SOLO_OPPONENT_COUNTS)[number];
