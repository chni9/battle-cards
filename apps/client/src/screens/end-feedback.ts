/**
 * Finished-board dialog exclusivity (technical spec v6 §7.1 / L47-03 / L57-03).
 * Stats, ask-once Feedback, and turn-strip `!` must never stack.
 * Finished hub leave hits ask-once unless already marked.
 */

export type EndFeedbackMode = 'ask' | 'manual';

export type FinishedHubLeaveAction = 'leaveNow' | 'askThenLeave';

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

/**
 * Stats-panel Feedback replaces Game over with the form (spec §7.1).
 * Turn-strip `!` still no-ops while stats are showing.
 */
export function canOpenEndStatsFeedback(input: { feedbackOpen: boolean }): boolean {
  return !input.feedbackOpen;
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

/** Return home / Play a real game / flag: leave only after ask-once. */
export function finishedHubLeaveAction(alreadyAsked: boolean): FinishedHubLeaveAction {
  return alreadyAsked ? 'leaveNow' : 'askThenLeave';
}

/**
 * View board ask does not set leavePending, so Skip/Send stay on the frozen
 * board. Hub leave sets it so Skip/Send then disconnect.
 */
export function shouldLeaveAfterAskDismiss(input: {
  leavePending: boolean;
  reason: 'skip' | 'cancel' | 'sent';
}): boolean {
  return input.leavePending && (input.reason === 'skip' || input.reason === 'sent');
}
