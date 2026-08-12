/**
 * Fitness vs frozen gauntlet on a matchup set — L33-03.
 */

import type { BotPolicy } from '../bots/policy-types';
import { createHeuristicPolicy } from '../bots/policies/create-heuristic-policy';
import type { PolicyWeights } from '../bots/policy-weights';
import { getPolicy } from '../bots/registry';
import { computePolicyWeightsHash } from '../bots/weights-hash';
import { FROZEN_GAUNTLET_POLICY_IDS } from './gauntlet';
import type { FitMatchup } from './fit-split';
import { isStallError } from './run-batch';
import { mirroredKitForSeed } from './run-arena';
import { runSimulatedGame } from './run-game';

export interface FitnessResult {
  readonly wins: number;
  readonly losses: number;
  readonly stalls: number;
  readonly games: number;
  readonly winRate: number;
}

export function evaluateFitnessAgainstGauntlet(
  weights: PolicyWeights,
  matchups: readonly FitMatchup[],
  options: { readonly maxTurns?: number; readonly difficulty?: 'easy' | 'normal' | 'hard' } = {},
): FitnessResult {
  const candidate = createHeuristicPolicy(
    `candidate:${computePolicyWeightsHash(weights)}`,
    weights,
  );
  const difficulty = options.difficulty ?? 'hard';
  let wins = 0;
  let losses = 0;
  let stalls = 0;
  let games = 0;

  for (const opponentId of FROZEN_GAUNTLET_POLICY_IDS) {
    const opponent = getPolicy(opponentId);

    for (const matchup of matchups) {
      const orientations: readonly [BotPolicy, BotPolicy][] = [
        [candidate, opponent],
        [opponent, candidate],
      ];

      for (const [orientationIndex, seatPolicies] of orientations.entries()) {
        games += 1;
        const seed = `${matchup.seed}:ori:${String(orientationIndex)}`;
        const kitAssignment =
          matchup.kitMode === 'mirrored'
            ? (() => {
                const kit = mirroredKitForSeed(seed);
                return [kit, kit] as const;
              })()
            : undefined;

        try {
          const row = runSimulatedGame({
            seed,
            playerCount: 2,
            difficulties: [difficulty, difficulty],
            seatPolicies,
            ...(kitAssignment !== undefined ? { kitAssignment } : {}),
            ...(options.maxTurns !== undefined ? { maxTurns: options.maxTurns } : {}),
          });

          const winnerSeat = row.players.find((player) => player.isWinner);
          const winnerPolicy = winnerSeat !== undefined ? seatPolicies[winnerSeat.seatIndex] : undefined;

          if (winnerPolicy === candidate) {
            wins += 1;
          } else {
            losses += 1;
          }
        } catch (error) {
          if (isStallError(error)) {
            stalls += 1;
            continue;
          }

          // Empty legal-action lists / policy throws count as undecided (not a win).
          if (error instanceof Error) {
            stalls += 1;
            continue;
          }

          throw error;
        }
      }
    }
  }

  const decided = wins + losses;
  return {
    wins,
    losses,
    stalls,
    games,
    winRate: decided === 0 ? 0 : wins / decided,
  };
}
