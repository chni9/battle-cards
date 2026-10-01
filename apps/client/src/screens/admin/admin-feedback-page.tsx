/**
 * Feedback inbox under /admin/feedback (Lot 61-09).
 */

import {
  FEEDBACK_KINDS,
  FEEDBACK_TOPICS,
  FEEDBACK_TOPIC_LABEL,
  FEEDBACK_TRIAGE_STATUSES,
  FEEDBACK_TRIAGE_STATUS_LABEL,
  formatFeedbackTopics,
  type FeedbackInboxRow,
  type FeedbackKind,
  type FeedbackTopic,
  type FeedbackTriageStatus,
} from '@card-battle/shared';
import { useEffect, useState, type ReactElement } from 'react';

import { Button } from '../../design/components/button';
import { Dialog } from '../../design/components/dialog';
import { fetchInbox, filterInbox, updateInboxStatus } from '../../inbox/fetch-inbox';
import { adminErrorCopy, lockAdminSession } from '../../admin/fetch-admin';

const KIND_LABEL: Record<FeedbackKind, string> = {
  bug: 'Bug',
  confusion: 'Confusion',
  idea: 'Idea',
};

const STATUS_TONE: Record<FeedbackTriageStatus, { idle: string; active: string; stripe: string }> = {
  pending: {
    idle: 'text-cta-orange',
    active: 'bg-cta-orange text-cta-label-on-dark',
    stripe: 'border-l-cta-orange',
  },
  done: {
    idle: 'text-cta-green-deep',
    active: 'bg-cta-green-deep text-cta-label-on-dark',
    stripe: 'border-l-cta-green-deep',
  },
  eliminated: {
    idle: 'text-cta-red',
    active: 'bg-cta-red text-cta-label-on-dark',
    stripe: 'border-l-cta-red',
  },
};

function StatusGlyph({ status }: { status: FeedbackTriageStatus }): ReactElement {
  if (status === 'done') {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path
          d="M6 12.5 10.2 17 18 7.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (status === 'eliminated') {
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path
          d="M8 8l8 8M16 8l-8 8"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <path
        d="M12 8.5V12l2.5 2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StatusMarks(props: {
  current: FeedbackTriageStatus;
  disabled: boolean;
  onSelect: (status: FeedbackTriageStatus) => void;
}): ReactElement {
  const { current, disabled, onSelect } = props;
  return (
    <div className="flex items-center gap-1">
      {FEEDBACK_TRIAGE_STATUSES.map((status) => {
        const selected = status === current;
        const tone = STATUS_TONE[status];
        return (
          <button
            key={status}
            type="button"
            aria-label={FEEDBACK_TRIAGE_STATUS_LABEL[status]}
            aria-pressed={selected}
            disabled={disabled}
            title={FEEDBACK_TRIAGE_STATUS_LABEL[status]}
            className={[
              'inline-flex h-8 w-8 items-center justify-center rounded-full',
              selected ? tone.active : `${tone.idle} hover:bg-surface`,
              disabled ? 'opacity-50' : '',
            ].join(' ')}
            onClick={(event) => {
              event.stopPropagation();
              if (selected || disabled) {
                return;
              }
              onSelect(status);
            }}
          >
            <StatusGlyph status={status} />
          </button>
        );
      })}
    </div>
  );
}

function messagePreview(message: string): string {
  if (message.length <= 96) {
    return message;
  }
  return `${message.slice(0, 96)}…`;
}

interface AdminFeedbackPageProps {
  password: string;
}

export function AdminFeedbackPage({ password }: AdminFeedbackPageProps): ReactElement {
  const [rows, setRows] = useState<FeedbackInboxRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<FeedbackKind | 'all'>('all');
  const [topicFilter, setTopicFilter] = useState<FeedbackTopic | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<FeedbackTriageStatus | 'all'>('pending');
  const [openId, setOpenId] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);

  useEffect(() => {
    void fetchInbox(password).then((result) => {
      if (!result.ok) {
        if (result.status === 401) {
          lockAdminSession();
        }
        setError(adminErrorCopy(result.status));
        return;
      }
      setRows(result.rows);
    });
  }, [password]);

  const visible =
    rows === null ? [] : filterInbox(rows, kindFilter, topicFilter, statusFilter);

  function applyStatus(id: string, status: FeedbackTriageStatus): void {
    setSavingStatus(true);
    setError(null);
    void updateInboxStatus(password, id, status).then((result) => {
      setSavingStatus(false);
      if (!result.ok) {
        if (result.status === 401) {
          lockAdminSession();
        }
        setError(adminErrorCopy(result.status));
        return;
      }
      setRows((current) =>
        current === null
          ? current
          : current.map((row) => (row.id === id ? { ...row, status } : row)),
      );
    });
  }
  const selected = rows?.find((row) => row.id === openId) ?? null;

  return (
    <div>
      {error !== null ? <p className="text-sm text-cta-red">{error}</p> : null}
      {rows !== null ? (
        <>
          <div className="flex flex-wrap gap-2">
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
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-pressed={statusFilter === 'all'}
              className={[
                'rounded-full px-2 py-1 text-xs',
                statusFilter === 'all' ? 'bg-ink text-cta-label-on-dark' : 'text-ink-muted',
              ].join(' ')}
              onClick={() => {
                setStatusFilter('all');
              }}
            >
              Any status
            </button>
            {FEEDBACK_TRIAGE_STATUSES.map((status) => {
              const selected = statusFilter === status;
              const tone = STATUS_TONE[status];
              return (
                <button
                  key={status}
                  type="button"
                  aria-label={FEEDBACK_TRIAGE_STATUS_LABEL[status]}
                  aria-pressed={selected}
                  title={FEEDBACK_TRIAGE_STATUS_LABEL[status]}
                  className={[
                    'inline-flex h-8 w-8 items-center justify-center rounded-full',
                    selected ? tone.active : tone.idle,
                  ].join(' ')}
                  onClick={() => {
                    setStatusFilter(status);
                  }}
                >
                  <StatusGlyph status={status} />
                </button>
              );
            })}
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
          <ul className="mt-6 divide-y divide-border-soft rounded-[length:var(--radius-card)] border border-border bg-surface-raised">
            {visible.map((row) => (
              <li key={row.id} className={`flex items-center border-l-4 ${STATUS_TONE[row.status].stripe}`}>
                <button
                  type="button"
                  className="block min-w-0 flex-1 px-3 py-3 text-left"
                  onClick={() => {
                    setOpenId(row.id);
                  }}
                >
                  <p className="text-xs text-ink-muted">
                    {row.createdAt} · {KIND_LABEL[row.kind]}
                    {row.topics.length > 0 ? ` · ${formatFeedbackTopics(row.topics)}` : ''}
                    {row.gameCode !== null ? ` · ${row.gameCode}` : ''}
                    {row.nickname !== null ? ` · ${row.nickname}` : ''}
                  </p>
                  <p className="mt-1 text-sm text-ink">{messagePreview(row.message)}</p>
                </button>
                <div className="shrink-0 pr-2">
                  <StatusMarks
                    current={row.status}
                    disabled={savingStatus}
                    onSelect={(status) => {
                      applyStatus(row.id, status);
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}
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
            <div className="flex items-center gap-2">
              <p className="text-xs text-ink-muted">{selected.createdAt}</p>
              <StatusMarks
                current={selected.status}
                disabled={savingStatus}
                onSelect={(status) => {
                  applyStatus(selected.id, status);
                }}
              />
            </div>
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
              {JSON.stringify(selected.logTail, null, 2)}
            </pre>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
