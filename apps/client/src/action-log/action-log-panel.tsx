/**
 * Browsable action log panel — technical spec §7, L9-02 / L12-05 restyle.
 * No change to action-log.ts logic or entry shapes. rewardsClaimed stays opaque.
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
  groupByTurn,
} from './action-log';

const KIND_LABELS: Record<ActionLogEntryKind, string> = {
  actionPlayed: 'Played',
  actionResolved: 'Resolved',
  playerEliminated: 'Eliminated',
  mirrorRedirected: 'Mirror',
  rewardsClaimed: 'Rewards',
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
  const groups = groupByTurn(filtered);

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

  const controlClass =
    'rounded-[length:var(--radius-control)] border border-border-soft bg-surface px-2 py-1.5 text-sm text-ink';

  return (
    <section data-zone="action-log-panel" className="flex h-full min-h-0 flex-col font-sans text-ink">
      <h2 className="shrink-0 text-base font-semibold tracking-tight">Action log</h2>
      <div className="mt-2 flex shrink-0 flex-wrap items-center gap-2">
        <label className="text-xs text-ink-muted">
          Player{' '}
          <select
            className={`ml-1 ${controlClass}`}
            value={playerId ?? ''}
            onChange={(event) => {
              const value = event.target.value;
              setPlayerId(value === '' ? null : value);
            }}
          >
            <option value="">All</option>
            {view.players.map((player) => (
              <option key={player.id} value={player.id}>
                {player.nickname}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-ink-muted">
          Search{' '}
          <input
            type="search"
            className={`ml-1 min-w-[10rem] ${controlClass}`}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            placeholder="Filter text"
          />
        </label>
      </div>
      <div className="mt-2 flex shrink-0 flex-wrap gap-x-3 gap-y-1">
        {ACTION_LOG_KINDS.map((kind) => (
          <label key={kind} className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
            <input
              type="checkbox"
              className="size-3.5 accent-cta-purple"
              checked={kinds.has(kind)}
              onChange={() => {
                toggleKind(kind);
              }}
            />
            {KIND_LABELS[kind]}
          </label>
        ))}
      </div>
      {view.actionLog.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">No actions yet</p>
      ) : filtered.length === 0 ? (
        <p className="mt-3 text-sm text-ink-muted">No matching entries</p>
      ) : (
        <div
          ref={listRef}
          onScroll={onScroll}
          className="mt-2 min-h-0 flex-1 overflow-auto rounded-[length:var(--radius-card)] border border-border-soft bg-surface px-2 py-1"
        >
          {groups.map((group) => (
            <details key={group.turnSequence} open className="border-b border-border-soft py-1 last:border-b-0">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Turn {group.turnSequence}
              </summary>
              <ol className="mt-1 space-y-0.5 pb-1 pl-1">
                {group.entries.map((entry, index) => (
                  <LogLine
                    key={entryKey(entry, index)}
                    entry={entry}
                    nicknameOf={resolveNick}
                  />
                ))}
              </ol>
            </details>
          ))}
        </div>
      )}
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
  return (
    <li className="text-sm leading-snug text-ink">
      {formatActionLogEntry(entry, resolve)}
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
