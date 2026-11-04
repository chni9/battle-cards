// @vitest-environment happy-dom
/**
 * The Feedback sheet, rendered: technical spec v7 §7.7 (a 15 s client timeout) and the Lot 76 backlog review (Sent closes by itself; a
 * timeout), §5.2, §10.6, §11 (Q6, Q68, Q69, Q71); Appendix A `global-feedback-dialog`,
 * `feedback-dialog-dismiss`, `global-text-input-no-ios-zoom`, `global-dialog-interaction-contract`;
 * L47-03, L47-06, L57-05; Part 2 Review Focus 2 (L76-07). Replaces the source-text
 * `feedback-dialog.test.ts`.
 */
import {
  FEEDBACK_TOPICS, FEEDBACK_TOPIC_LABEL, PROTOCOL_VERSION, type ActionLogEntryView, type FeedbackSubmitBody,
} from '@card-battle/shared';
import { act, screen, waitFor, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { useState, type ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderUi, type RenderUiOptions } from '../test/render';
import { FeedbackDialog, type FeedbackDialogProps } from './feedback-dialog';
import {
  FEEDBACK_ASK_LEAD, FEEDBACK_FALLBACK_ERROR, FEEDBACK_SENT_BODY, FEEDBACK_SENT_DISMISS_LABEL, FEEDBACK_SENT_TITLE,
  feedbackMessagePlaceholder, feedbackSendHint,
} from './feedback-form-copy';
import { FEEDBACK_SEND_TIMEOUT_MS, FEEDBACK_SENT_CLOSE_MS } from './feedback-timing';

type SubmitResult = { ok: true } | { ok: false; message: string };
const feedback = vi.hoisted(() => ({ submit: vi.fn<(body: FeedbackSubmitBody) => Promise<SubmitResult>>() }));
vi.mock('./submit-feedback', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./submit-feedback')>()),
  submitFeedback: feedback.submit,
}));

type Dismiss = FeedbackDialogProps['onDismiss'];
type SheetProps = Omit<FeedbackDialogProps, 'open'>;

/** A caller like Home, the lobby or the arena: any onDismiss closes the sheet. */
function Host(props: SheetProps): ReactElement {
  const [open, setOpen] = useState(true);
  return (
    <FeedbackDialog
      {...props}
      open={open}
      onDismiss={(reason) => {
        props.onDismiss(reason);
        setOpen(false);
      }}
    />
  );
}
function renderSheet(overrides: Partial<Omit<SheetProps, 'onDismiss'>> = {}, options: RenderUiOptions = {}) {
  const onDismiss = vi.fn<Dismiss>();
  const props: SheetProps = { mode: 'manual', screen: 'home', onDismiss, ...overrides };
  return { onDismiss, ...renderUi(<Host {...props} />, { reducedMotion: true, ...options }) };
}
const sheet = (name = 'Feedback'): HTMLElement => screen.getByRole('dialog', { name });
const control = (name: string, role: 'button' | 'radio' | 'textbox' = 'button'): HTMLElement =>
  within(sheet()).getByRole(role, { name });
const messageValue = (): string => within(sheet()).getByRole<HTMLTextAreaElement>('textbox', { name: 'Message' }).value;
const isDisabled = (element: HTMLElement): boolean =>
  element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true';
function backdrop(dialog: HTMLElement): HTMLElement {
  const overlay = dialog.closest<HTMLElement>('[data-zone="sheet-overlay"]');
  if (overlay === null) throw new Error('no backdrop');
  return overlay;
}
/** Lets the mocked POST answer and React render the answer. */
async function settle(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}
async function gone(name: string): Promise<void> {
  await waitFor(() => {
    expect(screen.queryByRole('dialog', { name, hidden: true })).toBeNull();
  });
}
function deferred(): { promise: Promise<SubmitResult>; resolve: (result: SubmitResult) => void } {
  let resolve: (result: SubmitResult) => void = () => undefined;
  const promise = new Promise<SubmitResult>((answer) => {
    resolve = answer;
  });
  return { promise, resolve };
}
/** An Idea needs no area, so a message alone enables Send. */
async function writeIdea(user: UserEvent, message: string): Promise<void> {
  await user.click(control('Idea', 'radio'));
  await user.type(control('Message', 'textbox'), message);
}
const ENTRY: ActionLogEntryView = { kind: 'rewardsClaimed', eliminatorPlayerId: 'p1', eliminatedPlayerId: 'p2', turnSequence: 3 };

