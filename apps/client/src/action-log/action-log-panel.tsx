/**
 * Browsable action log — technical spec §7, L9-02 / L12-05.
 * Filters in a compact right rail; entries grouped by turn (one line each).
 * No change to action-log.ts logic or entry shapes.
 */

import type {
  ActionLogEntryKind,
  ActionLogEntryView,
  PlayingStateView,
} from '@card-battle/shared';
import { useEffect, useRef, useState, type ReactElement } from 'react';

import {
  ACTION_LOG_KINDS,
  filterActionLog,
  formatActionLogEntry,
  groupByRound,
} from './action-log';

const KIND_META: Record<
  ActionLogEntryKind,
  { label: string; short: string; icon: ReactElement }
> = {
  actionPlayed: {
    label: 'Played',
    short: 'Play',
    icon: (
      <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
        <path
          fill="currentColor"
          d="M3 2.5v11l10-5.5L3 2.5Z"
        />
      </svg>
    ),
  },
  actionResolved: {
    label: 'Resolved',
    short: 'Res',
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
    short: 'Out',
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
    short: 'Mir',
    icon: (
      <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden>
        <path
          fill="currentColor"
          d="M2 8h4l-1.5 1.5L6 11l4-4-4-4-1.5 1.5L6 6H2v2Zm8-3 1.5-1.5L14 6l-1.5 1.5L14 9l-2.5 2.5L10 10l1.5-1.5L10 7V5Z"
        />
      </svg>
    ),
  },
  rewardsClaimed: {
    label: 'Rewards',
    short: 'Rwd',
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
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [kinds, setKinds] = useState<ReadonlySet<ActionLogEntryKind>>(
    () => new Set(ACTION_LOG_KINDS),
  );
  const [query, setQuery] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const previousLengthRef = useRef(0);

  const resolveNick = (id: string): string => nicknameOf(view, id);
  const filtered = filterActionLog(
    view.actionLog,
    { playerId, kinds, query },
    resolveNick,
  );
  const groups = groupByRound(filtered, view.players.length);

  useEffect(() => {
    const el = listRef.current;
    const grew = view.actionLog.length > previousLengthRef.current;
    previousLengthRef.current = view.actionLog.length;

    if (el === null || !grew || !stickToBottomRef.current) {
      return;
    }

    el.scrollTop = el.scrollHeight;
  }, [view.actionLog]);

  function toggleKind(kind: ActionLogEntryKind): void {
    setKinds((previous) => {
      const next = new Set(previous);
      if (next.has(kind)) {
        next.delete(kind);
      } else {
        next.add(kind);
      }
      return next;
    });
  }

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
      className="flex h-full min-h-0 gap-2 overflow-hidden font-sans text-ink"
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <h2 className="shrink-0 text-sm font-semibold tracking-tight">Action log</h2>
        {view.actionLog.length === 0 ? (
          <p className="mt-1 text-xs text-ink-muted">No actions yet</p>
        ) : filtered.length === 0 ? (
          <p className="mt-1 text-xs text-ink-muted">No matching entries</p>
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
                      nicknameOf={resolveNick}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      <aside
        data-zone="action-log-filters"
        className="flex w-[7.5rem] shrink-0 flex-col gap-1.5 border-l border-border-soft pl-2"
      >
        <label className="block">
          <span className="sr-only">Player</span>
          <select
            className="w-full rounded-[length:var(--radius-control)] border border-border-soft bg-surface px-1.5 py-1 text-[10px] text-ink"
            value={playerId ?? ''}
            aria-label="Filter by player"
            onChange={(event) => {
              const value = event.target.value;
              setPlayerId(value === '' ? null : value);
            }}
          >
            <option value="">All players</option>
            {view.players.map((player) => (
              <option key={player.id} value={player.id}>
                {player.nickname}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="sr-only">Search</span>
          <input
            type="search"
            className="w-full rounded-[length:var(--radius-control)] border border-border-soft bg-surface px-1.5 py-1 text-[10px] text-ink"
            value={query}
            aria-label="Search log"
            placeholder="Search…"
            onChange={(event) => {
              setQuery(event.target.value);
            }}
          />
        </label>
        <div className="flex flex-col gap-1" role="group" aria-label="Entry kinds">
          {ACTION_LOG_KINDS.map((kind) => {
            const meta = KIND_META[kind];
            const active = kinds.has(kind);
            return (
              <button
                key={kind}
                type="button"
                title={meta.label}
                aria-pressed={active}
                onClick={() => {
                  toggleKind(kind);
                }}
                className={[
                  'inline-flex min-h-8 items-center gap-1.5 rounded-[length:var(--radius-badge)] px-1.5 text-left text-[10px] font-semibold',
                  'outline-none focus-visible:ring-2 focus-visible:ring-cta-purple',
                  active
                    ? 'bg-cta-purple/15 text-ink'
                    : 'bg-surface text-ink-muted opacity-60',
                ].join(' ')}
              >
                <span className="shrink-0 text-cta-purple">{meta.icon}</span>
                <span className="truncate">{meta.short}</span>
              </button>
            );
          })}
        </div>
      </aside>
    </section>
  );
}

function LogLine({
  entry,
  nicknameOf: resolve,
}: {
  entry: ActionLogEntryView;
  nicknameOf: (playerId: string) => string;
}): ReactElement {
  const meta = KIND_META[entry.kind];
  return (
    <li className="flex items-baseline gap-1.5 border-b border-border-soft/60 py-0.5 last:border-b-0">
      <span
        className="mt-0.5 shrink-0 text-ink-muted"
        title={meta.label}
        aria-hidden
      >
        {meta.icon}
      </span>
      <p className="min-w-0 flex-1 truncate text-xs leading-5 text-ink">
        {formatActionLogEntry(entry, resolve)}
      </p>
    </li>
  );
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
    case 'rewardsClaimed':
      return `${entry.kind}-${entry.eliminatorPlayerId}-${entry.eliminatedPlayerId}-${String(index)}`;
  }
}
