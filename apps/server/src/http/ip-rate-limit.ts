/**
 * In-memory POST rate limit (technical spec v6 §7.1): 10 / 10 minutes / IP.
 */

export const FEEDBACK_RATE_LIMIT_MAX = 10;
export const FEEDBACK_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

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
