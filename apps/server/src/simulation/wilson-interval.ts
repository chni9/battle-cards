/**
 * Wilson score interval for a binomial proportion — technical spec v5 §7.2 (L32-06).
 */

export interface WilsonInterval {
  lower: number;
  upper: number;
  center: number;
}

/** Wilson score interval for win rate `wins / n` at confidence `z` (default 95%). */
export function wilsonInterval(
  wins: number,
  n: number,
  z = 1.96,
): WilsonInterval {
  if (n <= 0) {
    return { lower: 0, upper: 1, center: 0.5 };
  }

  const p = wins / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denom;
  const margin =
    (z * Math.sqrt((p * (1 - p) + z2 / (4 * n)) / n)) / denom;

  return {
    lower: Math.max(0, center - margin),
    upper: Math.min(1, center + margin),
    center,
  };
}
