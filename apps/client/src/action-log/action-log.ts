/**
 * Pure helpers for the browsable public action log (technical spec §7, L9-02).
 * No rule logic — formatting and filter only.
 * L39-03: segment formatter so seat-colored nicknames avoid substring collisions.
 */

import {
  formatCardLabel,
  isAttackCardId,
  listedAttackDamage,
  SENTENCE_OWNER_TURNS,
  type ActionLogEntryKind,
  type ActionLogEntryView,
  type CardId,
  type LogResourceDelta,
  type LogResourceDirection,
  type LogResourceKind,
} from '@card-battle/shared';

export const ACTION_LOG_KINDS: readonly ActionLogEntryKind[] = [
  'actionPlayed',
  'actionResolved',
  'playerEliminated',
  'mirrorRedirected',
  'persistentDeactivated',
  'curseTransferred',
  'playerReanimated',
  'rewardsClaimed',
  'sentenceCountdown',
  'sentenceFired',
  'resourceChange',
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
export interface ActionLogDamageSegment {
  type: 'damage';
  amount: number;
}
export interface ActionLogCardSegment {
  type: 'card';
  cardId: CardId;
  isUpgraded: boolean;
}
/** Icon-only resource net. Sign and number are colored; the icon keeps its art. */
export interface ActionLogResourceSegment {
  type: 'resource';
  kind: LogResourceKind;
  direction: LogResourceDirection;
  /** `+7`, `−1`, `+?`, or `−?`. Minus is U+2212. No parentheses. */
  label: string;
  spoken: string;
}
export type ActionLogSegment =
  | ActionLogTextSegment
  | ActionLogPlayerSegment
  | ActionLogDamageSegment
  | ActionLogCardSegment
  | ActionLogResourceSegment;

const MINUS = '\u2212';

export function resourceDeltaClass(direction: LogResourceDirection): string {
  return direction === 'gain' ? 'text-cta-green' : 'text-cta-red';
}

function resourceDirection(delta: LogResourceDelta): LogResourceDirection {
  if (delta.direction !== undefined) {
    return delta.direction;
  }

  return (delta.amount ?? 0) < 0 ? 'loss' : 'gain';
}

function resourceNoun(kind: LogResourceKind, plural: boolean): string {
  switch (kind) {
    case 'life':
      return plural ? 'lives' : 'life';
    case 'point':
      return plural ? 'points' : 'point';
    case 'upgradePoint':
      return plural ? 'upgrade points' : 'upgrade point';
    case 'shield':
      return 'shield';
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function resourceSegment(delta: LogResourceDelta): ActionLogResourceSegment {
  const direction = resourceDirection(delta);
  const sign = direction === 'gain' ? '+' : MINUS;
  const concealed = delta.concealed === true || delta.amount === undefined;
  const label = concealed ? `${sign}?` : `${sign}${String(Math.abs(delta.amount ?? 0))}`;
  const noun = resourceNoun(delta.kind, concealed || Math.abs(delta.amount ?? 0) !== 1);
  const spoken = concealed
    ? direction === 'gain'
      ? `concealed ${noun} gain`
      : `concealed ${noun} loss`
    : `${label} ${noun}`;

  return { type: 'resource', kind: delta.kind, direction, label, spoken };
}

function resourceSegments(deltas: readonly LogResourceDelta[] | undefined): ActionLogResourceSegment[] {
  if (deltas === undefined || deltas.length === 0) {
    return [];
  }

  return deltas.map(resourceSegment);
}

function withResourceSuffix(
  segments: ActionLogSegment[],
  deltas: readonly LogResourceDelta[] | undefined,
): ActionLogSegment[] {
  const suffix = resourceSegments(deltas);
  return suffix.length === 0 ? segments : [...segments, ...suffix];
}

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

function damageBadge(amount: number): ActionLogDamageSegment {
  return { type: 'damage', amount };
}

function listedDamageSegments(
  cardId: string,
  isUpgraded: boolean,
  multiplier = 1,
): ActionLogSegment[] {
  const amount = listedAttackDamage(cardId, isUpgraded, multiplier);
  return amount === null ? [] : [damageBadge(amount)];
}

function cardName(cardId: CardId, isUpgraded: boolean): ActionLogCardSegment {
  return { type: 'card', cardId, isUpgraded };
}

function joinSegments(segments: readonly ActionLogSegment[]): string {
  return segments
    .map((segment) => {
      if (segment.type === 'text') {
        return segment.text;
      }
      if (segment.type === 'damage') {
        return ` (${String(segment.amount)})`;
      }
      if (segment.type === 'card') {
        return formatCardLabel(segment.cardId, segment.isUpgraded);
      }
      if (segment.type === 'resource') {
        return ` ${segment.label}`;
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
      return entry.drawBust === true
        ? [actor, text(' draws and busts')]
        : [actor, text(' draws')];
    case 'buyCard':
      return [actor, text(' bought a card')];
    case 'sellCard':
      return [actor, text(' sold a card')];
    case 'upgradeCard':
      return [actor, text(' upgraded a card')];
    case 'buySpecialCard':
      return [actor, text(' bought a special card')];
    case 'buyPoolCard':
      return [
        actor,
        text(' bought '),
        ...(entry.cardId !== undefined
          ? [cardName(entry.cardId, entry.isUpgraded ?? false), text(' from the pool')]
          : [text('a card from the pool')]),
      ];
    case 'clearSpy':
      return [
        actor,
        text(' got unspied from '),
        ...(entry.targetPlayerId !== undefined
          ? [player(entry.targetPlayerId, nicknameOf)]
          : [text('a spy')]),
      ];
    case 'buyUpgradePoint':
      return [actor, text(' bought an upgrade point')];
    case 'sellUpgradePoint':
      return [actor, text(' sold an upgrade point')];
    case 'deactivatePersistent':
      return [
        actor,
        text(' deactivated '),
        ...(entry.cardId !== undefined
          ? [cardName(entry.cardId, entry.isUpgraded ?? false), text('; it is lost')]
          : [text('a persistent; it is lost')]),
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
          cardName(attack.cardId, attack.isUpgraded),
          ...listedDamageSegments(attack.cardId, attack.isUpgraded),
          text(' against '),
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
      const upgraded = entry.isUpgraded === true;
      const targetId = entry.targetPlayerId;
      if (targetId !== undefined) {
        const target = player(targetId, nicknameOf);
        if (isAttackCardId(id)) {
          return [
            actor,
            text(' attacks '),
            target,
            text(' with '),
            cardName(id, upgraded),
            ...listedDamageSegments(id, upgraded),
          ];
        }
        return [actor, text(' plays '), cardName(id, upgraded), text(' on '), target];
      }
      if (isAttackCardId(id)) {
        return [
          actor,
          text(' attacks with '),
          cardName(id, upgraded),
          ...listedDamageSegments(id, upgraded),
        ];
      }
      return [actor, text(' plays '), cardName(id, upgraded)];
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
      return withResourceSuffix(formatPlayedActionSegments(entry, nicknameOf), entry.resourceDeltas);
    case 'actionResolved': {
      const source = player(entry.sourcePlayerId, nicknameOf);
      const target = player(entry.targetPlayerId, nicknameOf);
      const nameCard = cardName(entry.cardId, entry.isUpgraded);
      switch (entry.outcome) {
        case 'immune':
          return [nameCard, text(' from '), source, text(' resolves on '), target, text(' — immune')];
        case 'cancelled':
          return [
            nameCard,
            text(' from '),
            source,
            text(' against '),
            target,
            text(' is cancelled'),
          ];
        case 'blocked':
          return [
            nameCard,
            text(' from '),
            source,
            text(' against '),
            target,
            text(' is blocked'),
          ];
        case 'applied': {
          // Lives lost and shield absorbed stay off this sentence. The play
          // line above already carries the actor's immediate net (PROTOCOL_VERSION 40).
          if (isAttackCardId(entry.cardId) || entry.livesLost > 0) {
            return [
              player(entry.sourcePlayerId, nicknameOf, true),
              text(' '),
              nameCard,
              text(' hits '),
              target,
            ];
          }
          return [nameCard, text(' from '), source, text(' resolves on '), target];
        }
        default: {
          const _exhaustive: never = entry.outcome;
          return [text(_exhaustive)];
        }
      }
    }
    case 'playerEliminated': {
      const victim = player(entry.playerId, nicknameOf);
      if (entry.reason === 'gambling') {
        return [victim, text(' dies by Gambling')];
      }
      const reasonLabel: Record<Exclude<typeof entry.reason, 'gambling'>, string> = {
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
      return withResourceSuffix(
        [
          player(entry.actorPlayerId, nicknameOf),
          text(' redirects '),
          cardName(entry.cardId, entry.isUpgraded),
          ...listedDamageSegments(entry.cardId, entry.isUpgraded, entry.damageMultiplier),
          text(' from '),
          player(entry.previousTargetPlayerId, nicknameOf),
          text(' to '),
          player(entry.newTargetPlayerId, nicknameOf),
        ],
        entry.resourceDeltas,
      );
    }
    case 'persistentDeactivated': {
      return [
        player(entry.ownerPlayerId, nicknameOf, true),
        text(' '),
        cardName(entry.cardId, entry.isUpgraded),
        text(' is deactivated and lost'),
      ];
    }
    case 'curseTransferred': {
      return [
        player(entry.fromPlayerId, nicknameOf),
        text(' passes '),
        cardName(entry.cardId, entry.isUpgraded),
        text(' to '),
        player(entry.toPlayerId, nicknameOf),
      ];
    }
    case 'playerReanimated': {
      return [player(entry.playerId, nicknameOf), text(' returns')];
    }
    case 'rewardsClaimed': {
      return [
        player(entry.eliminatorPlayerId, nicknameOf),
        text(' claims elimination rewards from '),
        player(entry.eliminatedPlayerId, nicknameOf),
      ];
    }
    case 'sentenceCountdown': {
      if (entry.remainingOwnerTurns === SENTENCE_OWNER_TURNS) {
        return [text('Sentence in 3 turns!')];
      }
      const unit = entry.remainingOwnerTurns === 1 ? 'turn' : 'turns';
      return [
        text(`${String(entry.remainingOwnerTurns)} ${unit} before Sentence!`),
      ];
    }
    case 'sentenceFired': {
      return [text('Sentence will kill '), player(entry.targetPlayerId, nicknameOf), text('!')];
    }
    case 'resourceChange': {
      return [player(entry.playerId, nicknameOf), ...resourceSegments(entry.deltas)];
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
    case 'persistentDeactivated':
      return entry.ownerPlayerId === playerId;
    case 'curseTransferred':
      return entry.fromPlayerId === playerId || entry.toPlayerId === playerId;
    case 'playerReanimated':
      return entry.playerId === playerId;
    case 'rewardsClaimed':
      return entry.eliminatorPlayerId === playerId || entry.eliminatedPlayerId === playerId;
    case 'sentenceCountdown':
      return entry.sourcePlayerId === playerId;
    case 'sentenceFired':
      return entry.sourcePlayerId === playerId || entry.targetPlayerId === playerId;
    case 'resourceChange':
      return entry.playerId === playerId;
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
