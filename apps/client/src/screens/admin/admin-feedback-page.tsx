/**
 * Feedback inbox under /admin/feedback (Lot 61-09), in V7 tool mode (technical spec v7 §7.8,
 * L80-09). Rows load once from `GET /api/inbox` and the kind, area and status filters stay on the
 * client (L47-05 / L47-06); a row mark `PATCH`es the status without opening the report (L68-01).
 *
 * Status is never told by color alone (spec v7 §5.1): each row starts with a round badge in the
 * status tone that holds the clock, check or cross glyph and is named by the status. It is not a
 * one-sided border stripe, which the Impeccable `side-tab` rule flags (spec v7 §12.4).
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

import { formatDateTime } from '../../admin/admin-present';
import { adminErrorCopy, currentAdminSession, lockAdminSession } from '../../admin/fetch-admin';
import { fetchInbox, filterInbox, updateInboxStatus } from '../../inbox/fetch-inbox';
import { Button } from '../../ui/primitives/button';
import {
  CHROME_FLAT_SM_CLASS,
  CHROME_FOCUS_CLASS,
  CHROME_FOCUS_INSET_CLASS,
  CHROME_OUTLINE_CLASS,
} from '../../ui/primitives/chrome-classes';
import { Dialog } from '../../ui/primitives/dialog';
import { ScrollArea } from '../../ui/primitives/scroll-area';
import { ADMIN_BODY_TEXT_CLASS, ADMIN_PANEL_CLASS } from './admin-classes';
import { AdminPageIntro, AdminStatus, AdminToggleChip } from './admin-ui';

const KIND_LABEL: Record<FeedbackKind, string> = {
  bug: 'Bug',
  confusion: 'Confusion',
  idea: 'Idea',
};

/**
 * Status fills (designer 2026-10-28, plan Appendix B 6): Pending `--threat-other`, Done
 * `--upgrade`, Eliminated (won't do) `--danger`. Threat and resource colors are fills and icons,
 * never body text (spec v7 §5.1), so the glyph on them is `--text-on-cta` (ink).
 */
