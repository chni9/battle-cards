/**
 * Determinize a `PlayingStateView` into a plausible `GameState` — technical spec
 * v5 §4.2 (L34-05). Public skeleton from `enumerationStateFromView`; hidden
 * fields from L34-02…04. **No `GameState` parameter. Ever.**
 *
 * `determinizeFromView` = `inferBelief` (posteriors + intervals) then
 * `sampleDeterminizedState` (kit / resources / hand). Spy slices on this
 * recipient's view only (#V4-35). `visibility` is reconstructed from
 * `view.players[].spied` so `buildPlayingViewFor` on the sample still
 * exposes those relations (L40-01) — never anyone else's Spy map.
 */

import {
  CLASSIC_LIFE_LIMIT,
  KIT_IDS,
  type ActionLogEntryView,
  type GameState,
  type KitId,
  type Player,
  type PlayingStateView,
  type PublicPlayerView,
  type SpyRelation,
} from '@card-battle/shared';

import { enumerationStateFromView } from '../../engine/turn/enumeration-state-from-view';
import type { Rng } from '../../engine/rng';
import { uniformZonePrior } from './hand-prior';
import { accountOpponentHandSizes, sampleOpponentHandAndSpecials } from './hands';
import { kitPosteriorForOpponent, sampleKit } from './kit-posterior';
import {
  buildBeliefSummary,
  reconstructOpponentResources,
  sampleFromInterval,
} from './resources';
import type {
  BeliefState,
  HandSizeBelief,
  KitPosterior,
  OpponentResourceBelief,
} from './types';

export type { BeliefState } from './types';

const UNIT_DRAW_SPAN = 1_000_000;

function isCompletePosterior(
  value: Partial<Record<KitId, number>>,
): value is Record<KitId, number> {
  return KIT_IDS.every((kitId) => typeof value[kitId] === 'number');
}

function pointMassPosterior(kitId: KitId): KitPosterior {
  const out: Partial<Record<KitId, number>> = {};

  for (const id of KIT_IDS) {
    out[id] = id === kitId ? 1 : 0;
  }

  if (!isCompletePosterior(out)) {
    throw new Error('determinize: incomplete kit posterior');
  }

  return out;
}

function mapKitId(posterior: KitPosterior): KitId {
  let bestId: KitId | undefined;
  let bestMass = Number.NEGATIVE_INFINITY;

  for (const kitId of KIT_IDS) {
    const mass = posterior[kitId];

    if (mass > bestMass) {
      bestMass = mass;
      bestId = kitId;
    }
  }

  if (bestId === undefined) {
    throw new Error('determinize: empty KIT_IDS');
  }

  return bestId;
}

function posteriorForOpponent(
  publicPlayer: PublicPlayerView,
  view: PlayingStateView,
  log: readonly ActionLogEntryView[],
): KitPosterior {
  const revealedKitId = publicPlayer.eliminationReveal?.kitId;

  if (revealedKitId !== undefined) {
    return pointMassPosterior(revealedKitId);
  }

  return kitPosteriorForOpponent(publicPlayer.id, view, log);
}

function unitDraw(rng: Rng): { next: () => number } {
  return {
    next: (): number => rng.nextInt(UNIT_DRAW_SPAN) / UNIT_DRAW_SPAN,
  };
}

function overlayPublicShield(player: Player, publicPlayer: PublicPlayerView): void {
  const active = publicPlayer.activeShield;

  if (active === null) {
    player.shield = 0;
    player.shieldIsUpgraded = false;
    return;
  }

  player.shieldIsUpgraded = active.isUpgraded;

  if (player.shield <= 0) {
    const spied = publicPlayer.spied;
    const amount = spied?.shield ?? spied?.resourcesSnapshot?.shield ?? 1;
    player.shield = amount > 0 ? amount : 1;
  }
}

function overlayEliminatedReveal(player: Player, publicPlayer: PublicPlayerView): void {
  const reveal = publicPlayer.eliminationReveal;

  if (reveal === undefined) {
    return;
  }

  player.kitId = reveal.kitId;
  player.lives = reveal.lives;
  player.points = reveal.points;
  player.upgradePoints = reveal.upgradePoints;
  player.eliminationSnapshot = {
    kitId: reveal.kitId,
    hand: reveal.hand.map((card) => ({ ...card })),
    specialCards: reveal.specialCards.map((card) => ({ ...card })),
    lives: reveal.lives,
    points: reveal.points,
    upgradePoints: reveal.upgradePoints,
    shield: reveal.shield,
    shieldIsUpgraded: reveal.shieldIsUpgraded,
    turnSequence: reveal.turnSequence,
  };
}

function publicPlayerOf(
  view: PlayingStateView,
  playerId: string,
): PublicPlayerView | undefined {
  return view.players.find((player) => player.id === playerId);
}

/**
 * Posteriors + intervals for every opponent seat. No sampling.
 */
