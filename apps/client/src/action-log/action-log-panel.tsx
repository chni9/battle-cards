/**
 * Browsable action log — technical spec §7, L9-02 / L12-05.
 * Round groups, one line each. Bot reason toggle: L17-05 / #V3-2.
 * L39-03: seat-colored nicknames via segment formatter.
 */

import type {
  ActionLogEntryKind,
  ActionLogEntryView,
  BotDecisionReason,
  PlayingStateView,
} from '@card-battle/shared';
import { Fragment, useEffect, useRef, useState, type ReactElement } from 'react';

import { formatBotReason } from '../bots/format-bot-reason';
import { PlayerName } from '../design/components/player-name';
import {
  formatActionLogEntrySegments,
  groupByRound,
  type ActionLogSegment,
} from './action-log';

const KIND_META: Record<
  ActionLogEntryKind,
  { label: string; icon: ReactElement }
> = {
  actionPlayed: {
    label: 'Played',
    icon: (
      <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
        <path fill="currentColor" d="M3 2.5v11l10-5.5L3 2.5Z" />
      </svg>
    ),
  },
  actionResolved: {
    label: 'Resolved',
    icon: (
      <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
        <path
          fill="currentColor"
          d="M6.5 11.5 3 8l1.2-1.2 2.3 2.3 5.3-5.3L13 5.2 6.5 11.5Z"
        />
      </svg>
    ),
  },
  playerEliminated: {
    label: 'Eliminated',
    icon: (
      <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
        <path
          fill="currentColor"
          d="M4.2 3.1 3.1 4.2 6.9 8l-3.8 3.8 1.1 1.1L8 9.1l3.8 3.8 1.1-1.1L9.1 8l3.8-3.8-1.1-1.1L8 6.9 4.2 3.1Z"
        />
      </svg>
    ),
  },
  mirrorRedirected: {
    label: 'Mirror',
    icon: (
      <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
        <path
          fill="currentColor"
          d="M2 8h4l-1.5 1.5L6 11l4-4-4-4-1.5 1.5L6 6H2v2Zm8-3 1.5-1.5L14 6l-1.5 1.5L14 9l-2.5 2.5L10 10l1.5-1.5L10 7V5Z"
        />
      </svg>
    ),
  },
  curseTransferred: {
    label: 'Curse',
    icon: (
      <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
        <path
          fill="currentColor"
          d="M3 8h4V4h2v4h4v2H9v4H7V10H3V8Z"
        />
      </svg>
    ),
  },
  playerReanimated: {
    label: 'Reanimated',
    icon: (
      <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
        <path
          fill="currentColor"
          d="M8 2a4 4 0 0 0-3.2 6.4L2 11.2V14h2.8l2.8-2.8A4 4 0 1 0 8 2Zm0 1.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z"
        />
      </svg>
    ),
  },
  rewardsClaimed: {
    label: 'Rewards',
    icon: (
      <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
        <path
          fill="currentColor"
          d="M8 1.5 9.8 6h4.7l-3.8 2.9 1.4 4.6L8 10.8 3.9 13.5l1.4-4.6L1.5 6h4.7L8 1.5Z"
        />
      </svg>
    ),
  },
};

export interface ActionLogPanelProps {
  view: PlayingStateView;
}

function nicknameOf(view: PlayingStateView, playerId: string): string {
  return view.players.find((player) => player.id === playerId)?.nickname ?? playerId;
}

