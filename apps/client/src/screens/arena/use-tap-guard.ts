/**
 * The post-targeting tap guard (L74-10; frontend.md "L74 carry-overs"; decisions.md 2026-10-28
 * "V7 targeting and pre-send choices").
 *
 * Closing a collapsed sheet unmounts its bar at once with no shield, so the second tap of a fast
 * double tap on a target, Cancel or the bar would land on the arena underneath (a seat, from L74-13
 * the dock). `raise()` opens a `TAP_GUARD_MS` window in which the arena ignores those taps. The
 * shape copies the Sheet transition shield (`ui/primitives/sheet.tsx`): a second raise inside the
 * window restarts the full timer. It stays active under reduced motion: it guards double taps, not
 * an animation.
 */

import { useEffect, useState } from 'react';

import { DUR_BASE_MS } from '../../ui/motion/motion-tokens';

/** The guard window: one `--dur-base`, the Sheet shield's length. */
export const TAP_GUARD_MS = DUR_BASE_MS;

export interface TapGuard {
  /** True while seat taps (and, from L74-13, dock commits) are ignored. */
  readonly guarded: boolean;
  /** Starts, or restarts, the `TAP_GUARD_MS` window. */
  readonly raise: () => void;
}

export function useTapGuard(): TapGuard {
  const [guarded, setGuarded] = useState(false);
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!guarded) return;
    const timer = window.setTimeout(() => {
      setGuarded(false);
    }, TAP_GUARD_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [guarded, count]);
  return {
    guarded,
    raise: () => {
      setGuarded(true);
      setCount((current) => current + 1);
    },
  };
}
