/**
 * One dismissal per open for a shared dialog: plan A.9 ruling 5, the per-open epoch latch of
 * `screens/arena/top-bar.tsx`, re-implemented (never imported from `screens/arena/`). While a sheet
 * exits its handlers stay live, so a double tap or an Esc right after Got it would close it twice;
 * Home's gated How to play would then read the second close as a manual one (spec v7 §7.1). The ref
 * is read only in the returned callback (decisions.md 2026-10-28). L76-05.
 */

import { useRef, useState } from 'react';

export function useOncePerOpen(open: boolean): (action: () => void) => void {
  const [wasOpen, setWasOpen] = useState(open);
  const [epoch, setEpoch] = useState(open ? 1 : 0);
  // Each reopen is a new epoch (adjust state while rendering, as screens/lobby/kick-confirm-dialog.tsx does).
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setEpoch(epoch + 1);
  }
  const doneEpoch = useRef<number | null>(null);
  return (action) => {
    if (doneEpoch.current === epoch) return;
    doneEpoch.current = epoch;
    action();
  };
}
