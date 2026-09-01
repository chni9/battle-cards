/**
 * Feedback report shape — technical spec v6 §7 / L47-01.
 * HTTP, not a Colyseus message. No seed on the client body or the row.
 */

import type { PlayKind } from '../protocol/state-view';

export const FEEDBACK_KINDS = ['bug', 'confusion', 'idea'] as const;

export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

export const FEEDBACK_SCREENS = ['home', 'lobby', 'table', 'end', 'tutorial'] as const;

export type FeedbackScreen = (typeof FEEDBACK_SCREENS)[number];

/** Public action-log tail stored with a report (technical spec v6 §7.1). */
export const FEEDBACK_LOG_TAIL_MAX = 30;

export function isFeedbackKind(value: unknown): value is FeedbackKind {
  return typeof value === 'string' && (FEEDBACK_KINDS as readonly string[]).includes(value);
}

export function isFeedbackScreen(value: unknown): value is FeedbackScreen {
  return (
    typeof value === 'string' && (FEEDBACK_SCREENS as readonly string[]).includes(value)
  );
}

/**
 * JSON body the client may POST to `/api/feedback`.
 * Server stores `user_agent` from the request; never `GameState.seed`.
 */
export interface FeedbackSubmitBody {
  kind: FeedbackKind;
  message: string;
  screen: FeedbackScreen;
  protocolVersion: number;
  contact?: string;
  nickname?: string;
  gameCode?: string;
  playKind?: PlayKind;
  logTail?: readonly unknown[];
}
