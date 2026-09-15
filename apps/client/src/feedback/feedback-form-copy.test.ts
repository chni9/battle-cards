import { describe, expect, it } from 'vitest';

import {
  FEEDBACK_ABOUT_LEGEND,
  FEEDBACK_ASK_LEAD,
  FEEDBACK_TITLE,
  canSendFeedbackForm,
  feedbackAboutHint,
  feedbackDialogTitle,
  feedbackMessagePlaceholder,
  feedbackSendHint,
  resolveFeedbackSubmitFields,
} from './feedback-form-copy';

describe('feedback form copy (technical spec v6 §7.1 / L47-06 / L57-05)', () => {
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

  it('posts the same ticket from ask-mode as from manual, including Return home', () => {
    expect(feedbackDialogTitle('ask')).toBe(FEEDBACK_TITLE);
    expect(feedbackDialogTitle('manual')).toBe(FEEDBACK_TITLE);
    expect(FEEDBACK_ASK_LEAD).toBe('Skip is fine.');
    expect(resolveFeedbackSubmitFields('ask', 'bug', ['ui'])).toEqual({
      kind: 'bug',
      topics: ['ui'],
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
    ).toBe(false);
    expect(
      canSendFeedbackForm({
        mode: 'ask',
        kind: 'bug',
        message: 'shop was confusing',
        topics: ['shop'],
        busy: false,
      }),
    ).toBe(true);
  });
});
