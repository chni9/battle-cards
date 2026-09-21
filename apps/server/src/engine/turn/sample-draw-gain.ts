/**
 * Weighted Gambler Draw payout — rules spec §4, designer 2026-09-21 / L64-03.
 *
 * 5..100 inclusive; weight(n) = 101 - n; total 4656. Independent of the
 * deal/action RNG (golden rule 5): callers inject a dedicated generator.
 */

import { getKit, type GameState, type Player } from '@card-battle/shared';

import { createRng, type Rng } from '../rng';

export function sampleWeightedDrawGain(rng: Rng): number {
  let ticket = rng.nextInt(4656);
  for (let gain = 5; gain <= 100; gain += 1) {
    const weight = 101 - gain;
    if (ticket < weight) {
      return gain;
    }
    ticket -= weight;
  }
  return 100;
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
