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
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              compact
              type="button"
              variant={statusFilter === 'all' ? 'green' : 'orange'}
              onClick={() => {
                setStatusFilter('all');
              }}
            >
              Any status
            </Button>
            {FEEDBACK_TRIAGE_STATUSES.map((status) => (
              <Button
                key={status}
                compact
                type="button"
                variant={statusFilter === status ? 'green' : 'orange'}
                onClick={() => {
                  setStatusFilter(status);
                }}
              >
                {FEEDBACK_TRIAGE_STATUS_LABEL[status]}
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
                    {row.createdAt} · {KIND_LABEL[row.kind]} · {FEEDBACK_TRIAGE_STATUS_LABEL[row.status]}
                    {row.topics.length > 0 ? ` · ${formatFeedbackTopics(row.topics)}` : ''}
                    {row.gameCode !== null ? ` · ${row.gameCode}` : ''}
                    {row.nickname !== null ? ` · ${row.nickname}` : ''}
                  </p>
                  <p className="mt-1 text-sm text-ink">{messagePreview(row.message)}</p>
                </button>
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
            <p className="text-xs text-ink-muted">
              {selected.createdAt} · {FEEDBACK_TRIAGE_STATUS_LABEL[selected.status]}
            </p>
            <div className="flex flex-wrap gap-2">
              {FEEDBACK_TRIAGE_STATUSES.map((status) => (
                <Button
                  key={status}
                  compact
                  type="button"
                  variant={selected.status === status ? 'green' : 'orange'}
                  disabled={savingStatus}
                  onClick={() => {
                    applyStatus(selected.id, status);
                  }}
                >
                  {FEEDBACK_TRIAGE_STATUS_LABEL[status]}
                </Button>
              ))}
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
