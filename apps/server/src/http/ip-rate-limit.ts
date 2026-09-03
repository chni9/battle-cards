/**
 * In-memory IP windows (technical spec v6 §7.1 POST; L47-04 inbox lockout).
 */

export const FEEDBACK_RATE_LIMIT_MAX = 10;
export const FEEDBACK_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

/** Failed `GET /api/inbox` password guesses — same window as feedback POST. */
export const INBOX_AUTH_RATE_LIMIT_MAX = 10;
export const INBOX_AUTH_RATE_LIMIT_WINDOW_MS = FEEDBACK_RATE_LIMIT_WINDOW_MS;

export interface IpRateLimiter {
  take: (ip: string) => boolean;
}

export function createIpRateLimiter(
  max: number = FEEDBACK_RATE_LIMIT_MAX,
  windowMs: number = FEEDBACK_RATE_LIMIT_WINDOW_MS,
  nowMs: () => number = Date.now,
): IpRateLimiter {
  const hits = new Map<string, number[]>();

  return {
    take(ip: string): boolean {
      const now = nowMs();
      const windowStart = now - windowMs;
      const previous = hits.get(ip) ?? [];
      const recent = previous.filter((stamp) => stamp > windowStart);
      if (recent.length >= max) {
        hits.set(ip, recent);
        return false;
      }
      recent.push(now);
      hits.set(ip, recent);
      return true;
    },
  };
}
