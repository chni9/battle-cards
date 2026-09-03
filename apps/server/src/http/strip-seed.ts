/**
 * Drop `seed` anywhere in a JSON value (technical spec v6 §7.1 / L47-02).
 * GameState.seed must never be stored on a feedback row.
 * Depth-capped: attacker-controlled `logTail` must not recurse until the stack blows.
 */

/** Public action-log objects are shallow. 32 is well above a real tail, well below V8's stack. */
export const STRIP_SEED_MAX_DEPTH = 32;

const TOO_DEEP = Symbol('strip-seed-too-deep');

export function tryStripSeed(
  value: unknown,
): { ok: true; value: unknown } | { ok: false } {
  const result = walk(value, 0);
  if (result === TOO_DEEP) {
    return { ok: false };
  }
  return { ok: true, value: result };
}

export function stripSeed(value: unknown): unknown {
  const result = tryStripSeed(value);
  return result.ok ? result.value : null;
}

function walk(value: unknown, depth: number): unknown {
  if (depth > STRIP_SEED_MAX_DEPTH) {
    return TOO_DEEP;
  }

  if (Array.isArray(value)) {
    const next: unknown[] = [];
    for (const item of value) {
      const child = walk(item, depth + 1);
      if (child === TOO_DEEP) {
        return TOO_DEEP;
      }
      next.push(child);
    }
    return next;
  }

  if (value === null || typeof value !== 'object') {
    return value;
  }

  const result: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    if (key === 'seed') {
      continue;
    }
    const child = walk(nested, depth + 1);
    if (child === TOO_DEEP) {
      return TOO_DEEP;
    }
    result[key] = child;
  }
  return result;
}
