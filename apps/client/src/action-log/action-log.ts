/**
 * Pure helpers for the browsable public action log (technical spec §7, L9-02).
 * No rule logic — formatting and filter only.
 */

import type { ActionLogEntryKind, ActionLogEntryView } from '@card-battle/shared';

export const ACTION_LOG_KINDS: readonly ActionLogEntryKind[] = [
  'actionPlayed',
  'actionResolved',
  'playerEliminated',
  'mirrorRedirected',
  'rewardsClaimed',
] as const;

export interface ActionLogFilters {
  playerId: string | null;
  kinds: ReadonlySet<ActionLogEntryKind>;
  query: string;
}

export type NicknameResolver = (playerId: string) => string;

export function formatActionLogEntry(
  entry: ActionLogEntryView,
  nicknameOf: NicknameResolver,
): string {
  switch (entry.kind) {
    case 'actionPlayed': {
      const actor = nicknameOf(entry.actorPlayerId);
      const card = entry.cardId !== undefined ? ` ${entry.cardId}` : '';
      const target =
        entry.targetPlayerId !== undefined ? ` → ${nicknameOf(entry.targetPlayerId)}` : '';
      const attacks =
        entry.attacks !== undefined
          ? ` [${entry.attacks
              .map((attack) => `${attack.cardId}→${nicknameOf(attack.targetPlayerId)}`)
              .join(', ')}]`
          : '';

      return `${actor}: ${entry.action}${card}${target}${attacks}`;
    }
    case 'actionResolved': {
      const source = nicknameOf(entry.sourcePlayerId);
      const target = nicknameOf(entry.targetPlayerId);
      const detail =
        entry.outcome === 'applied'
          ? ` (−${String(entry.livesLost)} life, shield ${String(entry.shieldAbsorbed)})`
          : '';

      return `Resolved: ${entry.cardId} ${source} → ${target} (${entry.outcome})${detail}`;
    }
    case 'playerEliminated': {
      const victim = nicknameOf(entry.playerId);
      const by =
        entry.eliminatorPlayerId !== null
          ? ` by ${nicknameOf(entry.eliminatorPlayerId)}`
          : '';

      return `Eliminated: ${victim}${by} (${entry.reason})`;
    }
    case 'mirrorRedirected': {
      const actor = nicknameOf(entry.actorPlayerId);
      const from = nicknameOf(entry.previousTargetPlayerId);
      const to = nicknameOf(entry.newTargetPlayerId);

      return `Mirror: ${actor} redirected ${entry.cardId} ${from} → ${to}`;
    }
    case 'rewardsClaimed': {
      const eliminator = nicknameOf(entry.eliminatorPlayerId);
      const eliminated = nicknameOf(entry.eliminatedPlayerId);

      return `${eliminator} claimed elimination rewards (${eliminated})`;
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
    case 'rewardsClaimed':
      return entry.eliminatorPlayerId === playerId || entry.eliminatedPlayerId === playerId;
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
