/**
 * Apply shop buy/sell costs from the catalog — rules spec §1, Lot 2 rulings.
 *
 * Point transfers mutate `points` / ledger. Life transfers use `applyLifeLoss` /
 * `grantLives` so Tax shop never goes through `applyDamage`.
 */

import {
  actionReject,
  type ActionReject,
  type CardCost,
  type GameState,
  type Player,
} from '@card-battle/shared';

import { applyLifeLoss } from '../life/apply-life-loss';
import { observeLifeLoss } from '../life/observe-life-loss';
import { grantLives, grantPoints } from './grant-resources';

export function canAffordCost(player: Player, cost: CardCost): boolean {
  if (cost.pointsPerLife !== undefined) {
    return false;
  }

  const points = cost.points ?? 0;
  const lives = cost.lives ?? 0;

  if (points > 0 && player.points < points) {
    return false;
  }

  if (lives > 0 && player.lives < lives) {
    return false;
  }

  return true;
}

/**
 * Pay a shop or play cost. Life payments require `lives >= amount`
 * (Lot 2: Tax buy rejected below 2).
 */
export function payCost(
  state: GameState,
  player: Player,
  cost: CardCost,
): { ok: true } | ActionReject {
  void state;

  if (cost.pointsPerLife !== undefined) {
    return actionReject('cost-not-shop-transfer');
  }

  if (!canAffordCost(player, cost)) {
    const points = cost.points ?? 0;
    const lives = cost.lives ?? 0;

    if (points > 0 && player.points < points) {
      return actionReject('not-enough-points');
    }

    if (lives > 0 && player.lives < lives) {
      return actionReject('not-enough-lives');
    }

    return actionReject('cannot-afford-cost');
  }

  const points = cost.points ?? 0;
  const lives = cost.lives ?? 0;

  if (points > 0) {
    player.points -= points;
    player.turnLedger.pointsSpent += points;
  }

  if (lives > 0) {
    const outcome = applyLifeLoss(player, lives, 'card-buy');
    player.turnLedger.livesLost += outcome.livesLost;
    observeLifeLoss(state, player, outcome.livesLost);
  }

  return { ok: true };
}

export function grantYield(state: GameState, player: Player, yieldCost: CardCost): void {
  const points = yieldCost.points ?? 0;
  const lives = yieldCost.lives ?? 0;

  if (points > 0) {
    grantPoints(state, player, points, 'direct');
  }

  if (lives > 0) {
    grantLives(state, player, lives, 'direct');
  }
}
