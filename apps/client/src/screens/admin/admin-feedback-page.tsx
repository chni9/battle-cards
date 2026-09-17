/**
 * Feedback inbox under /admin/feedback (Lot 61-09).
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
import { useEffect, useState, type ReactElement } from 'react';

import { Button } from '../../design/components/button';
import { Dialog } from '../../design/components/dialog';
import { fetchInbox, filterInbox } from '../../inbox/fetch-inbox';
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
  const [openId, setOpenId] = useState<string | null>(null);

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

  const visible = rows === null ? [] : filterInbox(rows, kindFilter, topicFilter);
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
                    {row.createdAt} · {KIND_LABEL[row.kind]}
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
              {JSON.stringify(selected.logTail, null, 2)}
            </pre>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
