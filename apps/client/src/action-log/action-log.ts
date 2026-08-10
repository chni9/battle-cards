/**
 * Pure helpers for the browsable public action log (technical spec §7, L9-02).
 * No rule logic — formatting and filter only.
 * L39-03: segment formatter so seat-colored nicknames avoid substring collisions.
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

export interface ActionLogTextSegment {
  type: 'text';
  text: string;
}
export interface ActionLogPlayerSegment {
  type: 'player';
  playerId: string;
  nickname: string;
  /** When true, UI appends a literal `'s` after the colored nickname. */
  possessive?: boolean;
}
export type ActionLogSegment = ActionLogTextSegment | ActionLogPlayerSegment;

function text(value: string): ActionLogTextSegment {
  return { type: 'text', text: value };
}

function player(
  playerId: string,
  nicknameOf: NicknameResolver,
  possessive = false,
): ActionLogPlayerSegment {
  const segment: ActionLogPlayerSegment = {
    type: 'player',
    playerId,
    nickname: nicknameOf(playerId),
  };
  if (possessive) {
    return { ...segment, possessive: true };
  }
  return segment;
}

function joinSegments(segments: readonly ActionLogSegment[]): string {
  return segments
    .map((segment) => {
      if (segment.type === 'text') {
        return segment.text;
      }
      return segment.possessive === true ? `${segment.nickname}'s` : segment.nickname;
    })
    .join('');
}

function formatPlayedActionSegments(
  entry: Extract<ActionLogEntryView, { kind: 'actionPlayed' }>,
  nicknameOf: NicknameResolver,
): ActionLogSegment[] {
  const actor = player(entry.actorPlayerId, nicknameOf);

  switch (entry.action) {
    case 'draw':
      return [actor, text(' draws')];
    case 'buyCard':
      return [actor, text(' bought a card')];
    case 'sellCard':
      return [actor, text(' sold a card')];
    case 'upgradeCard':
      return [actor, text(' upgraded a card')];
    case 'buySpecialCard':
      return [actor, text(' bought a special card')];
    case 'buyUpgradePoint':
      return [actor, text(' bought an upgrade point')];
    case 'sellUpgradePoint':
      return [actor, text(' sold an upgrade point')];
    case 'deactivatePersistent':
      return [
        actor,
        text(
          ` deactivated ${entry.cardId !== undefined ? formatCardLabel(entry.cardId, entry.isUpgraded ?? false) : 'a persistent'}`,
        ),
      ];
    case 'activateDuplication':
      // Playtest: duplication activation reads as a draw in the action log
      // (designer 2026-08-09). Spy / self still receive the real action kind.
      return [actor, text(' draws')];
    case 'playMultipleAttacks': {
      if (entry.attacks === undefined || entry.attacks.length === 0) {
        return [actor, text(' plays multiple attacks')];
      }
      const segments: ActionLogSegment[] = [actor, text(' attacks with ')];
      entry.attacks.forEach((attack, index) => {
        if (index > 0) {
          segments.push(text(', '));
        }
        segments.push(
          text(`${formatCardLabel(attack.cardId, attack.isUpgraded)} against `),
          player(attack.targetPlayerId, nicknameOf),
        );
      });
      return segments;
    }
    case 'playCard': {
      const id = entry.cardId;
      if (id === undefined) {
        return [actor, text(' plays a card')];
      }
      const name = formatCardLabel(id, entry.isUpgraded === true);
      const targetId = entry.targetPlayerId;
      if (targetId !== undefined) {
        const target = player(targetId, nicknameOf);
        if (isAttackCardId(id)) {
          return [actor, text(' attacks '), target, text(` with ${name}`)];
        }
        return [actor, text(` plays ${name} on `), target];
      }
      if (isAttackCardId(id)) {
        return [actor, text(` attacks with ${name}`)];
      }
      return [actor, text(` plays ${name}`)];
    }
    default: {
      const _exhaustive: never = entry.action;
      return [text(_exhaustive)];
    }
  }
}