export function inferBelief(
  view: PlayingStateView,
  log: readonly ActionLogEntryView[],
): BeliefState {
  const kitPosteriorByOpponentId: Record<string, KitPosterior> = {};
  const resourcesByOpponentId: Record<string, OpponentResourceBelief> = {};
  const handSizesByOpponentId: Record<string, HandSizeBelief> = {};
  const kitByOpponentId = new Map<string, KitId>();

  for (const publicPlayer of view.players) {
    if (publicPlayer.id === view.you) {
      continue;
    }

    const posterior = posteriorForOpponent(publicPlayer, view, log);
    const kitId = mapKitId(posterior);
    kitPosteriorByOpponentId[publicPlayer.id] = posterior;
    kitByOpponentId.set(publicPlayer.id, kitId);
    resourcesByOpponentId[publicPlayer.id] = reconstructOpponentResources(
      publicPlayer.id,
      kitId,
      view,
      log,
      CLASSIC_LIFE_LIMIT,
    );
    handSizesByOpponentId[publicPlayer.id] = accountOpponentHandSizes(
      publicPlayer.id,
      kitId,
      view,
      log,
    );
  }

  return {
    perspectivePlayerId: view.you,
    kitPosteriorByOpponentId,
    resourcesByOpponentId,
    handSizesByOpponentId,
    summary: buildBeliefSummary(
      view.you,
      view,
      log,
      kitByOpponentId,
      CLASSIC_LIFE_LIMIT,
    ),
  };
}

/**
 * This recipient's Spy map only (#V4-35 / L40-01). Built from the view so
 * `determinizeFromView` still takes no `GameState`.
 */
export function visibilityFromActingView(view: PlayingStateView): SpyRelation[] {
  const relations: SpyRelation[] = [];

  for (const player of view.players) {
    if (player.id === view.you) {
      continue;
    }

    const spied = player.spied;

    if (spied === undefined) {
      continue;
    }

    const snapshot = spied.resourcesSnapshot;
    const liveSnapshot =
      spied.lives !== undefined
        ? {
            lives: spied.lives,
            points: spied.points ?? 0,
            upgradePoints: spied.upgradePoints ?? 0,
            shield: spied.shield ?? 0,
            turnSequence: view.turnSequence,
          }
        : undefined;
    const resourcesSnapshot = snapshot ?? liveSnapshot;
    const level = spied.lives !== undefined ? 'full-resources' : 'kit-and-cards';

    relations.push({
      viewerId: view.you,
      subjectId: player.id,
      level,
      ...(resourcesSnapshot !== undefined ? { resourcesSnapshot } : {}),
    });
  }

  return relations;
}

/**
 * Sample one world from `belief` onto the public skeleton. Spy-revealed
 * kit / hand / resources are point masses and copied as a point.
 */
export function sampleDeterminizedState(
  belief: BeliefState,
  view: PlayingStateView,
  log: readonly ActionLogEntryView[],
  rng: Rng,
): GameState {
  const seed = `determinize:${view.gameCode}:${view.you}:${String(view.turnSequence)}:${String(rng.nextInt(2 ** 31))}`;
  const state = enumerationStateFromView(view, seed);
  const unit = unitDraw(rng);

  for (const player of state.players) {
    if (player.id === view.you) {
      continue;
    }

    const publicPlayer = publicPlayerOf(view, player.id);

    if (publicPlayer === undefined) {
      continue;
    }

    if (publicPlayer.isEliminated) {
      overlayEliminatedReveal(player, publicPlayer);
      overlayPublicShield(player, publicPlayer);
      continue;
    }

    const posterior =
      belief.kitPosteriorByOpponentId[player.id] ??
      posteriorForOpponent(publicPlayer, view, log);
    const kitId = sampleKit(posterior, rng);
    const resources = reconstructOpponentResources(
      player.id,
      kitId,
      view,
      log,
      CLASSIC_LIFE_LIMIT,
    );
    const sizes = accountOpponentHandSizes(player.id, kitId, view, log);
    const sampled = sampleOpponentHandAndSpecials({
      opponentPlayerId: player.id,
      kitId,
      view,
      log,
      sizes,
      prior: uniformZonePrior,
      rng,
    });

    player.kitId = kitId;
    player.lives = sampleFromInterval(resources.lives, unit);
    player.points = sampleFromInterval(resources.points, unit);
    player.upgradePoints = sampleFromInterval(resources.upgradePoints, unit);
    player.hand = sampled.hand;
    player.specialCards = sampled.specialCards;
    overlayPublicShield(player, publicPlayer);
  }

  state.visibility = visibilityFromActingView(view);
  return state;
}

/**
 * View + public log → a plausible full `GameState`. No `GameState` in.
 */
export function determinizeFromView(
  view: PlayingStateView,
  log: readonly ActionLogEntryView[],
  rng: Rng,
): GameState {
  return sampleDeterminizedState(inferBelief(view, log), view, log, rng);
}
