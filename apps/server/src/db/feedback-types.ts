/**
 * Server-only feedback row for Postgres (technical spec v6 §7.2 / L47-01).
 * No seed field — GameState.seed must never reach this table.
 */

import type { FeedbackKind, FeedbackScreen, PlayKind } from '@card-battle/shared';

export interface FeedbackReportInsert {
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
}