beforeEach(() => {
  feedback.submit.mockReset();
  feedback.submit.mockResolvedValue({ ok: true });
});

describe('the Feedback ticket (spec v7 §7.7, §11 Q71; L47-06, L57-05)', () => {
  it('shows Kind as a radio group on Bug, the About chips in catalog order, 16 px Message and Contact, Cancel, and Send off', () => {
    renderSheet();
    const dialog = sheet();
    const kind = within(dialog).getByRole('radiogroup', { name: 'Kind' });
    expect(within(kind).getAllByRole('radio').map((radio) => [radio.textContent, radio.getAttribute('aria-checked')])).toEqual([
      ['Bug', 'true'], ['Confusion', 'false'], ['Idea', 'false'],
    ]);
    const about = within(dialog).getByRole('group', { name: 'About' });
    expect(within(about).getAllByRole('button').map((chip) => [chip.textContent, chip.getAttribute('aria-pressed')])).toEqual(
      FEEDBACK_TOPICS.map((id) => [FEEDBACK_TOPIC_LABEL[id], 'false']),
    );
    const message = control('Message', 'textbox');
    const contact = control('Contact (optional)', 'textbox');
    expect([message.tagName, message.getAttribute('maxlength'), contact.getAttribute('maxlength'), contact.getAttribute('autocomplete')])
      .toEqual(['TEXTAREA', '4000', '200', 'email']);
    expect([message, contact].every((field) => field.classList.contains('text-v7-input'))).toBe(true);
    expect(control('Cancel')).toBeTruthy();
    expect(within(dialog).queryByText(FEEDBACK_ASK_LEAD)).toBeNull();
    expect(isDisabled(control('Send'))).toBe(true);
  });

  it.each([
    { mode: 'ask', dismiss: 'Skip', reason: 'skip' },
    { mode: 'manual', dismiss: 'Cancel', reason: 'cancel' },
  ] as const)('in $mode mode, $dismiss, Esc and the backdrop each report $reason once', async ({ mode, dismiss, reason }) => {
    for (const way of ['button', 'Escape', 'backdrop'] as const) {
      const { user, onDismiss, unmount } = renderSheet({ mode });
      const dialog = sheet();
      expect(within(dialog).queryByText(FEEDBACK_ASK_LEAD) !== null).toBe(mode === 'ask');
      if (way === 'button') await user.click(within(dialog).getByRole('button', { name: dismiss }));
      else if (way === 'Escape') await user.keyboard('{Escape}');
      else await user.click(backdrop(dialog));
      expect(onDismiss.mock.calls, way).toEqual([[reason]]);
      await gone('Feedback');
      unmount();
    }
    expect(feedback.submit).not.toHaveBeenCalled();
  });

  it('drops the draft on every dismissal (L47-03)', async () => {
    const onDismiss = vi.fn<Dismiss>();
    const { user } = renderUi(<FeedbackDialog open mode="manual" screen="home" onDismiss={onDismiss} />, { reducedMotion: true });
    await user.click(control('Gameplay'));
    await user.type(control('Message', 'textbox'), 'Draw froze');
    await user.click(control('Cancel'));
    expect(onDismiss.mock.calls).toEqual([['cancel']]);
    // The parent kept it open, so the same sheet shows a fresh ticket.
    expect(messageValue()).toBe('');
    expect(control('Gameplay').getAttribute('aria-pressed')).toBe('false');
  });

  it('keeps Send off for a blank message and for a bug with no area, with the hint; Kind changes by keyboard and keeps the areas', async () => {
    const { user } = renderSheet();
    const message = control('Message', 'textbox');
    await user.type(message, '   ');
    expect(isDisabled(control('Send'))).toBe(true);
    expect(within(sheet()).queryByRole('status')).toBeNull();
    await user.type(message, 'Draw froze');
    expect(isDisabled(control('Send'))).toBe(true);
    expect(within(sheet()).getByRole('status').textContent).toBe(feedbackSendHint('bug', [], 'Draw froze'));
    await user.click(control('Gameplay'));
    expect(control('Gameplay').getAttribute('aria-pressed')).toBe('true');
    expect(within(sheet()).queryByRole('status')).toBeNull();
    expect(isDisabled(control('Send'))).toBe(false);
    act(() => {
      control('Bug', 'radio').focus();
    });
    await user.keyboard('{ArrowRight}');
    expect(control('Confusion', 'radio').getAttribute('aria-checked')).toBe('true');
    expect(document.activeElement).toBe(control('Confusion', 'radio'));
    expect(message.getAttribute('placeholder')).toBe(feedbackMessagePlaceholder('confusion'));
    expect(control('Gameplay').getAttribute('aria-pressed')).toBe('true');
  });

  it('sends one POST on a double click, and one on two clicks in the same tick (the in-flight gate, L47-03)', async () => {
    feedback.submit.mockReturnValue(new Promise<SubmitResult>(() => undefined)); // no answer: the sheet stays busy
    const first = renderSheet();
    await writeIdea(first.user, 'More kits');
    await first.user.dblClick(control('Send'));
    expect(feedback.submit).toHaveBeenCalledTimes(1);
    first.unmount();
    feedback.submit.mockClear();
    const second = renderSheet();
    await writeIdea(second.user, 'More kits');
    const send = control('Send');
    act(() => {
      send.click();
      send.click();
    });
    expect(feedback.submit).toHaveBeenCalledTimes(1);
  });

  it('locks Esc, the backdrop and Skip while sending, and frees them when the answer comes', async () => {
    const answer = deferred();
    feedback.submit.mockReturnValueOnce(answer.promise);
    const { user, onDismiss } = renderSheet({ mode: 'ask', screen: 'end' });
    await writeIdea(user, 'More kits');
    await user.click(control('Send'));
    const dialog = sheet();
    expect(isDisabled(control('Skip'))).toBe(true);
    expect(isDisabled(control('Sending…'))).toBe(true);
    await user.keyboard('{Escape}');
    await user.click(backdrop(dialog));
    expect(sheet()).toBe(dialog);
    expect(onDismiss).not.toHaveBeenCalled();
    answer.resolve({ ok: false, message: 'Too many reports' });
    await settle();
    expect(isDisabled(control('Skip'))).toBe(false);
    await user.keyboard('{Escape}');
    expect(onDismiss.mock.calls).toEqual([['skip']]);
  });

  it('shows a failure in words and keeps the ticket, and a retry can send (L47-03)', async () => {
    feedback.submit.mockResolvedValueOnce({ ok: false, message: 'Too many reports' });
    const { user, onDismiss } = renderSheet();
    await writeIdea(user, 'More kits');
    await user.click(control('Send'));
    await settle();
    expect(within(sheet()).getByRole('alert').textContent).toBe('Too many reports');
    expect(messageValue()).toBe('More kits');
    expect(control('Idea', 'radio').getAttribute('aria-checked')).toBe('true');
    await user.click(control('Send'));
    await settle();
    expect(sheet(FEEDBACK_SENT_TITLE)).toBeTruthy();
    expect(feedback.submit).toHaveBeenCalledTimes(2);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("sends today's payload in ask mode: the tester's kind, areas in catalog order and contact, the context and the log tail; never the seed", async () => {
    const { user } = renderSheet({ mode: 'ask', screen: 'end', nickname: 'Ada', gameCode: 'ABCDEF', playKind: 'classic', actionLog: [ENTRY] });
    await user.click(control('Card'));
    await user.click(control('UI'));
    await user.type(control('Message', 'textbox'), '  Shield did not block  ');
    await user.type(control('Contact (optional)', 'textbox'), ' ada@example.com {Enter}');
    expect(feedback.submit).not.toHaveBeenCalled(); // no <form>: Enter never sends
    await user.click(control('Send'));
    expect(feedback.submit.mock.calls).toEqual([[{
      kind: 'bug', message: 'Shield did not block', screen: 'end', protocolVersion: PROTOCOL_VERSION,
      topics: ['ui', 'card'], contact: 'ada@example.com', nickname: 'Ada', gameCode: 'ABCDEF', playKind: 'classic', logTail: [ENTRY],
    }]]);
    expect(JSON.stringify(feedback.submit.mock.calls)).not.toContain('seed');
  });
});

describe('Sent (spec v7 §7.7 amended, Q6/Q68/Q69; L76-07 Review)', () => {
  it('replaces the ticket with Sent, focuses OK, and closes by itself after FEEDBACK_SENT_CLOSE_MS with one sent', async () => {
    vi.useFakeTimers();
    const { user, onDismiss } = renderSheet({}, { advanceTimers: vi.advanceTimersByTime });
    await writeIdea(user, 'More kits');
    await user.click(control('Send'));
    await settle();
    const sent = sheet(FEEDBACK_SENT_TITLE);
    expect(screen.queryByRole('dialog', { name: 'Feedback' })).toBeNull();
    expect(within(sent).getByRole('status').textContent).toBe(FEEDBACK_SENT_BODY);
    expect(document.activeElement).toBe(within(sent).getByRole('button', { name: FEEDBACK_SENT_DISMISS_LABEL }));
    act(() => {
      vi.advanceTimersByTime(FEEDBACK_SENT_CLOSE_MS - 1);
    });
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onDismiss.mock.calls).toEqual([['sent']]);
    act(() => {
      vi.advanceTimersByTime(FEEDBACK_SEND_TIMEOUT_MS); // the send timer was cleared by the answer
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
    // happy-dom finishes the sheet's exit fade on its own real-time clock, which a fake-clock waitFor never reaches.
    vi.useRealTimers();
    await gone(FEEDBACK_SENT_TITLE);
  });

  it.each(['OK', 'Escape', 'backdrop'] as const)('closing Sent early with %s reports sent once, and the timer never reports it again', async (way) => {
    vi.useFakeTimers();
    const { user, onDismiss } = renderSheet({}, { advanceTimers: vi.advanceTimersByTime });
    await writeIdea(user, 'More kits');
    await user.click(control('Send'));
    await settle();
    const sent = sheet(FEEDBACK_SENT_TITLE);
    if (way === 'OK') await user.click(within(sent).getByRole('button', { name: FEEDBACK_SENT_DISMISS_LABEL }));
    else if (way === 'Escape') await user.keyboard('{Escape}');
    else await user.click(backdrop(sent));
    expect(onDismiss.mock.calls).toEqual([['sent']]);
    act(() => {
      vi.advanceTimersByTime(FEEDBACK_SENT_CLOSE_MS * 2);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('reports sent once when OK lands as the auto-close fires (the per-open latch, A.9 ruling 5)', async () => {
    vi.useFakeTimers();
    const { user, onDismiss } = renderSheet({}, { advanceTimers: vi.advanceTimersByTime });
    await writeIdea(user, 'More kits');
    await user.click(control('Send'));
    await settle();
    const ok = within(sheet(FEEDBACK_SENT_TITLE)).getByRole('button', { name: FEEDBACK_SENT_DISMISS_LABEL });
    act(() => {
      vi.advanceTimersByTime(FEEDBACK_SENT_CLOSE_MS - 1);
    });
    expect(onDismiss).not.toHaveBeenCalled();
    // One act: OK is pressed, then the 1.5 s timer fires before React re-renders and clears it.
    act(() => {
      ok.click();
      vi.advanceTimersByTime(2);
    });
    expect(onDismiss.mock.calls).toEqual([['sent']]);
    act(() => {
      vi.advanceTimersByTime(FEEDBACK_SENT_CLOSE_MS);
    });
    expect(onDismiss.mock.calls).toEqual([['sent']]);
  });
});

describe('a send that never answers (Part 2 Review Focus 2; spec v7 §7.7 amended)', () => {
  it('keeps dismissal locked for 15 s, then unlocks it with the error; a late success sends no second sent', async () => {
    vi.useFakeTimers();
    const hung = deferred();
    const retry = deferred();
    feedback.submit.mockReturnValueOnce(hung.promise).mockReturnValueOnce(retry.promise);
    const { user, onDismiss } = renderSheet({}, { advanceTimers: vi.advanceTimersByTime });
    await writeIdea(user, 'More kits');
    await user.click(control('Send'));
    act(() => {
      vi.advanceTimersByTime(FEEDBACK_SEND_TIMEOUT_MS - 1);
    });
    expect(isDisabled(control('Cancel'))).toBe(true);
    await user.keyboard('{Escape}');
    expect(onDismiss).not.toHaveBeenCalled();
    expect(within(sheet()).queryByRole('alert')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(within(sheet()).getByRole('alert').textContent).toBe(FEEDBACK_FALLBACK_ERROR);
    expect(isDisabled(control('Cancel'))).toBe(false);
    expect(isDisabled(control('Send'))).toBe(false);
    hung.resolve({ ok: true }); // the first POST answers late: ignored
    await settle();
    expect(screen.queryByRole('dialog', { name: FEEDBACK_SENT_TITLE })).toBeNull();
    expect(onDismiss).not.toHaveBeenCalled();
    await user.click(control('Send')); // the retry
    retry.resolve({ ok: true });
    await settle();
    expect(sheet(FEEDBACK_SENT_TITLE)).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(FEEDBACK_SENT_CLOSE_MS);
    });
    expect(onDismiss.mock.calls).toEqual([['sent']]);
    expect(feedback.submit).toHaveBeenCalledTimes(2);
  });
});
