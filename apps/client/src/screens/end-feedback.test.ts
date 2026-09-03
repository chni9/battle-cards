import { describe, expect, it } from 'vitest';

import {
  canOpenEndManualFeedback,
  canOpenEndStatsFeedback,
  canReopenEndStats,
  isEndStatsOpen,
  shouldAskFeedbackAfterStatsClose,
  shouldMarkEndFeedbackAsked,
} from './end-feedback';

describe('end feedback exclusivity (technical spec v6 §7.1 / L47-03)', () => {
  it('keeps Game over stats closed while the banner-period Feedback form is open', () => {
    expect(
      isEndStatsOpen({
        bannerElapsed: true,
        statsDismissed: false,
        feedbackOpen: true,
      }),
    ).toBe(false);
    expect(
      isEndStatsOpen({
        bannerElapsed: true,
        statsDismissed: false,
        feedbackOpen: false,
      }),
    ).toBe(true);
    expect(
      isEndStatsOpen({
        bannerElapsed: false,
        statsDismissed: false,
        feedbackOpen: false,
      }),
    ).toBe(false);
    expect(
      isEndStatsOpen({
        bannerElapsed: true,
        statsDismissed: true,
        feedbackOpen: false,
      }),
    ).toBe(false);
  });

  it('refuses a second Feedback over stats or an open form', () => {
    expect(canOpenEndManualFeedback({ statsOpen: true, feedbackOpen: false })).toBe(
      false,
    );
    expect(canOpenEndManualFeedback({ statsOpen: false, feedbackOpen: true })).toBe(
      false,
    );
    expect(canOpenEndManualFeedback({ statsOpen: false, feedbackOpen: false })).toBe(
      true,
    );
  });

  it('lets the Game over Feedback button replace stats without stacking', () => {
    expect(canOpenEndStatsFeedback({ feedbackOpen: false })).toBe(true);
    expect(canOpenEndStatsFeedback({ feedbackOpen: true })).toBe(false);
    expect(
      isEndStatsOpen({
        bannerElapsed: true,
        statsDismissed: true,
        feedbackOpen: true,
      }),
    ).toBe(false);
  });

  it('does not reopen stats over Feedback', () => {
    expect(canReopenEndStats({ feedbackOpen: true })).toBe(false);
    expect(canReopenEndStats({ feedbackOpen: false })).toBe(true);
  });

  it('does not auto-ask after a send or Skip, or while a form is already open', () => {
    expect(
      shouldAskFeedbackAfterStatsClose({ alreadyAsked: false, feedbackOpen: false }),
    ).toBe(true);
    expect(
      shouldAskFeedbackAfterStatsClose({ alreadyAsked: true, feedbackOpen: false }),
    ).toBe(false);
    expect(
      shouldAskFeedbackAfterStatsClose({ alreadyAsked: false, feedbackOpen: true }),
    ).toBe(false);
  });

  it('marks asked on Skip and successful send, not Cancel', () => {
    expect(shouldMarkEndFeedbackAsked('skip')).toBe(true);
    expect(shouldMarkEndFeedbackAsked('sent')).toBe(true);
    expect(shouldMarkEndFeedbackAsked('cancel')).toBe(false);
  });
});
