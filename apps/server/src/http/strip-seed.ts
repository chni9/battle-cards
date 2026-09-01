/**
 * Drop `seed` anywhere in a JSON value (technical spec v6 §7.1 / L47-02).
 * GameState.seed must never be stored on a feedback row.
 */

export function stripSeed(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripSeed);
  }

  if (value === null || typeof value !== 'object') {
    return value;
  }

  const result: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    if (key === 'seed') {
      continue;
    }
    result[key] = stripSeed(nested);
  }
  return result;
}
