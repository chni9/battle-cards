/**
 * Disconnection / inactivity thresholds — technical spec §5.5, §5.7.
 */

export const RECONNECT_GRACE_MS = (() => {
  const raw = process.env['RECONNECT_GRACE_MS'];
  if (raw === undefined) {
    return 60_000;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 1_000 ? parsed : 60_000;
})();

/** Absent auto-draws before elimination without reward — technical spec §5.7. */
export const ABSENT_AUTO_TURN_LIMIT = 3;

/** Connected turn timeouts before elimination without reward — technical spec §5.7. */
export const CONNECTED_TIMEOUT_LIMIT = 5;
