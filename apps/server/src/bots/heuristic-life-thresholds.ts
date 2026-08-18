/**
 * Life-relative heuristic thresholds — technical spec v3 §4.4 (L29-03).
 *
 * `REGEN_SOFT_LIFE` and `TAX_LIFE_BUFFER` in `heuristic-weights.ts` are absolute life
 * counts tuned by playtest against 10-life kits (Assassin, Untouchable, ...). Applied
 * as-is to a low-life kit (e.g. a future Tactician) or a high-life kit (Indestructible,
 * 18) they are wrong in opposite directions: an 18-life bot never Taxes past its buffer
 * being needlessly timid, a low-life bot Taxes/Regens too late to matter. Scale both by
 * the kit's starting lives, keeping the same *proportion* of a 10-life kit's tuned value
 * (#V3-5: tunable defaults, not measured constants — this rescaling is itself untested).
 *
 * L33-01: bases come from `PolicyWeights` when provided; module constants remain default.
 */

import { REGEN_SOFT_LIFE, TAX_LIFE_BUFFER } from './heuristic-weights';

/** The life count `REGEN_SOFT_LIFE` / `TAX_LIFE_BUFFER` were tuned against. */
export const REFERENCE_STARTING_LIVES = 10;

export interface LifeThresholdBases {
  readonly regenSoftLife: number;
  readonly taxLifeBuffer: number;
  readonly referenceStartingLives: number;
}

const MODULE_DEFAULT_BASES: LifeThresholdBases = {
  regenSoftLife: REGEN_SOFT_LIFE,
  taxLifeBuffer: TAX_LIFE_BUFFER,
  referenceStartingLives: REFERENCE_STARTING_LIVES,
};

/** Regen's soft-top-up floor, scaled to `startingLives`. Never below 1. */
export function regenSoftLifeForKit(
  startingLives: number,
  bases: LifeThresholdBases = MODULE_DEFAULT_BASES,
): number {
  return Math.max(
    1,
    Math.round((bases.regenSoftLife * startingLives) / bases.referenceStartingLives),
  );
}

/**
 * Tax's safety buffer, scaled to `startingLives`. Never below 1, and capped at the
 * 10-life tuned value — a high-life kit should Tax more readily, not require an even
 * larger absolute cushion than the value playtest already validated.
 */
export function taxLifeBufferForKit(
  startingLives: number,
  bases: LifeThresholdBases = MODULE_DEFAULT_BASES,
): number {
  return Math.max(
    1,
    Math.min(
      bases.taxLifeBuffer,
      Math.round((bases.taxLifeBuffer * startingLives) / bases.referenceStartingLives),
    ),
  );
}

export function lifeThresholdBasesFromWeights(action: {
  readonly regenSoftLife: number;
  readonly taxLifeBuffer: number;
}, lifeThresholds: { readonly referenceStartingLives: number }): LifeThresholdBases {
  return {
    regenSoftLife: action.regenSoftLife,
    taxLifeBuffer: action.taxLifeBuffer,
    referenceStartingLives: lifeThresholds.referenceStartingLives,
  };
}
