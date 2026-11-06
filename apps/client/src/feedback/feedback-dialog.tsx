/**
 * The Feedback sheet (technical spec v7 §7.7 amended, §5.2, §11 Q71; L47-03, L47-06, L57-05;
 * L76-07). A V7 `Dialog`: a bottom sheet on phones and a centered panel on desktop, in the sheet
 * stack. Ask mode is the same Lot 47 ticket with Skip and the lead line; manual has Cancel. The
 * props are unchanged, so Home, the lobby, the arena and End mount it as
 * before; the parent marks asked (End) and closes the sheet on `onDismiss`. It never leaves the
 * game.
 *
 * Kind is a `Segmented` radio group (Q71); the About chips keep `aria-pressed`; Message
 * (`TextArea`) and Contact (`TextField`) are 16 px (§5.2). There is no `<form>`, so Enter never
 * sends. Send claims the synchronous in-flight gate before the POST (L47-03), and the request id
 * drops any answer that arrives after a dismissal or the timeout. While sending, `dismissLocked`
 * ignores Esc, backdrop and swipe and Skip / Cancel are disabled; Kind and the chips stay live.
 * With no answer after `FEEDBACK_SEND_TIMEOUT_MS` the sheet unlocks with the fallback error. A
 * success retitles the same sheet 'Sent', which closes after `FEEDBACK_SENT_CLOSE_MS` or on OK,
 * Esc, backdrop or swipe, and reports `onDismiss('sent')` once: `useOncePerOpen` (plan A.9 ruling 5)
 * latches that report per Sent, so OK pressed as the timer fires still reports once (decisions.md
 * L76-07).
 */

import {
  FEEDBACK_KINDS,
  FEEDBACK_TOPICS,
  FEEDBACK_TOPIC_LABEL,
  isFeedbackTopicsComplete,
  toggleFeedbackTopic,
  type ActionLogEntryView,
  type FeedbackKind,
  type FeedbackScreen,
  type FeedbackTopic,
  type PlayKind,
} from '@card-battle/shared';
import { useEffect, useEffectEvent, useRef, useState, type ReactElement } from 'react';

import { useOncePerOpen } from '../screens/use-once-per-open';
import { Icon } from '../ui/icons/icon';
import { usePrefersReducedMotion } from '../ui/motion/use-prefers-reduced-motion';
import { Button } from '../ui/primitives/button';
import {
  BUTTON_VARIANT_CLASS,
  CHROME_DISABLED_CLASS,
  CHROME_FOCUS_CLASS,
  CHROME_SHAPE_SM_CLASS,
  chromePressClass,
  motionAttribute,
} from '../ui/primitives/chrome-classes';
import { Dialog } from '../ui/primitives/dialog';
import { Segmented, type SegmentedOption } from '../ui/primitives/segmented';
import { TextArea } from '../ui/primitives/text-area';
import { TextField } from '../ui/primitives/text-field';
import { buildFeedbackPayload } from './build-feedback-payload';
import {
  FEEDBACK_ABOUT_LEGEND,
  FEEDBACK_ASK_LEAD,
  FEEDBACK_FALLBACK_ERROR,
  FEEDBACK_SENT_BODY,
  FEEDBACK_SENT_DISMISS_LABEL,
  FEEDBACK_SENT_TITLE,
  canSendFeedbackForm,
  feedbackAboutHint,
  feedbackDialogTitle,
  feedbackMessagePlaceholder,
  feedbackSendHint,
  resolveFeedbackSubmitFields,
  type FeedbackFormMode,
} from './feedback-form-copy';
import { FEEDBACK_SEND_TIMEOUT_MS, FEEDBACK_SENT_CLOSE_MS } from './feedback-timing';
import { submitFeedback } from './submit-feedback';
import { beginFeedbackSend, endFeedbackSend } from './submit-gate';

const KIND_LABEL: Record<FeedbackKind, string> = {
  bug: 'Bug',
  confusion: 'Confusion',
  idea: 'Idea',
};

