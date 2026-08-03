/**
 * Table FX context hooks — split for react-refresh (Lot 14).
 */

import { createContext, useContext } from 'react';

import type { TableFxEvent } from './table-fx-types';

export interface TableFxContextValue {
  /** Enqueue a presentational FX. Returns void — never await. */
  enqueue: (
    event: Omit<TableFxEvent, 'id' | 'expiresAt'> & { expiresAt?: number },
  ) => void;
  events: readonly TableFxEvent[];
  /** Sticky Mirror highlight ids while the prompt is open (L14-04). */
  mirrorHighlightIds: readonly string[];
  setMirrorHighlightIds: (ids: readonly string[]) => void;
}

export const TableFxContext = createContext<TableFxContextValue | null>(null);

export function useTableFx(): TableFxContextValue {
  const ctx = useContext(TableFxContext);
  if (ctx === null) {
    throw new Error('useTableFx must be used within TableFxProvider');
  }
  return ctx;
}

export function useTableFxOptional(): TableFxContextValue | null {
  return useContext(TableFxContext);
}
