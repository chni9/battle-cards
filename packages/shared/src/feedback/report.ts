/**
 * Feedback report shape — technical spec v6 §7 / L47-01 / L47-06.
 * HTTP, not a Colyseus message. No seed on the client body or the row.
 */

import type { PlayKind } from '../protocol/state-view';

export const FEEDBACK_KINDS = ['bug', 'confusion', 'idea'] as const;

export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];

export const FEEDBACK_SCREENS = ['home', 'lobby', 'table', 'end', 'tutorial'] as const;

export type FeedbackScreen = (typeof FEEDBACK_SCREENS)[number];

/**
 * Multi-select areas so inbox rows are scannable (L47-06).
 * Bug requires at least one. Confusion / idea may send none.
 */
export const FEEDBACK_TOPICS = [
  'ui',
  'gameplay',
  'card',
  'shop',
  'bot',
  'tutorial',
  'other',
] as const;

export type FeedbackTopic = (typeof FEEDBACK_TOPICS)[number];

export const FEEDBACK_TOPIC_LABEL: Record<FeedbackTopic, string> = {
  ui: 'UI',
  gameplay: 'Gameplay',
  card: 'Card',
  shop: 'Shop',
  bot: 'Bot',
  tutorial: 'Tutorial',
  other: 'Other',
};

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

export function isFeedbackTopic(value: unknown): value is FeedbackTopic {
  return typeof value === 'string' && (FEEDBACK_TOPICS as readonly string[]).includes(value);
}

/**
 * Dedupe and keep catalog order. Unknown ids → null (reject the POST / row).
 * Missing / empty array → `[]`.
 */
export function normalizeFeedbackTopics(value: unknown): FeedbackTopic[] | null {
  if (value === undefined || value === null) {
    return [];
  }
  if (!Array.isArray(value)) {
    return null;
  }
  const seen = new Set<FeedbackTopic>();
  for (const item of value) {
    if (!isFeedbackTopic(item)) {
      return null;
    }
    seen.add(item);
  }
  return FEEDBACK_TOPICS.filter((id) => seen.has(id));
}

export function isFeedbackTopicsComplete(
  kind: FeedbackKind,
  topics: readonly FeedbackTopic[],
): boolean {
  return kind !== 'bug' || topics.length > 0;
}

export function toggleFeedbackTopic(
  selected: readonly FeedbackTopic[],
  topic: FeedbackTopic,
): FeedbackTopic[] {
  const next = new Set(selected);
  if (next.has(topic)) {
    next.delete(topic);
  } else {
    next.add(topic);
  }
  return FEEDBACK_TOPICS.filter((id) => next.has(id));
}

export function formatFeedbackTopics(topics: readonly FeedbackTopic[]): string {
  return topics.map((id) => FEEDBACK_TOPIC_LABEL[id]).join(', ');
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
  topics?: readonly FeedbackTopic[];
}

/**
 * One inbox row from `GET /api/inbox` (technical spec v6 §7.3).
 * Newest first. `logTail` is already seed-stripped.
 */
export interface FeedbackInboxRow {
  id: string;
  createdAt: string;
  kind: FeedbackKind;
  message: string;
  contact: string | null;
  nickname: string | null;
  gameCode: string | null;
  screen: FeedbackScreen;
  protocolVersion: number;
  playKind: PlayKind | null;
  logTail: unknown;
  userAgent: string | null;
  topics: readonly FeedbackTopic[];
}
