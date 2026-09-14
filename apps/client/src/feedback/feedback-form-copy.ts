/**
 * Feedback Dialog copy (technical spec v6 §7.1 / L47-06 / L57-02).
 * Manual is the Lot 47 ticket. Ask-mode is one sentence (confusion, no chips).
 */

import {
  isFeedbackTopicsComplete,
  type FeedbackKind,
  type FeedbackTopic,
} from '@card-battle/shared';

export type FeedbackFormMode = 'ask' | 'manual';

export const FEEDBACK_ABOUT_LEGEND = 'About';
export const FEEDBACK_MANUAL_TITLE = 'Feedback';
/** Ask-mode Dialog title — technical spec v6 §2.2 / §7.1. */
export const FEEDBACK_ASK_TITLE = 'One sentence for the beta';
export const FEEDBACK_ASK_LEAD = 'Skip is fine.';
export const FEEDBACK_ASK_PLACEHOLDER = 'What was unclear, broken, or missing?';
export const ASK_FEEDBACK_KIND: FeedbackKind = 'confusion';
export const ASK_FEEDBACK_TOPICS: readonly FeedbackTopic[] = [];

export function feedbackDialogTitle(mode: FeedbackFormMode): string {
  return mode === 'ask' ? FEEDBACK_ASK_TITLE : FEEDBACK_MANUAL_TITLE;
}

export function feedbackMessagePlaceholderFor(
  mode: FeedbackFormMode,
  kind: FeedbackKind,
): string {
  if (mode === 'ask') {
    return FEEDBACK_ASK_PLACEHOLDER;
  }
  return feedbackMessagePlaceholder(kind);
}

/**
 * Ask-mode always posts confusion with no About chips so friends are not
 * filling a ticket at Game over — technical spec v6 §7.1.
 */
export function resolveFeedbackSubmitFields(
  mode: FeedbackFormMode,
  kind: FeedbackKind,
  topics: readonly FeedbackTopic[],
): { kind: FeedbackKind; topics: readonly FeedbackTopic[] } {
  if (mode === 'ask') {
    return { kind: ASK_FEEDBACK_KIND, topics: ASK_FEEDBACK_TOPICS };
  }
  return { kind, topics };
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
