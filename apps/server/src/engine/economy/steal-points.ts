/**
 * Steal points from a target — rules spec §3 Thief.
 *
 * Writes theft on the target's turn ledger so Absorber never confuses it with spend
 * (technical spec §4.4). Extra points from an upgraded double are created, not taken.
 */

import type { GameState, Player } from '@card-battle/shared';

import { findPlayer } from '../turn/advance-turn';

export interface StealPointsInput {
  state: GameState;
  sourcePlayerId: string;
  targetPlayerId: string;
  /** Requested steal before cap (Thief base: 10). */
  amount: number;
  /** 1 base, 2 upgraded Thief. */
  gainMultiplier: number;
}

export interface StealPointsOutcome {
  taken: number;
  gained: number;
}

export function stealPoints(input: StealPointsInput): StealPointsOutcome {
  const source = findPlayer(input.state, input.sourcePlayerId);
  const target = findPlayer(input.state, input.targetPlayerId);

  if (source === undefined || target === undefined) {
    throw new Error('stealPoints: unknown source or target');
  }

  return stealPointsBetween(source, target, input.amount, input.gainMultiplier);
}

function stealPointsBetween(
  source: Player,
  target: Player,
  amount: number,
  gainMultiplier: number,
): StealPointsOutcome {
  if (amount < 0 || gainMultiplier < 1) {
    throw new RangeError('stealPoints: invalid amount or multiplier');
  }

  const taken = Math.min(amount, target.points);
  target.points -= taken;
  target.turnLedger.pointsLostToTheft += taken;

  const gained = taken * gainMultiplier;
  source.points += gained;

  return { taken, gained };
}
