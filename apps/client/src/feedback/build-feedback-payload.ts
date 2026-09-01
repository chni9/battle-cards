/**
 * Client feedback POST body (technical spec v6 §7.1 / L47-03).
 * Never includes seed. Home may omit gameCode and logTail.
 */

import {
  FEEDBACK_LOG_TAIL_MAX,
  PROTOCOL_VERSION,
  type ActionLogEntryView,
  type FeedbackKind,
  type FeedbackScreen,
  type FeedbackSubmitBody,
  type PlayKind,
} from '@card-battle/shared';

export interface FeedbackPayloadContext {
  screen: FeedbackScreen;
  nickname?: string;
  gameCode?: string;
  playKind?: PlayKind;
  actionLog?: readonly ActionLogEntryView[];
}

export function buildFeedbackPayload(
  kind: FeedbackKind,
  message: string,
  context: FeedbackPayloadContext,
  contact?: string,
): FeedbackSubmitBody {
  const extras: {
    contact?: string;
    nickname?: string;
    gameCode?: string;
    playKind?: PlayKind;
    logTail?: readonly unknown[];
  } = {};

  const trimmedContact = contact?.trim() ?? '';
  if (trimmedContact.length > 0) {
    extras.contact = trimmedContact;
  }
  const nickname = context.nickname?.trim() ?? '';
  if (nickname.length > 0) {
    extras.nickname = nickname;
  }
  const gameCode = context.gameCode?.trim() ?? '';
  if (gameCode.length > 0) {
    extras.gameCode = gameCode;
  }
  if (context.playKind !== undefined) {
    extras.playKind = context.playKind;
  }
  const logTail = (context.actionLog ?? []).slice(-FEEDBACK_LOG_TAIL_MAX);
  if (logTail.length > 0) {
    extras.logTail = logTail;
  }

  return {
    kind,
    message: message.trim(),
    screen: context.screen,
    protocolVersion: PROTOCOL_VERSION,
    ...extras,
  };
}
