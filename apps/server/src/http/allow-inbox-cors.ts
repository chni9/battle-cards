/**
 * Colyseus answers every OPTIONS request before Express (core router).
 * Default Allow-Headers omits `X-Inbox-Password`, so the inbox GET preflight
 * fails in Vite dev (technical spec v6 §7.3 / L47-05).
 */

import { matchMaker } from 'colyseus';

const INBOX_PASSWORD_HEADER = 'X-Inbox-Password';

export function allowInboxPasswordCorsHeader(): void {
  const current = matchMaker.controller.DEFAULT_CORS_HEADERS['Access-Control-Allow-Headers'];
  if (current.includes(INBOX_PASSWORD_HEADER)) {
    return;
  }
  matchMaker.controller.DEFAULT_CORS_HEADERS['Access-Control-Allow-Headers'] =
    `${current}, ${INBOX_PASSWORD_HEADER}`;
}
