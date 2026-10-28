/**
 * Action-log ticker and round sheet — technical spec v7 §6.9; Lot 73 (L73-11).
 *
 * Parity: Appendix A `table-action-log-panel` / `-entry-copy` / `-resource-nets` / `-inspect`
 * / `-post-lot61-lines`. The copy comes from `action-log.ts` unchanged, so every existing line
 * (`+?` for an unspied Ghost gain, 'a card from the pool' for a fogged buy) reads the same.
 *
 * Fog stays on the server (golden rule 4): this module renders only the fields the entry
 * carries, so a concealed value stays `?` and an unnamed card never becomes an inspectable one.
 * Reads `actionLog` and `players` only; finished-board callers pass `finalTable` as the view.
 */

import type {
  ActionLogEntryKind,
  ActionLogEntryView,
  ActionLogPlayedAction,
  PlayingStateView,
} from '@card-battle/shared';

import {
  formatActionLogEntry,
  formatActionLogEntrySegments,
  groupByRound,
  type ActionLogCardSegment,
  type ActionLogSegment,
  type NicknameResolver,
} from './action-log';

/** A card-name segment plus whether it opens the catalog inspect (L56-05). */
export type LogCardSegment = ActionLogCardSegment & { inspectable: boolean };

export type LogSegment = Exclude<ActionLogSegment, ActionLogCardSegment> | LogCardSegment;

export interface LogLine {
  /** Position in `view.actionLog`: React keys and ticker change detection. */
  index: number;
  /** Kind icon in the sheet. */
  kind: ActionLogEntryKind;
  turnSequence: number;
  segments: readonly LogSegment[];
  /** `formatActionLogEntry(entry, nicknameOf)`: the accessible name, and what tests read. */
  text: string;
}

export interface LogRound {
  round: number;
  lines: readonly LogLine[];
}

export interface LogModel {
  /** The latest entry; null while the log is empty. */
  ticker: LogLine | null;
  /** Chronological, one group per table round (`players.length` seats per round). */
  rounds: readonly LogRound[];
}

/** L56-05 / Appendix A `table-action-log-inspect`: the only lines whose card opens inspect. */
const INSPECTABLE_PLAYED_ACTIONS: ReadonlySet<ActionLogPlayedAction> = new Set([
  'playCard',
  'playMultipleAttacks',
  'buyPoolCard',
  'deactivatePersistent',
]);

/**
 * Decided by entry kind rather than "any card segment": today the formatter emits card segments
 * only on these lines, so the `false` branch is a guard that keeps a later formatter change from
 * making a buy or a Sentence line inspectable.
 */
function cardsAreInspectable(entry: ActionLogEntryView): boolean {
  switch (entry.kind) {
    case 'actionPlayed':
      return INSPECTABLE_PLAYED_ACTIONS.has(entry.action);
    case 'actionResolved':
    case 'mirrorRedirected':
    case 'curseTransferred':
    case 'persistentDeactivated':
      return true;
    default:
      return false;
  }
}

function toLogSegment(segment: ActionLogSegment, inspectable: boolean): LogSegment {
  return segment.type === 'card' ? { ...segment, inspectable } : segment;
}

function toLogLine(entry: ActionLogEntryView, index: number, nicknameOf: NicknameResolver): LogLine {
  const inspectable = cardsAreInspectable(entry);

  return {
    index,
    kind: entry.kind,
    turnSequence: entry.turnSequence,
    segments: formatActionLogEntrySegments(entry, nicknameOf).map((segment) =>
      toLogSegment(segment, inspectable),
    ),
    text: formatActionLogEntry(entry, nicknameOf),
  };
}

/** Spec v7 §6.9: the one-line ticker and the round-grouped sheet, from the same lines. */
export function log(view: PlayingStateView): LogModel {
  const nicknames = new Map(view.players.map((player) => [player.id, player.nickname]));
  const nicknameOf: NicknameResolver = (playerId) => nicknames.get(playerId) ?? playerId;

  let index = 0;
  const rounds = groupByRound(view.actionLog, view.players.length).map(
    (group): LogRound => ({
      round: group.round,
      lines: group.entries.map((entry) => toLogLine(entry, index++, nicknameOf)),
    }),
  );

  return { ticker: rounds.at(-1)?.lines.at(-1) ?? null, rounds };
}
