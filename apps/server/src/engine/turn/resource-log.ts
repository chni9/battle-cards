/**
 * Measure resource nets for the action log — PROTOCOL_VERSION 40.
 *
 * The actor's play-line suffix is a snapshot diff taken before resolution.
 * Duplicator copies are recorded separately (Spy-gated). Persistent ticks are
 * a second diff after `applyPersistentEffects`, with copies subtracted so a
 * public line never reveals a Duplicator's kit.
 */

import {
  logResourceDeltasFromNets,
  subtractDuplicatedGains,
  type GameState,
  type LogResourceDelta,
  type LogResourceKind,
  type Player,
  type ResourceChangeLogEntry,
  type ResourceNets,
} from '@card-battle/shared';

export interface DuplicatedGainRecord {
  playerId: string;
  kind: LogResourceKind;
  amount: number;
}

const duplicatedGains = new WeakMap<GameState, DuplicatedGainRecord[]>();
const actorBaselines = new WeakMap<GameState, ResourceNets>();

export function snapshotPlayerResources(player: Player): ResourceNets {
  return {
    lives: player.lives,
    points: player.points,
    upgradePoints: player.upgradePoints,
    shield: player.shield,
  };
}

export function snapshotAllResources(state: GameState): Map<string, ResourceNets> {
  return new Map(state.players.map((player) => [player.id, snapshotPlayerResources(player)]));
}

/** Baseline for the acting player's play-line diff. Consumed by the stamp. */
export function setActorResourceBaseline(state: GameState, snapshot: ResourceNets): void {
  actorBaselines.set(state, snapshot);
}

export function takeActorResourceBaseline(state: GameState): ResourceNets | undefined {
  const snapshot = actorBaselines.get(state);
  actorBaselines.delete(state);
  return snapshot;
}

export function recordDuplicatedGain(state: GameState, record: DuplicatedGainRecord): void {
  const list = duplicatedGains.get(state);

  if (list === undefined) {
    duplicatedGains.set(state, [record]);
    return;
  }

  list.push(record);
}

export function takeDuplicatedGains(state: GameState): DuplicatedGainRecord[] {
  const list = duplicatedGains.get(state) ?? [];
  duplicatedGains.delete(state);
  return list;
}

export function duplicatedGainMark(state: GameState): number {
  return duplicatedGains.get(state)?.length ?? 0;
}

export function duplicatedGainsSince(
  state: GameState,
  mark: number,
): DuplicatedGainRecord[] {
  return (duplicatedGains.get(state) ?? []).slice(mark);
}

/**
 * Per-seat nets since `before`, with Duplicator copies recorded after `mark`
 * removed. Copies stay in the scratch list for the later Spy-gated line.
 */
export function playerDeltasSince(
  state: GameState,
  before: ReadonlyMap<string, ResourceNets>,
  mark: number,
): { playerId: string; deltas: LogResourceDelta[] }[] {
  const copies = duplicatedGainsSince(state, mark);
  const entries: { playerId: string; deltas: LogResourceDelta[] }[] = [];

  for (const player of state.players) {
    const prior = before.get(player.id);
    if (prior === undefined) {
      continue;
    }

    const raw = deltasFromSnapshots(prior, snapshotPlayerResources(player));
    const mine = copies.filter((copy) => copy.playerId === player.id);
    const deltas = subtractDuplicatedGains(raw, mine);

    if (deltas.length > 0) {
      entries.push({ playerId: player.id, deltas });
    }
  }

  return entries;
}

export function deltasFromSnapshots(before: ResourceNets, after: ResourceNets): LogResourceDelta[] {
  return logResourceDeltasFromNets({
    lives: after.lives - before.lives,
    points: after.points - before.points,
    upgradePoints: after.upgradePoints - before.upgradePoints,
    shield: after.shield - before.shield,
  });
}

function resourceChange(
  playerId: string,
  turnSequence: number,
  deltas: readonly LogResourceDelta[],
  duplicated: boolean,
): ResourceChangeLogEntry {
  return {
    kind: 'resourceChange',
    playerId,
    turnSequence,
    deltas,
    ...(duplicated ? { duplicated: true as const } : {}),
  };
}

/** One Spy-gated line per player, nets summed per resource. */
export function duplicatedResourceChanges(
  copies: readonly DuplicatedGainRecord[],
  turnSequence: number,
): ResourceChangeLogEntry[] {
  const byPlayer = new Map<string, Record<LogResourceKind, number>>();

  for (const copy of copies) {
    if (copy.amount === 0) {
      continue;
    }

    const row = byPlayer.get(copy.playerId) ?? {
      life: 0,
      point: 0,
      upgradePoint: 0,
      shield: 0,
    };
    row[copy.kind] += copy.amount;
    byPlayer.set(copy.playerId, row);
  }

  const entries: ResourceChangeLogEntry[] = [];

  for (const [playerId, row] of byPlayer) {
    const deltas = logResourceDeltasFromNets({
      lives: row.life,
      points: row.point,
      upgradePoints: row.upgradePoint,
      shield: row.shield,
    });

    if (deltas.length > 0) {
      entries.push(resourceChange(playerId, turnSequence, deltas, true));
    }
  }

  return entries;
}

/**
 * Public persistent-tick lines. Duplicator copies in `copies` are removed
 * from the snapshot net so they only appear on the Spy-gated line.
 */
export function publicPersistentChanges(
  state: GameState,
  before: ReadonlyMap<string, ResourceNets>,
  copies: readonly DuplicatedGainRecord[],
  turnSequence: number,
): ResourceChangeLogEntry[] {
  const entries: ResourceChangeLogEntry[] = [];

  for (const player of state.players) {
    const prior = before.get(player.id);
    if (prior === undefined) {
      continue;
    }

    const raw = deltasFromSnapshots(prior, snapshotPlayerResources(player));
    const mine = copies.filter((copy) => copy.playerId === player.id);
    const deltas = subtractDuplicatedGains(raw, mine);

    if (deltas.length > 0) {
      entries.push(resourceChange(player.id, turnSequence, deltas, false));
    }
  }

  return entries;
}

/**
 * Attach the actor's play-line nets and any Duplicator copies from the
 * action window. Consumes the baseline and the copy scratch.
 */
export function stampPlayedWindow<T extends { turnSequence: number }>(
  state: GameState,
  actor: Player,
  actionPlayed: T,
): { actionPlayed: T & { resourceDeltas?: readonly LogResourceDelta[] }; playedResourceChanges: ResourceChangeLogEntry[] } {
  const before = takeActorResourceBaseline(state);
  const copies = takeDuplicatedGains(state);
  const playedResourceChanges = duplicatedResourceChanges(copies, actionPlayed.turnSequence);

  if (before === undefined) {
    return { actionPlayed, playedResourceChanges };
  }

  const raw = deltasFromSnapshots(before, snapshotPlayerResources(actor));
  const actorCopies = copies.filter((copy) => copy.playerId === actor.id);
  const deltas = subtractDuplicatedGains(raw, actorCopies);

  if (deltas.length === 0) {
    return { actionPlayed, playedResourceChanges };
  }

  return {
    actionPlayed: { ...actionPlayed, resourceDeltas: deltas },
    playedResourceChanges,
  };
}
