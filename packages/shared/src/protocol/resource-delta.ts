/**
 * Action-log resource nets — PROTOCOL_VERSION 41.
 * Pure helpers shared by the engine (measurement) and the view builder (fog).
 */

import type { PublicActionKind } from './messages';
import type {
  LogPlayerResourceDelta,
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

export function copyPlayerDeltas(
  deltas: readonly LogPlayerResourceDelta[] | undefined,
): { playerDeltas: readonly LogPlayerResourceDelta[] } | Record<string, never> {
  if (deltas === undefined || deltas.length === 0) {
    return {};
  }

  return { playerDeltas: deltas };
}

/**
 * Per-recipient fog for a play line. Self / Spy keep the real nets.
 * Unspied Draw conceals the point gain (`+?`) and hides a bust's life total.
 * Unspied buy-upgrade conceals the point price (`−?`) and keeps `+1` upgrade point.
 * Unspied card sales omit the payout: the amount and the resource kind identify the card.
 * Unspied shop buys omit the price for the same reason. A gain on that line stays.
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

  if (action === 'sellCard') {
    return undefined;
  }

  if (action === 'buyCard') {
    const kept = current.filter((delta) => {
      if (delta.amount === undefined) {
        return delta.direction !== 'loss';
      }

      return delta.amount > 0;
    });
    return kept.length > 0 ? kept : undefined;
  }

  return current.length > 0 ? current : undefined;
}

/**
 * Ghost credits 2 points per life actually lost (rules spec §4). That gain is
 * private, like the rest of the seat's points. Unspied readers keep the life
 * loss and see `+?` instead of the amount. A point loss, or a point gain with
 * no life loss on the same nets, stays.
 */
export function fogGhostLifePointGains(
  deltas: readonly LogResourceDelta[] | undefined,
  seesPrivate: boolean,
): readonly LogResourceDelta[] | undefined {
  const current = deltas ?? [];

  if (current.length === 0) {
    return undefined;
  }

  if (seesPrivate) {
    return current;
  }

  const lostLife = current.some((delta) => delta.kind === 'life' && (delta.amount ?? 0) < 0);
  const points = current.find((delta) => delta.kind === 'point');

  if (
    !lostLife ||
    points === undefined ||
    points.concealed === true ||
    (points.amount ?? 0) <= 0
  ) {
    return current;
  }

  return concealKind(current, 'point', 'gain');
}
