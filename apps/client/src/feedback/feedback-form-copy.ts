/**
 * Feedback Dialog copy (technical spec v6 §7.1 / L47-06 / L57-05).
 * Ask-mode is the Lot 47 ticket with Skip (Game over / Return home).
 * Manual is the same ticket with Cancel (Home, Lobby, `!`).
 */

import {
  isFeedbackTopicsComplete,
  type FeedbackKind,
  type FeedbackTopic,
} from '@card-battle/shared';

export type FeedbackFormMode = 'ask' | 'manual';

export const FEEDBACK_ABOUT_LEGEND = 'About';
export const FEEDBACK_TITLE = 'Feedback';
/** Ask-mode lead — Skip still leaves after a finished hub leave (L57-03 / L57-05). */
export const FEEDBACK_ASK_LEAD = 'Skip is fine.';

export function feedbackDialogTitle(mode: FeedbackFormMode): string {
  switch (mode) {
    case 'ask':
    case 'manual':
      return FEEDBACK_TITLE;
  }
}

/**
 * Ask and manual post the fields the tester picked. Designer 2026-09-14
 * L57-05: Return home shows the same ticket as Home, not a one-sentence stub.
 */
export function resolveFeedbackSubmitFields(
  mode: FeedbackFormMode,
  kind: FeedbackKind,
  topics: readonly FeedbackTopic[],
): { kind: FeedbackKind; topics: readonly FeedbackTopic[] } {
  switch (mode) {
    case 'ask':
    case 'manual':
      return { kind, topics };
  }
}

export function feedbackAboutHint(kind: FeedbackKind): string {
  if (kind === 'bug') {
    return 'Tap every area it touches — you can pick several.';
  }
  if (kind === 'confusion') {
    return 'Where was it unclear? Optional.';
  }
  return 'What would this change? Optional.';
}

export function feedbackMessagePlaceholder(kind: FeedbackKind): string {
  if (kind === 'bug') {
    return 'What happened, and what did you expect?';
  }
  if (kind === 'confusion') {
    return 'What was unclear?';
  }
  return 'What would you add or change?';
}

export function feedbackSendHint(
  kind: FeedbackKind,
  topics: readonly FeedbackTopic[],
  message: string,
): string | null {
  if (kind === 'bug' && topics.length === 0 && message.trim().length > 0) {
    return 'Pick at least one area to send a bug.';
  }
  return null;
}

export function canSendFeedbackForm(input: {
  kind: FeedbackKind;
  message: string;
  topics: readonly FeedbackTopic[];
  busy: boolean;
  mode?: FeedbackFormMode;
}): boolean {
  const fields = resolveFeedbackSubmitFields(
    input.mode ?? 'manual',
    input.kind,
    input.topics,
  );
  return (
    !input.busy &&
    input.message.trim().length > 0 &&
    isFeedbackTopicsComplete(fields.kind, fields.topics)
  );
}
