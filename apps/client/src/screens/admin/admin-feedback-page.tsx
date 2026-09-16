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
import { adminErrorCopy } from '../../admin/fetch-admin';

const KIND_LABEL: Record<FeedbackKind, string> = {
  bug: 'Bug',
  confusion: 'Confusion',
  idea: 'Idea',
};

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
                  </p>
                  <p className="mt-1 text-sm text-ink">{row.message.slice(0, 96)}</p>
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
          <div className="space-y-2 text-sm">
            <p className="whitespace-pre-wrap">{selected.message}</p>
            {selected.topics.length > 0 ? (
              <p>About: {formatFeedbackTopics(selected.topics)}</p>
            ) : null}
            <pre className="overflow-x-auto text-xs">
              {JSON.stringify(selected.logTail, null, 2)}
            </pre>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
