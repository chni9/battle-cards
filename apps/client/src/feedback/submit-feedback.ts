/**
 * POST /api/feedback from the client (technical spec v6 §7.1 / L47-03).
 */

import type { FeedbackSubmitBody } from '@card-battle/shared';

import { resolveServerUrl } from '../net/resolve-server-url';

export const FEEDBACK_FALLBACK_ERROR = 'Could not save — try again';

export type FeedbackFetcher = (
  url: string,
  init: RequestInit,
) => Promise<Pick<Response, 'ok' | 'json'>>;

function pageLocation(): { protocol: string; hostname: string; origin: string } | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }
  return {
    protocol: window.location.protocol,
    hostname: window.location.hostname,
    origin: window.location.origin,
  };
}

export async function submitFeedback(
  body: FeedbackSubmitBody,
  fetchImpl: FeedbackFetcher = fetch,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const url = `${resolveServerUrl(import.meta.env.VITE_SERVER_URL, pageLocation())}/api/feedback`;

  try {
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json: unknown = await response.json().catch(() => null);
    if (response.ok) {
      return { ok: true };
    }
    const rawMessage: unknown =
      typeof json === 'object' && json !== null ? Reflect.get(json, 'message') : undefined;
    if (typeof rawMessage === 'string' && rawMessage.length > 0) {
      return { ok: false, message: rawMessage };
    }
    return { ok: false, message: FEEDBACK_FALLBACK_ERROR };
  } catch {
    return { ok: false, message: FEEDBACK_FALLBACK_ERROR };
  }
}
