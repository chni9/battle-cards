/**
 * Browsable action log panel — technical spec §7, L9-02.
 * Functional visuals only; scroll + turn groups + filters.
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

  return (
    <section>
      <h2>Action log</h2>
      <div>
        <label>
          Player{' '}
          <select
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
        </label>{' '}
        <label>
          Search{' '}
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            placeholder="Filter text"
          />
        </label>
      </div>
      <div>
        {ACTION_LOG_KINDS.map((kind) => (
          <label key={kind} style={{ marginRight: '0.75rem' }}>
            <input
              type="checkbox"
              checked={kinds.has(kind)}
              onChange={() => {
                toggleKind(kind);
              }}
            />{' '}
            {KIND_LABELS[kind]}
          </label>
        ))}
      </div>
      {view.actionLog.length === 0 ? (
        <p>No actions yet</p>
      ) : filtered.length === 0 ? (
        <p>No matching entries</p>
      ) : (
        <div
          ref={listRef}
          onScroll={onScroll}
          style={{ maxHeight: '16rem', overflow: 'auto', border: '1px solid #ccc' }}
        >
          {groups.map((group) => (
            <details key={group.turnSequence} open>
              <summary>Turn {group.turnSequence}</summary>
              <ol>
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
  return <li>{formatActionLogEntry(entry, resolve)}</li>;
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
