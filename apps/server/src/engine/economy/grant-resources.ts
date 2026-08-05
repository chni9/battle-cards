/**
 * State-aware resource grants — technical spec v4 §4.6, L28-02.
 *
 * Thin wrappers around the kit-agnostic primitives. When `origin === 'direct'`,
 * notify active Duplicators via `observeDirectGain`. Life grants observe
 * post-cap `livesGained`, not the raw amount (#V4-23).
 */

import type { GameState, Player } from '@card-battle/shared';

import { observeDirectGain } from '../kits/observe-direct-gain';
import { gainLives } from '../life/gain-lives';
import type { LifeGainOutcome } from '../life/outcome';
import { gainPoints, type PointGainOrigin } from './gain-points';
import { gainUpgradePoints } from './gain-upgrade-points';

export type { PointGainOrigin };

export function grantPoints(
  state: GameState,
  player: Player,
  amount: number,
  origin: PointGainOrigin,
): void {
  gainPoints(player, amount, origin);

  if (origin === 'direct' && amount > 0) {
    observeDirectGain(state, player.id, 'points', amount);
  }
}

export function grantUpgradePoints(
  state: GameState,
  player: Player,
  amount: number,
  origin: PointGainOrigin,
): void {
  gainUpgradePoints(player, amount, origin);

  if (origin === 'direct' && amount > 0) {
    observeDirectGain(state, player.id, 'upgradePoints', amount);
  }
}

export function grantLives(
  state: GameState,
  player: Player,
  amount: number,
  origin: PointGainOrigin,
): LifeGainOutcome {
  const outcome = gainLives(player, amount, state.lifeLimit);

  if (origin === 'direct' && outcome.livesGained > 0) {
    observeDirectGain(state, player.id, 'lives', outcome.livesGained);
  }

  return outcome;
}
