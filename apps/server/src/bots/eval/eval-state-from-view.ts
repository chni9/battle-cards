/**
 * Eval-oriented state from a per-recipient view — L33-05 one-ply re-rank.
 * Unlike `enumerationStateFromView` (legality stubs with lives: 1), unspied
 * opponents get reference starting lives so Phase A evaluate is not fooled into
 * treating every seat as nearly dead.
 */

import { getKit } from '@card-battle/shared';
import type { GameState, PlayingStateView } from '@card-battle/shared';

import { enumerationStateFromView } from '../../engine/turn/enumeration-state-from-view';

/** Reconstruct a state suitable for 1-ply value estimates (not legality). */
export function evalStateFromView(view: PlayingStateView, seed: string): GameState {
  const state = enumerationStateFromView(view, seed);

  for (const player of state.players) {
    if (player.id === view.you || player.isEliminated) {
      continue;
    }

    const publicPlayer = view.players.find((entry) => entry.id === player.id);
    const spied = publicPlayer?.spied;

    if (spied?.lives !== undefined) {
      continue;
    }

    if (spied?.resourcesSnapshot?.lives !== undefined) {
      continue;
    }

    player.lives = getKit(player.kitId).startingResources.lives;
  }

  return state;
}
