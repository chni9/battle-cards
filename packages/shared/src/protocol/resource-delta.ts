/**
 * Action-log resource nets — PROTOCOL_VERSION 40.
 * Pure helpers shared by the engine (measurement) and the view builder (fog).
 */

import type { PublicActionKind } from './messages';
import type {
  LogResourceDelta,
  LogResourceDirection,
  LogResourceKind,
} from './state-view';

export interface ResourceNets {
  lives: number;
  points: number;
  upgradePoints: number;
  shield: number;
}

const KIND_ORDER: readonly LogResourceKind[] = [
  'life',
  'point',
  'upgradePoint',
  'shield',
];

/** Drop zeros. Order is lives, points, upgrade points, shield. */
export function logResourceDeltasFromNets(nets: ResourceNets): LogResourceDelta[] {
  const amounts: Record<LogResourceKind, number> = {
    life: nets.lives,
    point: nets.points,
    upgradePoint: nets.upgradePoints,
    shield: nets.shield,
  };
  const deltas: LogResourceDelta[] = [];

  for (const kind of KIND_ORDER) {
    const amount = amounts[kind];
    if (amount !== 0) {
      deltas.push({ kind, amount });
    }
  }

  return deltas;
}

/**
 * Remove duplicated-gain amounts from a snapshot net.
 * A copy of +10 against a net of +7 leaves −3 (the non-copy change).
 */
export function subtractDuplicatedGains(
  deltas: readonly LogResourceDelta[],
  copies: readonly { kind: LogResourceKind; amount: number }[],
): LogResourceDelta[] {
  const nets: Record<LogResourceKind, number> = {
    life: 0,
    point: 0,
    upgradePoint: 0,
    shield: 0,
  };

  for (const delta of deltas) {
    if (delta.amount !== undefined) {
      nets[delta.kind] += delta.amount;
    }
  }

  for (const copy of copies) {
    nets[copy.kind] -= copy.amount;
  }

  return logResourceDeltasFromNets({
    lives: nets.life,
    points: nets.point,
    upgradePoints: nets.upgradePoint,
    shield: nets.shield,
  });
}

export function copyResourceDeltas(
  deltas: readonly LogResourceDelta[] | undefined,
): { resourceDeltas: readonly LogResourceDelta[] } | Record<string, never> {
  if (deltas === undefined || deltas.length === 0) {
    return {};
  }

  return { resourceDeltas: deltas };
}

function withoutKind(
  deltas: readonly LogResourceDelta[],
  kind: LogResourceKind,
): LogResourceDelta[] {
  return deltas.filter((delta) => delta.kind !== kind);
}

function concealKind(
  deltas: readonly LogResourceDelta[],
  kind: LogResourceKind,
  direction: LogResourceDirection,
): LogResourceDelta[] {
  const concealed: LogResourceDelta = { kind, concealed: true, direction };
  const rest = withoutKind(deltas, kind);
  return sortDeltas([...rest, concealed]);
}

function sortDeltas(deltas: readonly LogResourceDelta[]): LogResourceDelta[] {
  return [...deltas].sort(
    (left, right) => KIND_ORDER.indexOf(left.kind) - KIND_ORDER.indexOf(right.kind),
  );
}

/**
 * Per-recipient fog for a play line. Self / Spy keep the real nets.
 * Unspied Draw conceals the point gain (`+?`) and hides a bust's life total.
 * Unspied buy-upgrade conceals the point price (`−?`) and keeps `+1` upgrade point.
 */
export function fogPlayedResourceDeltas(
  action: PublicActionKind,
  deltas: readonly LogResourceDelta[] | undefined,
  seesPrivate: boolean,
  drawBust: boolean,
): readonly LogResourceDelta[] | undefined {
  const current = deltas ?? [];

  if (seesPrivate) {
    return current.length > 0 ? current : undefined;
  }

  if (action === 'draw') {
    if (drawBust) {
      const hidden = withoutKind(withoutKind(current, 'life'), 'point');
      return hidden.length > 0 ? hidden : undefined;
    }

    const points = current.find((delta) => delta.kind === 'point');
    if (points === undefined) {
      return current.length > 0 ? current : undefined;
    }

    return concealKind(current, 'point', 'gain');
  }

  if (action === 'buyUpgradePoint') {
    return concealKind(current, 'point', 'loss');
  }

  return current.length > 0 ? current : undefined;
}
