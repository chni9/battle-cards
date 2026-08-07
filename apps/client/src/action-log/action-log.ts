/**
 * Pure helpers for the browsable public action log (technical spec §7, L9-02).
 * No rule logic — formatting and filter only.
 */

import {
  formatCardLabel,
  getKit,
  isAttackCardId,
  type ActionLogEntryKind,
  type ActionLogEntryView,
} from '@card-battle/shared';

export const ACTION_LOG_KINDS: readonly ActionLogEntryKind[] = [
  'actionPlayed',
  'actionResolved',
  'playerEliminated',
  'mirrorRedirected',
  'curseTransferred',
  'playerReanimated',
  'rewardsClaimed',
] as const;

export interface ActionLogFilters {
  playerId: string | null;
  kinds: ReadonlySet<ActionLogEntryKind>;
  query: string;
}

export type NicknameResolver = (playerId: string) => string;

function formatPlayedAction(
  entry: Extract<ActionLogEntryView, { kind: 'actionPlayed' }>,
  nicknameOf: NicknameResolver,
): string {
  const actor = nicknameOf(entry.actorPlayerId);

  switch (entry.action) {
    case 'draw':
      return `${actor} draws`;
    case 'buyCard':
      return `${actor} bought a card`;
    case 'sellCard':
      return `${actor} sold a card`;
    case 'upgradeCard':
      return `${actor} upgraded a card`;
    case 'buySpecialCard':
      return `${actor} bought a special card`;
    case 'buyUpgradePoint':
      return `${actor} bought an upgrade point`;
    case 'sellUpgradePoint':
      return `${actor} sold an upgrade point`;
    case 'deactivatePersistent':
      return `${actor} deactivated ${entry.cardId !== undefined ? formatCardLabel(entry.cardId, entry.isUpgraded ?? false) : 'a persistent'}`;
    case 'activateDuplication':
      return `${actor} activated duplication`;
    case 'playMultipleAttacks': {
      if (entry.attacks === undefined || entry.attacks.length === 0) {
        return `${actor} plays multiple attacks`;
      }
      const parts = entry.attacks.map(
        (attack) =>
          `${formatCardLabel(attack.cardId, attack.isUpgraded)} against ${nicknameOf(attack.targetPlayerId)}`,
      );
      return `${actor} attacks with ${parts.join(', ')}`;
    }
    case 'playCard': {
      const id = entry.cardId;
      if (id === undefined) {
        return `${actor} plays a card`;
      }
      const name = formatCardLabel(id, entry.isUpgraded === true);
      const targetId = entry.targetPlayerId;
      if (targetId !== undefined) {
        const target = nicknameOf(targetId);
        if (isAttackCardId(id)) {
          return `${actor} attacks ${target} with ${name}`;
        }
        return `${actor} plays ${name} on ${target}`;
      }
      if (isAttackCardId(id)) {
        return `${actor} attacks with ${name}`;
      }
      return `${actor} plays ${name}`;
    }
    default: {
      const _exhaustive: never = entry.action;
      return _exhaustive;
    }
  }
}

export function formatActionLogEntry(
  entry: ActionLogEntryView,
  nicknameOf: NicknameResolver,
): string {
  switch (entry.kind) {
    case 'actionPlayed':
      return formatPlayedAction(entry, nicknameOf);
    case 'actionResolved': {
      const source = nicknameOf(entry.sourcePlayerId);
      const target = nicknameOf(entry.targetPlayerId);
      const name = formatCardLabel(entry.cardId, entry.isUpgraded);
      switch (entry.outcome) {
        case 'immune':
          return `${name} from ${source} resolves on ${target} — immune`;
        case 'cancelled':
          return `${name} from ${source} against ${target} is cancelled`;
        case 'blocked':
          return `${name} from ${source} against ${target} is blocked`;
        case 'applied': {
          const shield =
            entry.shieldAbsorbed > 0
              ? `, ${String(entry.shieldAbsorbed)} absorbed by shield`
              : '';
          if (isAttackCardId(entry.cardId) || entry.livesLost > 0) {
            return `${source}'s ${name} hits ${target} (−${String(entry.livesLost)} life${shield})`;
          }
          if (entry.shieldAbsorbed > 0) {
            return `${name} from ${source} resolves on ${target} (${String(entry.shieldAbsorbed)} absorbed by shield)`;
          }
          return `${name} from ${source} resolves on ${target}`;
        }
        default: {
          const _exhaustive: never = entry.outcome;
          return _exhaustive;
        }
      }
    }
    case 'playerEliminated': {
      const victim = nicknameOf(entry.playerId);
      const by =
        entry.eliminatorPlayerId !== null
          ? ` by ${nicknameOf(entry.eliminatorPlayerId)}`
          : '';
      const reasonLabel: Record<typeof entry.reason, string> = {
        combat: 'in combat',
        absence: 'by absence',
        inactivity: 'by inactivity',
        leave: 'after leaving',
      };
      return `${victim} is eliminated${by} ${reasonLabel[entry.reason]}`;
    }
    case 'mirrorRedirected': {
      const actor = nicknameOf(entry.actorPlayerId);
      const from = nicknameOf(entry.previousTargetPlayerId);
      const to = nicknameOf(entry.newTargetPlayerId);
      return `${actor} redirects ${formatCardLabel(entry.cardId, false)} from ${from} to ${to}`;
    }
    case 'curseTransferred': {
      const from = nicknameOf(entry.fromPlayerId);
      const to = nicknameOf(entry.toPlayerId);
      return `${from} passes ${formatCardLabel(entry.cardId, entry.isUpgraded)} to ${to}`;
    }
    case 'playerReanimated': {
      const player = nicknameOf(entry.playerId);
      if (entry.kitId === undefined) {
        return `${player} returns`;
      }
      const kitName = getKit(entry.kitId).name;
      return `${player} returns with ${kitName}`;
    }
    case 'rewardsClaimed': {
      const eliminator = nicknameOf(entry.eliminatorPlayerId);
      const eliminated = nicknameOf(entry.eliminatedPlayerId);
      return `${eliminator} claims elimination rewards from ${eliminated}`;
    }
    default: {
      const _exhaustive: never = entry;
      return _exhaustive;
    }
  }
}

