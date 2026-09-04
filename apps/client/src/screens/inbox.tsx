/**
 * Designer inbox — technical spec v6 §7.3 / L47-05.
 * Pathname `/inbox` only. Not linked from the hub. No edit or delete.
 */

import {
  FEEDBACK_KINDS,
  FEEDBACK_TOPICS,
  FEEDBACK_TOPIC_LABEL,
  formatFeedbackTopics,
  type FeedbackInboxRow,
  type FeedbackKind,
  type FeedbackTopic,
} from '@card-battle/shared';
import { useEffect, useState, type ReactElement, type SyntheticEvent } from 'react';

import { Button } from '../design/components/button';
import { Dialog } from '../design/components/dialog';
import {
  fetchInbox,
  filterInbox,
} from '../inbox/fetch-inbox';
import {
  clearStoredInboxPassword,
  readStoredInboxPassword,
  storeInboxPassword,
} from '../inbox/password-storage';

const KIND_LABEL: Record<FeedbackKind, string> = {
  bug: 'Bug',
  confusion: 'Confusion',
  idea: 'Idea',
};

const inputClassName = [
  'mt-1.5 block w-full min-h-11 rounded-[length:var(--radius-control)]',
  'border border-border bg-surface-raised px-3 py-2 font-sans text-base text-ink',
  'placeholder:text-ink-muted/70',
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
].join(' ');

function inboxErrorCopy(status: number): string {
  if (status === 401) {
    return 'Wrong password';
  }
  if (status === 404) {
    return 'Not found';
  }
  return 'Could not load';
}

function messagePreview(message: string): string {
  if (message.length <= 96) {
    return message;
  }
  return `${message.slice(0, 96)}…`;
}

function logTailText(logTail: unknown): string {
  return JSON.stringify(logTail, null, 2);
}

export function InboxScreen(): ReactElement {
  const [password, setPassword] = useState(() => readStoredInboxPassword() ?? '');
  const [rows, setRows] = useState<FeedbackInboxRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [kindFilter, setKindFilter] = useState<FeedbackKind | 'all'>('all');
  const [topicFilter, setTopicFilter] = useState<FeedbackTopic | 'all'>('all');
  const [openId, setOpenId] = useState<string | null>(null);

  const loadRows = (secret: string): void => {
    if (secret.length === 0 || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    void fetchInbox(secret).then((result) => {
      setBusy(false);
      if (!result.ok) {
        if (result.status === 401) {
          clearStoredInboxPassword();
          setRows(null);
        }
        setError(inboxErrorCopy(result.status));
        return;
      }
      storeInboxPassword(secret);
      setRows(result.rows);
    });
  };

  useEffect(() => {
    const stored = readStoredInboxPassword();
    if (stored === null) {
      return;
    }
    let cancelled = false;
    void fetchInbox(stored).then((result) => {
      if (cancelled) {
        return;
      }
      if (!result.ok) {
        if (result.status === 401) {
          clearStoredInboxPassword();
          setRows(null);
        }
        setError(inboxErrorCopy(result.status));
        return;
      }
      setRows(result.rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = (event: SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    loadRows(password.trim());
  };

  const visible = rows === null ? [] : filterInbox(rows, kindFilter, topicFilter);
  const selected = rows?.find((row) => row.id === openId) ?? null;

  return (
    <main className="h-full overflow-y-auto bg-surface font-sans text-ink">
      <div className="mx-auto max-w-lg px-4 py-8 md:px-6">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-muted">
          Designer
        </p>
        <h1 className="mt-2 font-sans text-4xl font-semibold tracking-tight text-ink md:text-5xl">
          Inbox
        </h1>

        <form className="mt-8" onSubmit={onSubmit}>
          <label className="block text-sm font-medium text-ink">
            Password
            <input
              className={inputClassName}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
              }}
            />
          </label>
          <div className="mt-4">
            <Button type="submit" variant="green" disabled={busy || password.trim().length === 0}>
              {busy ? 'Loading…' : 'Open'}
            </Button>
          </div>
        </form>

        {error !== null ? (
          <p className="mt-4 text-sm text-cta-red" role="alert">
            {error}
          </p>
        ) : null}

        {rows !== null ? (
          <>
            <div className="mt-8 flex flex-wrap gap-2">
              <Button
                compact
                type="button"
                variant={kindFilter === 'all' ? 'green' : 'orange'}
                onClick={() => {
                  setKindFilter('all');
                }}
              >
                All
              </Button>
              {FEEDBACK_KINDS.map((kind) => (
                <Button
                  key={kind}
                  compact
                  type="button"
                  variant={kindFilter === kind ? 'green' : 'orange'}
                  onClick={() => {
                    setKindFilter(kind);
                  }}
                >
                  {KIND_LABEL[kind]}
                </Button>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                compact
                type="button"
                variant={topicFilter === 'all' ? 'green' : 'orange'}
                onClick={() => {
                  setTopicFilter('all');
                }}
              >
                Any area
              </Button>
              {FEEDBACK_TOPICS.map((topic) => (
                <Button
                  key={topic}
                  compact
                  type="button"
                  variant={topicFilter === topic ? 'green' : 'orange'}
                  onClick={() => {
                    setTopicFilter(topic);
                  }}
                >
                  {FEEDBACK_TOPIC_LABEL[topic]}
                </Button>
              ))}
            </div>

            {visible.length === 0 ? (
              <p className="mt-6 text-sm text-ink-muted">No reports</p>
            ) : (
              <ul className="mt-6 divide-y divide-border-soft rounded-[length:var(--radius-card)] border border-border bg-surface-raised">
                {visible.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      className="block w-full px-3 py-3 text-left"
                      onClick={() => {
                        setOpenId(row.id);
                      }}
                    >
                      <p className="text-xs text-ink-muted">
                        {row.createdAt} · {KIND_LABEL[row.kind]}
                        {row.topics.length > 0
                          ? ` · ${formatFeedbackTopics(row.topics)}`
                          : ''}
                        {row.gameCode !== null ? ` · ${row.gameCode}` : ''}
                        {row.nickname !== null ? ` · ${row.nickname}` : ''}
                      </p>
                      <p className="mt-1 text-sm text-ink">{messagePreview(row.message)}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : null}
      </div>

      <Dialog
        open={selected !== null}
        title={selected !== null ? KIND_LABEL[selected.kind] : 'Report'}
        panelClassName="max-w-lg"
        onClose={() => {
          setOpenId(null);
        }}
        actions={
          <Button
            compact
            type="button"
            variant="orange"
            onClick={() => {
              setOpenId(null);
            }}
          >
            Close
          </Button>
        }
      >
        {selected !== null ? (
          <div className="space-y-3 text-sm text-ink">
            <p className="text-xs text-ink-muted">{selected.createdAt}</p>
            {selected.topics.length > 0 ? (
              <p>About: {formatFeedbackTopics(selected.topics)}</p>
            ) : null}
            <p className="whitespace-pre-wrap">{selected.message}</p>
            <p>Contact: {selected.contact ?? '—'}</p>
            <p>Nickname: {selected.nickname ?? '—'}</p>
            <p>Code: {selected.gameCode ?? '—'}</p>
            <p>Screen: {selected.screen}</p>
            <p>Play: {selected.playKind ?? '—'}</p>
            <p>Protocol: {selected.protocolVersion}</p>
            <p>User agent: {selected.userAgent ?? '—'}</p>
            <pre className="overflow-x-auto rounded-[length:var(--radius-control)] border border-border bg-surface p-2 text-xs">
              {logTailText(selected.logTail)}
            </pre>
          </div>
        ) : null}
      </Dialog>
    </main>
  );
}
