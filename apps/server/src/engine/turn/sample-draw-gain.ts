/**
 * Truncated-geometric Gambler Draw payout — rules spec §4,
 * designer 2026-09-21 correction.
 *
 * Integers 5..100 inclusive; P(n) ∝ r^(n − 5) with r = 10^(-1/16) so
 * P(n > 20) ≤ 0.10. Integer weights are `round(SCALE · r^(n − 5))` and
 * sampled with `nextInt(total)` (rejection sampler, no modulo bias).
 * Independent of the deal/action RNG (golden rule 5): callers inject a
 * dedicated generator. Bust stays 1-in-10.
 */

import { getKit, type GameState, type Player } from '@card-battle/shared';

import { createRng, type Rng } from '../rng';

/** Designer closed form: r^16 ≈ 0.10, r = 10^(-1/16) ≈ 0.8660. */
export const DRAW_GAIN_RATIO = 10 ** (-1 / 16);
export const DRAW_GAIN_MIN = 5;
export const DRAW_GAIN_MAX = 100;

/**
 * Large enough that 100 still has weight ≥ 1, small enough that the ticket
 * total stays inside `nextInt`'s 2^32 bound.
 */
const DRAW_GAIN_WEIGHT_SCALE = 100_000_000;

function buildDrawGainTickets(): { readonly weights: readonly number[]; readonly total: number } {
  const weights: number[] = [];
  let total = 0;

  for (let gain = DRAW_GAIN_MIN; gain <= DRAW_GAIN_MAX; gain += 1) {
    const weight = Math.round(DRAW_GAIN_WEIGHT_SCALE * DRAW_GAIN_RATIO ** (gain - DRAW_GAIN_MIN));
    weights.push(weight);
    total += weight;
  }

  return { weights, total };
}

const DRAW_GAIN_TICKETS = buildDrawGainTickets();

/** Ticket count passed to `nextInt`; last ticket (`total - 1`) maps to 100. */
export const DRAW_GAIN_TICKET_COUNT = DRAW_GAIN_TICKETS.total;

export function sampleWeightedDrawGain(rng: Rng): number {
  let ticket = rng.nextInt(DRAW_GAIN_TICKET_COUNT);
  for (let index = 0; index < DRAW_GAIN_TICKETS.weights.length; index += 1) {
    const weight = DRAW_GAIN_TICKETS.weights[index];
    if (weight === undefined) {
      return DRAW_GAIN_MAX;
    }
    if (ticket < weight) {
      return DRAW_GAIN_MIN + index;
    }
    ticket -= weight;
  }
  return DRAW_GAIN_MAX;
}

/**
 * Roll the living Gambler's Draw payout for this turn. Uses
 * `${state.seed}:draw-gain:${player.id}:${state.turnSequence}` so it never
 * consumes the deal/action generator. No-op (and clears leftover) when the
 * kit has no Draw bust.
 */
export function rollDrawGain(state: GameState, player: Player): void {
  const kit = getKit(player.kitId);
  if (kit.traits.drawBustDenominator === undefined) {
    delete player.drawGain;
    return;
  }

  const rng = createRng(`${state.seed}:draw-gain:${player.id}:${String(state.turnSequence)}`);
  player.drawGain = sampleWeightedDrawGain(rng);
}