export function entryInvolvesPlayer(entry: ActionLogEntryView, playerId: string): boolean {
  switch (entry.kind) {
    case 'actionPlayed':
      return (
        entry.actorPlayerId === playerId ||
        entry.targetPlayerId === playerId ||
        (entry.attacks?.some((attack) => attack.targetPlayerId === playerId) ?? false)
      );
    case 'actionResolved':
      return entry.sourcePlayerId === playerId || entry.targetPlayerId === playerId;
    case 'playerEliminated':
      return entry.playerId === playerId || entry.eliminatorPlayerId === playerId;
    case 'mirrorRedirected':
      return (
        entry.actorPlayerId === playerId ||
        entry.previousTargetPlayerId === playerId ||
        entry.newTargetPlayerId === playerId
      );
    case 'curseTransferred':
      return entry.fromPlayerId === playerId || entry.toPlayerId === playerId;
    case 'playerReanimated':
      return entry.playerId === playerId;
    case 'rewardsClaimed':
      return entry.eliminatorPlayerId === playerId || entry.eliminatedPlayerId === playerId;
    default: {
      const _exhaustive: never = entry;
      return _exhaustive;
    }
  }
}

export function filterActionLog(
  entries: readonly ActionLogEntryView[],
  filters: ActionLogFilters,
  nicknameOf: NicknameResolver,
): ActionLogEntryView[] {
  const query = filters.query.trim().toLowerCase();

  return entries.filter((entry) => {
    if (!filters.kinds.has(entry.kind)) {
      return false;
    }

    if (filters.playerId !== null && !entryInvolvesPlayer(entry, filters.playerId)) {
      return false;
    }

    if (query.length === 0) {
      return true;
    }

    return formatActionLogEntry(entry, nicknameOf).toLowerCase().includes(query);
  });
}

export interface TurnGroup {
  turnSequence: number;
  entries: ActionLogEntryView[];
}

export function groupByTurn(entries: readonly ActionLogEntryView[]): TurnGroup[] {
  const groups: TurnGroup[] = [];

  for (const entry of entries) {
    const last = groups[groups.length - 1];

    if (last?.turnSequence !== entry.turnSequence) {
      groups.push({ turnSequence: entry.turnSequence, entries: [entry] });
      continue;
    }

    last.entries.push(entry);
  }

  return groups;
}

/**
 * Table round = one full cycle of seats (rules “table round” = until the table
 * comes back around). Derived for UI only: floor(turnSequence / seatCount) + 1.
 */
export interface RoundGroup {
  round: number;
  entries: ActionLogEntryView[];
}

export function roundOfTurn(turnSequence: number, seatCount: number): number {
  const n = Math.max(1, seatCount);
  return Math.floor(turnSequence / n) + 1;
}

export function groupByRound(
  entries: readonly ActionLogEntryView[],
  seatCount: number,
): RoundGroup[] {
  const groups: RoundGroup[] = [];

  for (const entry of entries) {
    const round = roundOfTurn(entry.turnSequence, seatCount);
    const last = groups[groups.length - 1];

    if (last?.round !== round) {
      groups.push({ round, entries: [entry] });
      continue;
    }

    last.entries.push(entry);
  }

  return groups;
}