export function ActionLogPanel({ view }: ActionLogPanelProps): ReactElement {
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const previousLengthRef = useRef(0);

  const resolveNick = (id: string): string => nicknameOf(view, id);
  const groups = groupByRound(view.actionLog, view.players.length);

  useEffect(() => {
    const el = listRef.current;
    const grew = view.actionLog.length > previousLengthRef.current;
    previousLengthRef.current = view.actionLog.length;

    if (el === null || !grew || !stickToBottomRef.current) {
      return;
    }

    el.scrollTop = el.scrollHeight;
  }, [view.actionLog]);

  function onScroll(): void {
    const el = listRef.current;
    if (el === null) {
      return;
    }
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 48;
  }

  return (
    <section
      data-zone="action-log-panel"
      className="flex h-full min-h-0 flex-col overflow-hidden font-sans text-ink"
    >
      <h2 className="shrink-0 text-xs font-semibold tracking-tight sm:text-sm">
        Action log
      </h2>
      {view.actionLog.length === 0 ? (
        <p className="mt-1 text-xs text-ink-muted">No actions yet</p>
      ) : (
        <div
          ref={listRef}
          onScroll={onScroll}
          className="mt-1 min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-[length:var(--radius-card)] border border-border-soft bg-surface"
        >
          {groups.map((group) => (
            <div
              key={group.round}
              className="border-b border-border-soft last:border-b-0"
            >
              <div className="sticky top-0 z-[1] bg-surface-raised/95 px-2 py-0.5 backdrop-blur-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-muted">
                  Round {group.round}
                </p>
              </div>
              <ul className="px-2 pb-1">
                {group.entries.map((entry, index) => (
                  <LogLine
                    key={entryKey(entry, index)}
                    entry={entry}
                    view={view}
                    nicknameOf={resolveNick}
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function LogLine({
  entry,
  view,
  nicknameOf: resolve,
}: {
  entry: ActionLogEntryView;
  view: PlayingStateView;
  nicknameOf: (playerId: string) => string;
}): ReactElement {
  const meta = KIND_META[entry.kind];
  const botReason = botReasonOf(entry);
  const [open, setOpen] = useState(false);
  const segments = formatActionLogEntrySegments(entry, resolve);

  return (
    <li className="border-b border-border-soft/60 py-0.5 last:border-b-0">
      <div className="flex items-baseline gap-1.5">
        <span
          className="mt-0.5 shrink-0 text-ink-muted"
          title={meta.label}
          aria-hidden
        >
          {meta.icon}
        </span>
        <p className="min-w-0 flex-1 truncate text-xs leading-5 text-ink">
          <LogSegments segments={segments} view={view} />
        </p>
        {botReason !== undefined && (
          <button
            type="button"
            className={[
              'shrink-0 rounded-[length:var(--radius-badge)] border border-border-soft',
              'px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted',
              'hover:bg-surface-raised focus-visible:outline focus-visible:outline-2',
              'focus-visible:outline-offset-1 focus-visible:outline-ink',
            ].join(' ')}
            aria-expanded={open}
            aria-label={open ? 'Hide bot reason' : 'Show bot reason'}
            onClick={() => {
              setOpen((previous) => !previous);
            }}
          >
            Why
          </button>
        )}
      </div>
      {open && botReason !== undefined && (
        <p className="mt-0.5 pl-5 text-[11px] leading-4 text-ink-muted">
          {formatBotReason(botReason)}
        </p>
      )}
    </li>
  );
}

function LogSegments({
  segments,
  view,
}: {
  segments: readonly ActionLogSegment[];
  view: PlayingStateView;
}): ReactElement {
  return (
    <>
      {segments.map((segment, index) => {
        if (segment.type === 'text') {
          return <Fragment key={`t-${String(index)}`}>{segment.text}</Fragment>;
        }
        return (
          <PlayerName
            key={`p-${segment.playerId}-${String(index)}`}
            nickname={segment.nickname}
            playerId={segment.playerId}
            view={view}
            className="text-xs"
            possessive={segment.possessive === true}
          />
        );
      })}
    </>
  );
}

function botReasonOf(entry: ActionLogEntryView): BotDecisionReason | undefined {
  if (
    entry.kind === 'actionPlayed' ||
    entry.kind === 'mirrorRedirected' ||
    entry.kind === 'rewardsClaimed'
  ) {
    return entry.botReason;
  }

  return undefined;
}

function entryKey(entry: ActionLogEntryView, index: number): string {
  switch (entry.kind) {
    case 'actionPlayed':
      return `${entry.kind}-${entry.turnSequence}-${entry.actorPlayerId}-${entry.action}-${String(index)}`;
    case 'actionResolved':
      return `${entry.kind}-${entry.effectId}-${String(index)}`;
    case 'playerEliminated':
      return `${entry.kind}-${entry.playerId}-${entry.reason}-${String(index)}`;
    case 'mirrorRedirected':
      return `${entry.kind}-${entry.turnSequence}-${entry.newTargetPlayerId}-${String(index)}`;
    case 'curseTransferred':
      return `${entry.kind}-${entry.effectId}-${entry.fromPlayerId}-${entry.toPlayerId}-${String(index)}`;
    case 'playerReanimated':
      return `${entry.kind}-${entry.playerId}-${entry.kitId ?? 'hidden'}-${String(index)}`;
    case 'rewardsClaimed':
      return `${entry.kind}-${entry.eliminatorPlayerId}-${entry.eliminatedPlayerId}-${String(index)}`;
    default: {
      const _exhaustive: never = entry;
      return _exhaustive;
    }
  }
}
