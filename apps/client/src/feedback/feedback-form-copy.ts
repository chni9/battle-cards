/**
 * Feedback Dialog copy (technical spec v6 §7.1 / L47-06).
 * Kind-specific prompts so testers fill a scannable report.
 */

import {
  isFeedbackTopicsComplete,
  type FeedbackKind,
  type FeedbackTopic,
} from '@card-battle/shared';

export const FEEDBACK_ABOUT_LEGEND = 'About';

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
}): boolean {
  return (
    !input.busy &&
    input.message.trim().length > 0 &&
    isFeedbackTopicsComplete(input.kind, input.topics)
  );
}
