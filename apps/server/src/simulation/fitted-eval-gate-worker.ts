/**
 * Worker: search+fitted vs search+linear seat-rotated games — L37-04.
 */

import { parentPort } from 'node:worker_threads';

import type { BotPolicy } from '../bots/policy-types';
import {
  createFittedGatePolicies,
  type FittedEvalGateInbound,
  type FittedEvalGateOutbound,
} from './fitted-eval-gate-shared';
import type { FitMatchup } from './fit-split';
import type { FitnessResult } from './fitness-gauntlet';
import { isStallError } from './run-batch';
import { mirroredKitForSeed } from './run-arena';
import { runSimulatedGame } from './run-game';

if (parentPort === null) {
  throw new Error('fitted-eval-gate-worker must run as a worker thread');
}

const port = parentPort;

function evaluateFittedVsLinear(
  matchups: readonly FitMatchup[],
  linearProfileId: string,
  fittedProfileId: string,
  searchIterations: number,
  prior: FittedEvalGateInbound['prior'],
  maxTurns: number | undefined,
): FitnessResult {
  const { linear, fitted } = createFittedGatePolicies(
    linearProfileId,
    fittedProfileId,
    prior,
  );

  let wins = 0;
  let losses = 0;
  let stalls = 0;
  let games = 0;

  for (const matchup of matchups) {
    const orientations: readonly [BotPolicy, BotPolicy][] = [
      [fitted, linear],
      [linear, fitted],
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
          difficulties: ['hard', 'hard'],
          seatPolicies,
          searchIterations,
          ...(kitAssignment !== undefined ? { kitAssignment } : {}),
          ...(maxTurns !== undefined ? { maxTurns } : {}),
        });

        const winnerSeat = row.players.find((player) => player.isWinner);
        const winnerPolicy =
          winnerSeat !== undefined ? seatPolicies[winnerSeat.seatIndex] : undefined;

        if (winnerPolicy === fitted) {
          wins += 1;
        } else {
          losses += 1;
        }
      } catch (error) {
        if (isStallError(error) || error instanceof Error) {
          stalls += 1;
          continue;
        }

        throw error;
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

port.on('message', (message: FittedEvalGateInbound | { readonly type: 'ping'; readonly id: number }) => {
  try {
    if (message.type === 'ping') {
      return;
    }

    const result = evaluateFittedVsLinear(
      message.matchups,
      message.linearProfileId,
      message.fittedProfileId,
      message.searchIterations,
      message.prior,
      message.maxTurns,
    );
    port.postMessage({
      type: 'result',
      id: message.id,
      result,
    } satisfies FittedEvalGateOutbound);
  } catch (error) {
    port.postMessage({
      type: 'error',
      id: message.id,
      message: error instanceof Error ? error.message : String(error),
    } satisfies FittedEvalGateOutbound);
  }
});
