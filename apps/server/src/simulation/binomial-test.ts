/**
 * One-sided binomial test vs p0 = 0.5 — L33-05 arena gate.
 * Normal approximation with continuity correction (stable for arena N).
 */

/** Abramowitz & Stegun 7.1.26 erf. */
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 -
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) *
      t *
      Math.exp(-ax * ax));
  return sign * y;
}

/** Standard normal survival Φ̄(z). */
function normalSurvival(z: number): number {
  return 0.5 * (1 - erf(z / Math.SQRT2));
}

/**
 * One-sided tail P(X ≥ successes | Binomial(trials, p0)).
 * Exact recursive sum for small n; normal approx otherwise.
 */
export function binomialTailPValueGe(
  successes: number,
  trials: number,
  p0 = 0.5,
): number {
  if (trials <= 0) {
    return 1;
  }

  if (successes <= 0) {
    return 1;
  }

  if (successes > trials) {
    return 0;
  }

  if (trials <= 200) {
    let term = Math.pow(1 - p0, trials);
    let sum = 0;
    for (let k = 0; k <= trials; k += 1) {
      if (k >= successes) {
        sum += term;
      }
      if (k === trials) {
        break;
      }
      term = (term * (trials - k) * p0) / ((k + 1) * (1 - p0));
    }
    return Math.min(1, Math.max(0, sum));
  }

  const mean = trials * p0;
  const sd = Math.sqrt(trials * p0 * (1 - p0));
  const z = (successes - 0.5 - mean) / sd;
  return Math.min(1, Math.max(0, normalSurvival(z)));
}
