/**
 * The arena's exhaustive-switch guard (Lot 74 Part 2 final review): a `default` that passes the
 * narrowed value here stops compiling once a union gains a case without one.
 */
export function unreachable(value: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(value)}`);
}