export function formatActionLogEntrySegments(
  entry: ActionLogEntryView,
  nicknameOf: NicknameResolver,
): ActionLogSegment[] {
  switch (entry.kind) {
    case 'actionPlayed':
      return formatPlayedActionSegments(entry, nicknameOf);
    case 'actionResolved': {
      const source = player(entry.sourcePlayerId, nicknameOf);
      const target = player(entry.targetPlayerId, nicknameOf);
      const name = formatCardLabel(entry.cardId, entry.isUpgraded);
      switch (entry.outcome) {
        case 'immune':
          return [text(`${name} from `), source, text(' resolves on '), target, text(' — immune')];
        case 'cancelled':
          return [
            text(`${name} from `),
            source,
            text(' against '),
            target,
            text(' is cancelled'),
          ];
        case 'blocked':
          return [
            text(`${name} from `),
            source,
            text(' against '),
            target,
            text(' is blocked'),
          ];
        case 'applied': {
          const shield =
            entry.shieldAbsorbed > 0
              ? `, ${String(entry.shieldAbsorbed)} absorbed by shield`
              : '';
          if (isAttackCardId(entry.cardId) || entry.livesLost > 0) {
            return [
              player(entry.sourcePlayerId, nicknameOf, true),
              text(` ${name} hits `),
              target,
              text(` (−${String(entry.livesLost)} life${shield})`),
            ];
          }
          if (entry.shieldAbsorbed > 0) {
            return [
              text(`${name} from `),
              source,
              text(' resolves on '),
              target,
              text(` (${String(entry.shieldAbsorbed)} absorbed by shield)`),
            ];
          }
          return [text(`${name} from `), source, text(' resolves on '), target];
        }
        default: {
          const _exhaustive: never = entry.outcome;
          return [text(_exhaustive)];
        }
      }
    }
    case 'playerEliminated': {
      const victim = player(entry.playerId, nicknameOf);
      const reasonLabel: Record<typeof entry.reason, string> = {
        combat: 'in combat',
        absence: 'by absence',
        inactivity: 'by inactivity',
        leave: 'after leaving',
      };
      if (entry.eliminatorPlayerId !== null) {
        return [
          victim,
          text(' is eliminated by '),
          player(entry.eliminatorPlayerId, nicknameOf),
          text(` ${reasonLabel[entry.reason]}`),
        ];
      }
      return [victim, text(` is eliminated ${reasonLabel[entry.reason]}`)];
    }
    case 'mirrorRedirected': {
      return [
        player(entry.actorPlayerId, nicknameOf),
        text(` redirects ${formatCardLabel(entry.cardId, false)} from `),
        player(entry.previousTargetPlayerId, nicknameOf),
        text(' to '),
        player(entry.newTargetPlayerId, nicknameOf),
      ];
    }
    case 'curseTransferred': {
      return [
        player(entry.fromPlayerId, nicknameOf),
        text(` passes ${formatCardLabel(entry.cardId, entry.isUpgraded)} to `),
        player(entry.toPlayerId, nicknameOf),
      ];
    }
    case 'playerReanimated': {
      const reanimated = player(entry.playerId, nicknameOf);
      if (entry.kitId === undefined) {
        return [reanimated, text(' returns')];
      }
      const kitName = getKit(entry.kitId).name;
      return [reanimated, text(` returns with ${kitName}`)];
    }
    case 'rewardsClaimed': {
      return [
        player(entry.eliminatorPlayerId, nicknameOf),
        text(' claims elimination rewards from '),
        player(entry.eliminatedPlayerId, nicknameOf),
      ];
    }
    default: {
      const _exhaustive: never = entry;
      return [text(_exhaustive)];
    }
  }
}

export function formatActionLogEntry(
  entry: ActionLogEntryView,
  nicknameOf: NicknameResolver,
): string {
  return joinSegments(formatActionLogEntrySegments(entry, nicknameOf));
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
