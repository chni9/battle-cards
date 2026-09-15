/**
 * Disconnection / inactivity thresholds — technical spec §5.5, §5.7.
 * Reconnect grace default 30s (L57-13; overrides technical spec v1 §5.7 60s).
 */

/** Default and invalid-env fallback — designer 2026-09-15 / L57-13. */
export function parseReconnectGraceMs(raw: string | undefined): number {
  if (raw === undefined) {
    return 30_000;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 1_000 ? parsed : 30_000;
}

export const RECONNECT_GRACE_MS = parseReconnectGraceMs(process.env['RECONNECT_GRACE_MS']);

/** Absent auto-draws before elimination without reward — technical spec §5.7. */
export const ABSENT_AUTO_TURN_LIMIT = 3;

/** Connected turn timeouts before elimination without reward — technical spec §5.7. */
export const CONNECTED_TIMEOUT_LIMIT = 5;
