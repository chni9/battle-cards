/**
 * An entrance shield: `false` for `ms` after `open` turns true, then `true` until it closes.
 * It re-arms on every false → true edge. A dialog opened by a tap uses it so the second tap of a
 * double tap cannot land on the controls that tap just put under the finger (designer 2026-11-03;
 * `docs/agent/decisions.md`). The flag is state set by a timer, so no ref is written in render.
 */

import { useEffect, useState } from 'react';

export function useEntranceGate(open: boolean, ms: number): boolean {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    const id = window.setTimeout(() => {
      setArmed(true);
    }, ms);
    return () => {
      window.clearTimeout(id);
      setArmed(false);
    };
  }, [open, ms]);

  return armed;
}
