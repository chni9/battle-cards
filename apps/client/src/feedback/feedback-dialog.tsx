/**
 * Tester feedback form (technical spec v6 §7.1 / L47-03).
 * Ask-mode Skip / overlay marks asked in the parent. Does not call leaveGame.
 */

import {
  FEEDBACK_KINDS,
  type FeedbackKind,
  type FeedbackScreen,
  type PlayKind,
  type ActionLogEntryView,
} from '@card-battle/shared';
import { useRef, useState, type ReactElement } from 'react';

import { Button } from '../design/components/button';
import { Dialog } from '../design/components/dialog';
import { buildFeedbackPayload } from './build-feedback-payload';
import { submitFeedback } from './submit-feedback';

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

export type FeedbackDialogMode = 'ask' | 'manual';

export interface FeedbackDialogProps {
  open: boolean;
  mode: FeedbackDialogMode;
  screen: FeedbackScreen;
  nickname?: string;
  gameCode?: string;
  playKind?: PlayKind;
  actionLog?: readonly ActionLogEntryView[];
  onDismiss: (reason: 'skip' | 'cancel' | 'sent') => void;
}

export function FeedbackDialog({
  open,
  mode,
  screen,
  nickname,
  gameCode,
  playKind,
  actionLog,
  onDismiss,
}: FeedbackDialogProps): ReactElement {
  const [kind, setKind] = useState<FeedbackKind>('bug');
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const resetForm = (): void => {
    setKind('bug');
    setMessage('');
    setContact('');
    setBusy(false);
    setError(null);
  };

  const dismiss = (reason: 'skip' | 'cancel' | 'sent'): void => {
    requestId.current += 1;
    resetForm();
    onDismiss(reason);
  };

  const canSend = message.trim().length > 0 && !busy;

  const onSubmit = (): void => {
    if (!canSend) {
      return;
    }
    setBusy(true);
    setError(null);
    const context = {
      screen,
      ...(nickname !== undefined ? { nickname } : {}),
      ...(gameCode !== undefined ? { gameCode } : {}),
      ...(playKind !== undefined ? { playKind } : {}),
      ...(actionLog !== undefined ? { actionLog } : {}),
    };
    const id = requestId.current;
    void submitFeedback(
      buildFeedbackPayload(kind, message, context, contact),
    ).then((result) => {
      if (id !== requestId.current) {
        return;
      }
      setBusy(false);
      if (result.ok) {
        dismiss('sent');
        return;
      }
      setError(result.message);
    });
  };

  return (
    <Dialog
      open={open}
      title="Feedback"
      panelClassName="max-w-md"
      closeOnOverlayClick
      onClose={() => {
        dismiss(mode === 'ask' ? 'skip' : 'cancel');
      }}
      actions={
        <>
          <Button
            compact
            type="button"
            variant="orange"
            disabled={busy}
            onClick={() => {
              dismiss(mode === 'ask' ? 'skip' : 'cancel');
            }}
          >
            {mode === 'ask' ? 'Skip' : 'Cancel'}
          </Button>
          <Button
            compact
            type="button"
            variant="green"
            disabled={!canSend}
            onClick={onSubmit}
          >
            {busy ? 'Sending…' : 'Send'}
          </Button>
        </>
      }
    >
      <fieldset className="border-0 p-0">
        <legend className="text-sm font-medium text-ink">Kind</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {FEEDBACK_KINDS.map((id) => (
            <Button
              key={id}
              compact
              type="button"
              variant={kind === id ? 'green' : 'orange'}
              onClick={() => {
                setKind(id);
              }}
            >
              {KIND_LABEL[id]}
            </Button>
          ))}
        </div>
      </fieldset>

      <label className="mt-4 block text-sm font-medium text-ink">
        Message
        <textarea
          className={`${inputClassName} min-h-28`}
          value={message}
          maxLength={4000}
          onChange={(event) => {
            setMessage(event.target.value);
          }}
        />
      </label>

      <label className="mt-3 block text-sm font-medium text-ink">
        Contact (optional)
        <input
          className={inputClassName}
          value={contact}
          maxLength={200}
          autoComplete="email"
          onChange={(event) => {
            setContact(event.target.value);
          }}
        />
      </label>

      {error !== null ? (
        <p className="mt-3 text-sm text-cta-red" role="alert">
          {error}
        </p>
      ) : null}
    </Dialog>
  );
}
