/**
 * The POV elimination overlay's edge and timer — technical spec v7 §6.12 (L74-23).
 *
 * The overlay shows for `TABLE_BANNER_MS` when the POV becomes dead (Watching with a kit), and on
 * a first paint already dead, as V2's banner seed did: that covers the finished board and a
 * reload mid-game (designer 2026-11-02). It never shows for a POV win. The edge is React's
 * "adjust state while rendering" pattern, never an effect; only the hide timer is an effect.
 */

import { useEffect, useState } from 'react';

import { TABLE_BANNER_MS } from '../../view-model/table-banner';

interface PovEliminationState {
  readonly dead: boolean;
  readonly showing: boolean;
}

/** True for TABLE_BANNER_MS after the POV becomes dead, or on a first paint already dead; never for a POV win (§6.12). */
export function usePovElimination({ dead, youWon }: { readonly dead: boolean; readonly youWon: boolean }): boolean {
  const [state, setState] = useState<PovEliminationState>(() => ({ dead, showing: dead && !youWon }));
  if (state.dead !== dead) {
    setState({ dead, showing: dead && !youWon });
  }
  useEffect(() => {
    if (!state.showing) return;
    const id = window.setTimeout(() => {
      setState((current) => ({ ...current, showing: false }));
    }, TABLE_BANNER_MS);
    return () => {
      window.clearTimeout(id);
    };
  }, [state.showing]);
  return state.showing && !youWon;
}
