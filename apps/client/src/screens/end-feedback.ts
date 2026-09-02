/**
 * Finished-board dialog exclusivity (technical spec v6 §7.1 / L47-03).
 * Stats, ask-once Feedback, and turn-strip `!` must never stack.
 */

export type EndFeedbackMode = 'ask' | 'manual';

/**
 * Game over stats are derived: after the banner, until dismissed, and never
 * while Feedback is already open (banner-period `!`).
 */
export function isEndStatsOpen(input: {
  bannerElapsed: boolean;
  statsDismissed: boolean;
  feedbackOpen: boolean;
}): boolean {
  return input.bannerElapsed && !input.statsDismissed && !input.feedbackOpen;
}

/** Frozen-board `!` must not open a second form over stats or an existing Feedback. */
export function canOpenEndManualFeedback(input: {
  statsOpen: boolean;
  feedbackOpen: boolean;
}): boolean {
  return !input.statsOpen && !input.feedbackOpen;
}

/** Reopen stats from the dock only when Feedback is not showing. */
export function canReopenEndStats(input: { feedbackOpen: boolean }): boolean {
  return !input.feedbackOpen;
}

/**
 * First stats close asks once. Skip if already asked, or if a form is already open
 * (the early-`!` path).
 */
export function shouldAskFeedbackAfterStatsClose(input: {
  alreadyAsked: boolean;
  feedbackOpen: boolean;
}): boolean {
  return !input.alreadyAsked && !input.feedbackOpen;
}

export function shouldMarkEndFeedbackAsked(
  reason: 'skip' | 'cancel' | 'sent',
): boolean {
  return reason === 'skip' || reason === 'sent';
}
