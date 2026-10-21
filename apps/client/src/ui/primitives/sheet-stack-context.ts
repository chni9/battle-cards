/**
 * The sheet-stack store and its React context (technical spec v7 §6.7). A `.ts` file, because
 * react-refresh forbids a context in a component file.
 *
 * The context default is one module-level store, so the app needs no provider at its root:
 * every `Sheet` in the page shares it. `SheetStackProvider` exists for isolation, which
 * `renderUi` uses so each test render gets its own stack (L72-09).
 */

import { createContext, useCallback, useContext, useSyncExternalStore, type Context } from 'react';
import {
  EMPTY_SHEET_STACK,
  closeSheet,
  openSheet,
  setSheetDismissLocked,
  setSheetMinimized,
  type SheetMode,
  type SheetStackState,
} from './sheet-stack';

export interface SheetStackStore {
  getSnapshot(): SheetStackState;
  subscribe(listener: () => void): () => void;
  open(input: { id: string; mode: SheetMode; dismissLocked?: boolean }): void;
  close(id: string): void;
  setMinimized(id: string, minimized: boolean): void;
  setDismissLocked(id: string, locked: boolean): void;
}

/** Applies the pure stack functions and notifies only when the state object changes. */
export function createSheetStackStore(): SheetStackStore {
  let state = EMPTY_SHEET_STACK;
  const listeners = new Set<() => void>();
  const apply = (next: SheetStackState): void => {
    if (next === state) return;
    state = next;
    for (const listener of [...listeners]) listener();
  };
  return {
    getSnapshot: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    open: (input) => {
      apply(openSheet(state, input));
    },
    close: (id) => {
      apply(closeSheet(state, id));
    },
    setMinimized: (id, minimized) => {
      apply(setSheetMinimized(state, id, minimized));
    },
    setDismissLocked: (id, locked) => {
      apply(setSheetDismissLocked(state, id, locked));
    },
  };
}

export const SheetStackContext: Context<SheetStackStore> = createContext(createSheetStackStore());

export function useSheetStackStore(): SheetStackStore {
  return useContext(SheetStackContext);
}

export function useSheetStackState(): SheetStackState {
  const store = useSheetStackStore();
  const subscribe = useCallback((listener: () => void) => store.subscribe(listener), [store]);
  const getSnapshot = useCallback(() => store.getSnapshot(), [store]);
  return useSyncExternalStore(subscribe, getSnapshot);
}
