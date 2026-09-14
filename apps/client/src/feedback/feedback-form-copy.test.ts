import { describe, expect, it } from 'vitest';

import {
  ASK_FEEDBACK_KIND,
  ASK_FEEDBACK_TOPICS,
  FEEDBACK_ABOUT_LEGEND,
  FEEDBACK_ASK_LEAD,
  FEEDBACK_ASK_PLACEHOLDER,
  FEEDBACK_ASK_TITLE,
  FEEDBACK_MANUAL_TITLE,
  canSendFeedbackForm,
  feedbackAboutHint,
  feedbackDialogTitle,
  feedbackMessagePlaceholder,
  feedbackMessagePlaceholderFor,
  feedbackSendHint,
  resolveFeedbackSubmitFields,
} from './feedback-form-copy';

describe('feedback form copy (technical spec v6 §7.1 / L47-06 / L57-02)', () => {
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
    expect(feedbackSendHint('bug', [], 'broken draw')).toBe(
      'Pick at least one area to send a bug.',
    );
    expect(feedbackSendHint('bug', ['ui'], 'broken draw')).toBeNull();
  });

  it('uses kind-specific hints and placeholders', () => {
    expect(feedbackAboutHint('bug')).toContain('several');
    expect(feedbackMessagePlaceholder('bug')).toContain('expect');
    expect(feedbackMessagePlaceholder('confusion')).toContain('unclear');
    expect(feedbackMessagePlaceholder('idea')).toContain('change');
  });

  it('posts ask-mode as confusion with no topics even if the form held a bug', () => {
    expect(feedbackDialogTitle('ask')).toBe(FEEDBACK_ASK_TITLE);
    expect(feedbackDialogTitle('manual')).toBe(FEEDBACK_MANUAL_TITLE);
    expect(FEEDBACK_ASK_LEAD).toBe('Skip is fine.');
    expect(feedbackMessagePlaceholderFor('ask', 'bug')).toBe(FEEDBACK_ASK_PLACEHOLDER);
    expect(feedbackMessagePlaceholderFor('manual', 'bug')).toContain('expect');
    expect(resolveFeedbackSubmitFields('ask', 'bug', ['ui'])).toEqual({
      kind: ASK_FEEDBACK_KIND,
      topics: ASK_FEEDBACK_TOPICS,
    });
    expect(resolveFeedbackSubmitFields('manual', 'bug', ['card'])).toEqual({
      kind: 'bug',
      topics: ['card'],
    });
    expect(
      canSendFeedbackForm({
        mode: 'ask',
        kind: 'bug',
        message: 'shop was confusing',
        topics: [],
        busy: false,
      }),
    ).toBe(true);
    expect(ASK_FEEDBACK_KIND).toBe('confusion');
    expect(ASK_FEEDBACK_TOPICS).toEqual([]);
  });
});