const KIND_OPTIONS: readonly SegmentedOption<FeedbackKind>[] = FEEDBACK_KINDS.map((value) => ({
  value,
  label: KIND_LABEL[value],
}));

export type FeedbackDialogMode = FeedbackFormMode;

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
}: FeedbackDialogProps): ReactElement | null {
  const reduced = usePrefersReducedMotion();
  const [kind, setKind] = useState<FeedbackKind>('bug');
  const [topics, setTopics] = useState<readonly FeedbackTopic[]>([]);
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const requestId = useRef(0);
  const inFlight = useRef(false);
  const sendTimer = useRef<number | null>(null);
  const okSlot = useRef<HTMLSpanElement>(null);
  // Per Sent, not per open: a second Sent in the same open (a parent that did not close) is a new report.
  const once = useOncePerOpen(open && sent);

  const clearSendTimer = (): void => {
    if (sendTimer.current === null) return;
    window.clearTimeout(sendTimer.current);
    sendTimer.current = null;
  };

  const resetForm = (): void => {
    setKind('bug');
    setTopics([]);
    setMessage('');
    setContact('');
    setBusy(false);
    setError(null);
    setSent(false);
    clearSendTimer();
    endFeedbackSend(inFlight);
  };

  const dismiss = (reason: 'skip' | 'cancel' | 'sent'): void => {
    requestId.current += 1;
    resetForm();
    onDismiss(reason);
  };

  // Every way out of Sent reports through the latch: callers close on it, so it is once per open.
  const closeSent = (): void => {
    once(() => {
      dismiss('sent');
    });
  };

  const submitted = resolveFeedbackSubmitFields(mode, kind, topics);
  const canSend = canSendFeedbackForm({ kind, message, topics, busy, mode });
  const sendHint = feedbackSendHint(kind, topics, message);
  const ticketDismissReason = mode === 'ask' ? 'skip' : 'cancel';

  const onSubmit = (): void => {
    if (
      !isFeedbackTopicsComplete(submitted.kind, submitted.topics) ||
      message.trim().length === 0 ||
      !beginFeedbackSend(inFlight)
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    const context = {
      screen,
      topics: submitted.topics,
      ...(nickname !== undefined ? { nickname } : {}),
      ...(gameCode !== undefined ? { gameCode } : {}),
      ...(playKind !== undefined ? { playKind } : {}),
      ...(actionLog !== undefined ? { actionLog } : {}),
    };
    const id = requestId.current;
    const payload = buildFeedbackPayload(
      submitted.kind,
      message,
      context,
      contact,
    );
    // Spec v7 §7.7: no answer in 15 s unlocks the sheet; the late answer is then ignored.
    clearSendTimer();
    sendTimer.current = window.setTimeout(() => {
      sendTimer.current = null;
      if (id !== requestId.current) return;
      requestId.current += 1;
      endFeedbackSend(inFlight);
      setBusy(false);
      setError(FEEDBACK_FALLBACK_ERROR);
    }, FEEDBACK_SEND_TIMEOUT_MS);
    void submitFeedback(payload).then((result) => {
      if (id !== requestId.current) {
        return;
      }
      clearSendTimer();
      endFeedbackSend(inFlight);
      setBusy(false);
      if (result.ok) {
        setSent(true);
        return;
      }
      setError(result.message);
    });
  };

  // An unmount mid-send (the lobby starts, the table leaves) must not leave the timer behind.
  useEffect(() => {
    const timer = sendTimer;
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  // Sent closes by itself; OK, Esc, backdrop or swipe close it first and clear this timer.
  const autoCloseSent = useEffectEvent(() => {
    closeSent();
  });
  useEffect(() => {
    if (!open || !sent) return;
    const timer = window.setTimeout(() => {
      autoCloseSent();
    }, FEEDBACK_SENT_CLOSE_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [open, sent]);

  // The Send button the player pressed is gone; OK takes focus (the Button primitive takes no ref).
  useEffect(() => {
    if (sent) okSlot.current?.querySelector('button')?.focus();
  }, [sent]);

  return (
    <Dialog
      open={open}
      title={sent ? FEEDBACK_SENT_TITLE : feedbackDialogTitle(mode)}
      dismissLocked={busy}
      dataAttributes={{ 'data-feedback-sheet': sent ? 'sent' : mode }}
      onClose={() => {
        if (sent) closeSent();
        else dismiss(ticketDismissReason);
      }}
      actions={
        sent ? (
          <span ref={okSlot} className="contents">
            <Button variant="primary" onClick={closeSent}>
              {FEEDBACK_SENT_DISMISS_LABEL}
            </Button>
          </span>
        ) : (
          <>
            <Button
              variant="quiet"
              disabled={busy}
              onClick={() => {
                dismiss(ticketDismissReason);
              }}
            >
              {mode === 'ask' ? 'Skip' : 'Cancel'}
            </Button>
            <Button variant="primary" disabled={!canSend} onClick={onSubmit}>
              {busy ? 'Sending…' : 'Send'}
            </Button>
          </>
        )
      }
    >
      {sent ? (
        <div className="flex items-center gap-3">
          <Icon name="check" size={40} />
          <p role="status" className="font-v7-body text-v7-body font-bold text-v7-text">
            {FEEDBACK_SENT_BODY}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {mode === 'ask' ? (
            <p className="font-v7-body text-v7-body text-v7-text-2">{FEEDBACK_ASK_LEAD}</p>
          ) : null}

          <div className="flex flex-col gap-1">
            {/* The radiogroup's own label names it once for screen readers. */}
            <p aria-hidden="true" className="font-v7-body text-v7-body font-extrabold text-v7-text">
              Kind
            </p>
            <Segmented<FeedbackKind> label="Kind" options={KIND_OPTIONS} value={kind} onChange={setKind} />
          </div>

          <fieldset className="m-0 min-w-0 border-0 p-0">
            <legend className="p-0 font-v7-body text-v7-body font-extrabold text-v7-text">
              {FEEDBACK_ABOUT_LEGEND}
            </legend>
            <p className="mt-1 font-v7-body text-v7-caption font-bold text-v7-text-2">{feedbackAboutHint(kind)}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {FEEDBACK_TOPICS.map((id) => {
                const selected = topics.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={selected}
                    data-motion={motionAttribute(reduced)}
                    onClick={() => {
                      setTopics(toggleFeedbackTopic(topics, id));
                    }}
                    className={[
                      'inline-flex min-h-11 items-center px-3 font-v7-display text-v7-body leading-none',
                      CHROME_SHAPE_SM_CLASS,
                      CHROME_FOCUS_CLASS,
                      CHROME_DISABLED_CLASS,
                      chromePressClass(reduced),
                      selected ? 'bg-v7-cta-2 text-v7-text-on-cta' : BUTTON_VARIANT_CLASS.quiet,
                    ].join(' ')}
                  >
                    {FEEDBACK_TOPIC_LABEL[id]}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* `--danger` text fails AA at caption size, so the words stay `--text`. */}
          {sendHint !== null ? (
            <p role="status" className="font-v7-body text-v7-caption font-extrabold text-v7-text">
              {sendHint}
            </p>
          ) : null}

          <TextArea
            label="Message"
            rows={4}
            maxLength={4000}
            placeholder={feedbackMessagePlaceholder(kind)}
            value={message}
            onChange={(event) => {
              setMessage(event.currentTarget.value);
            }}
          />

          <TextField
            label="Contact (optional)"
            maxLength={200}
            autoComplete="email"
            value={contact}
            onChange={(event) => {
              setContact(event.currentTarget.value);
            }}
          />

          {error !== null ? (
            <p
              role="alert"
              className={`bg-v7-panel-2 px-3 py-2.5 ring-2 ring-inset ring-v7-danger ${CHROME_SHAPE_SM_CLASS} font-v7-body text-v7-body font-bold text-v7-text`}
            >
              {error}
            </p>
          ) : null}
        </div>
      )}
    </Dialog>
  );
}