const STATUS_FILL: Record<FeedbackTriageStatus, string> = {
  pending: 'bg-v7-threat-other',
  done: 'bg-v7-upgrade',
  eliminated: 'bg-v7-danger',
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

function StatusBadge({ status }: { status: FeedbackTriageStatus }): ReactElement {
  const label = FEEDBACK_TRIAGE_STATUS_LABEL[status];
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full text-v7-text-on-cta ${STATUS_FILL[status]}`}
    >
      <StatusGlyph status={status} />
    </span>
  );
}

/**
 * The three triage marks. They are their own buttons, not `AdminToggleChip`s, because every mark
 * on the page is off while any save runs (a chip has no off state). Off is `aria-disabled`, never
 * native `disabled`, and the click handler swallows the press: a mark pressed by keyboard, in a
 * row or in the report dialog, keeps focus while it saves instead of dropping it to the body
 * behind the modal (WCAG 2.4.3; frontend.md "Disabled but focusable"). The pressed mark takes
 * the status fill, so it matches the row badge.
 */
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
        return (
          <button
            key={status}
            type="button"
            aria-label={FEEDBACK_TRIAGE_STATUS_LABEL[status]}
            aria-pressed={selected}
            {...(disabled ? { 'aria-disabled': true } : {})}
            title={FEEDBACK_TRIAGE_STATUS_LABEL[status]}
            className={[
              'inline-flex size-11 items-center justify-center',
              CHROME_FLAT_SM_CLASS,
              CHROME_FOCUS_CLASS,
              selected ? `${STATUS_FILL[status]} text-v7-text-on-cta` : 'bg-v7-panel-2 text-v7-text',
              'aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
            ].join(' ')}
            onClick={() => {
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
  const [loadError, setLoadError] = useState<string | null>(null);
  // A failed triage save, tagged with the report its mark was pressed in (null for a row mark).
  // While that report is open its alert renders inside the dialog: the page behind an
  // `aria-modal` sheet is dimmed and not announced (F7).
  const [saveError, setSaveError] = useState<{ message: string; reportId: string | null } | null>(null);
  const [kindFilter, setKindFilter] = useState<FeedbackKind | 'all'>('all');
  const [topicFilter, setTopicFilter] = useState<FeedbackTopic | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<FeedbackTriageStatus | 'all'>('pending');
  const [openId, setOpenId] = useState<string | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);

  useEffect(() => {
    const session = currentAdminSession();
    void fetchInbox(password).then((result) => {
      if (!result.ok) {
        if (result.status === 401) {
          lockAdminSession(session);
        }
        setLoadError(adminErrorCopy(result.status));
        return;
      }
      setRows(result.rows);
    });
  }, [password]);

  const visible =
    rows === null ? [] : filterInbox(rows, kindFilter, topicFilter, statusFilter);

  function applyStatus(id: string, status: FeedbackTriageStatus, inReport: boolean): void {
    setSavingStatus(true);
    setSaveError(null);
    const session = currentAdminSession();
    void updateInboxStatus(password, id, status).then((result) => {
      setSavingStatus(false);
      if (!result.ok) {
        if (result.status === 401) {
          lockAdminSession(session);
        }
        setSaveError({ message: adminErrorCopy(result.status), reportId: inReport ? id : null });
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
  // A save error shows where its mark was pressed: in that report while it is open, else on the
  // page (a row mark, or a report closed since).
  const reportSaveError = selected !== null && saveError?.reportId === selected.id ? saveError.message : null;
  const pageError = loadError ?? (reportSaveError === null ? (saveError?.message ?? null) : null);

  return (
    <div className="space-y-6">
      <AdminPageIntro
        title="Feedback"
        description="Tester reports from the game. Filter them, then mark each one pending, done or won't do."
      />
      {pageError !== null ? <AdminStatus state={{ kind: 'error', message: pageError }} /> : null}
      {rows === null && loadError === null ? <AdminStatus state={{ kind: 'loading' }} /> : null}
      {rows !== null ? (
        <>
          <div className={`${ADMIN_PANEL_CLASS} space-y-3`}>
            <div role="group" aria-label="Kind" className="flex flex-wrap gap-2">
              <AdminToggleChip
                label="All"
                pressed={kindFilter === 'all'}
                onPress={() => {
                  setKindFilter('all');
                }}
              />
              {FEEDBACK_KINDS.map((kind) => (
                <AdminToggleChip
                  key={kind}
                  label={KIND_LABEL[kind]}
                  pressed={kindFilter === kind}
                  onPress={() => {
                    setKindFilter(kind);
                  }}
                />
              ))}
            </div>
            <div role="group" aria-label="Status" className="flex flex-wrap items-center gap-2">
              <AdminToggleChip
                label="Any status"
                pressed={statusFilter === 'all'}
                onPress={() => {
                  setStatusFilter('all');
                }}
              />
              {FEEDBACK_TRIAGE_STATUSES.map((status) => (
                <AdminToggleChip
                  key={status}
                  label={FEEDBACK_TRIAGE_STATUS_LABEL[status]}
                  pressed={statusFilter === status}
                  icon={<StatusGlyph status={status} />}
                  labelHidden
                  onPress={() => {
                    setStatusFilter(status);
                  }}
                />
              ))}
            </div>
            <div role="group" aria-label="Area" className="flex flex-wrap gap-2">
              <AdminToggleChip
                label="Any area"
                pressed={topicFilter === 'all'}
                onPress={() => {
                  setTopicFilter('all');
                }}
              />
              {FEEDBACK_TOPICS.map((topic) => (
                <AdminToggleChip
                  key={topic}
                  label={FEEDBACK_TOPIC_LABEL[topic]}
                  pressed={topicFilter === topic}
                  onPress={() => {
                    setTopicFilter(topic);
                  }}
                />
              ))}
            </div>
          </div>
          {visible.length === 0 ? (
            <AdminStatus state={{ kind: 'empty', message: 'No reports match these filters.' }} />
          ) : (
            <ul className={`${CHROME_OUTLINE_CLASS} divide-y divide-v7-ink rounded-v7-chrome bg-v7-panel`}>
              {visible.map((row) => (
                <li key={row.id} className="flex flex-wrap items-center gap-3 px-3 py-3">
                  <StatusBadge status={row.status} />
                  <button
                    type="button"
                    className={`min-w-0 flex-1 basis-56 rounded-v7-chrome-sm px-1 py-1 text-left ${CHROME_FOCUS_INSET_CLASS}`}
                    onClick={() => {
                      setOpenId(row.id);
                    }}
                  >
                    <p className="font-v7-body text-v7-caption font-bold text-v7-text-2">
                      {formatDateTime(row.createdAt)} · {KIND_LABEL[row.kind]}
                      {row.topics.length > 0 ? ` · ${formatFeedbackTopics(row.topics)}` : ''}
                      {row.gameCode !== null ? ` · ${row.gameCode}` : ''}
                      {row.nickname !== null ? ` · ${row.nickname}` : ''}
                    </p>
                    <p className={`mt-1 ${ADMIN_BODY_TEXT_CLASS} text-v7-text`}>{messagePreview(row.message)}</p>
                  </button>
                  <StatusMarks
                    current={row.status}
                    disabled={savingStatus}
                    onSelect={(status) => {
                      applyStatus(row.id, status, false);
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
      <Dialog
        open={selected !== null}
        title={selected !== null ? KIND_LABEL[selected.kind] : 'Report'}
        width="lg"
        dataAttributes={{ 'data-mode': 'tool' }}
        onClose={() => {
          setOpenId(null);
        }}
        actions={
          <Button
            variant="quiet"
            onClick={() => {
              setOpenId(null);
            }}
          >
            Close
          </Button>
        }
      >
        {selected !== null ? (
          <div className={`space-y-3 break-words ${ADMIN_BODY_TEXT_CLASS} text-v7-text`}>
            <div className="flex flex-wrap items-center gap-3">
              <p className="font-v7-body text-v7-caption font-bold text-v7-text-2">{formatDateTime(selected.createdAt)}</p>
              <StatusMarks
                current={selected.status}
                disabled={savingStatus}
                onSelect={(status) => {
                  applyStatus(selected.id, status, true);
                }}
              />
            </div>
            {reportSaveError !== null ? <AdminStatus state={{ kind: 'error', message: reportSaveError }} /> : null}
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
            <ScrollArea
              axis="x"
              label="Log tail"
              focusRing="inset"
              className={`${CHROME_FLAT_SM_CLASS} bg-v7-panel-2`}
            >
              <pre className="p-2 font-mono text-v7-caption text-v7-text">
                {JSON.stringify(selected.logTail, null, 2)}
              </pre>
            </ScrollArea>
          </div>
        ) : null}
      </Dialog>
    </div>
  );
}
