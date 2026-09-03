import { describe, expect, it } from 'vitest';

import {
  FEEDBACK_ABOUT_LEGEND,
  canSendFeedbackForm,
  feedbackAboutHint,
  feedbackMessagePlaceholder,
} from './feedback-form-copy';

describe('feedback form copy (technical spec v6 §7.1 / L47-06)', () => {
  it('requires at least one About chip before sending a bug', () => {
    expect(FEEDBACK_ABOUT_LEGEND).toBe('About');
    expect(
      canSendFeedbackForm({
        kind: 'bug',
        message: 'broken draw',
        topics: [],
        busy: false,
      }),
    ).toBe(false);
    expect(
      canSendFeedbackForm({
        kind: 'bug',
        message: 'broken draw',
        topics: ['ui', 'card'],
        busy: false,
      }),
    ).toBe(true);
    expect(
      canSendFeedbackForm({
        kind: 'idea',
        message: 'a recap filter',
        topics: [],
        busy: false,
      }),
    ).toBe(true);
  });

  it('uses kind-specific hints and placeholders', () => {
    expect(feedbackAboutHint('bug')).toContain('several');
    expect(feedbackMessagePlaceholder('bug')).toContain('expect');
    expect(feedbackMessagePlaceholder('confusion')).toContain('unclear');
    expect(feedbackMessagePlaceholder('idea')).toContain('change');
  });
});
