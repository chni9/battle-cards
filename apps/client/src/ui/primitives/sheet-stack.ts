/**
 * The sheet-stack contract (technical spec v7 §6.7) as pure state: no React, no clock. One
 * store (`sheet-stack-context.ts`) holds it and every `Sheet` registers in it while open, so
 * paint order, Esc, inertness and z-index come from one place instead of DOM order.
 *
 * - Paint order, bottom to top: expanded read-only sheets, caller-collapsed read-only bars
 *   (L74 targeting), expanded blocking sheets, then the Minimize bars of blocking sheets. A
 *   blocking sub-choice always sits above every other sheet, whatever opened first (§6.7:
 *   "any other open sheet is pushed underneath"), and only its own Minimize bar stays above
 *   every sheet (Q59).
 * - "Read-only sheets stack one level": only the newest `MAX_READ_ONLY_DEPTH` expanded
 *   read-only sheets paint. An older one stays registered, hidden, and paints again once a
 *   newer one closes.
 * - One live sheet (WAI-ARIA modal dialog): every painted expanded sheet under another
 *   expanded sheet is inert, and so is a collapsed read-only bar under an expanded blocking
 *   sheet. `liveSheetId` names the top expanded sheet, the only one that holds focus.
 * - Esc closes only the top sheet (Q49): `escTargetId` is the top expanded sheet when it is a
 *   read-only sheet that is not dismiss-locked. A locked top sheet absorbs Esc instead of
 *   passing it down, so an Esc meant for one sheet never reaches the one below it. While the
 *   newest read-only sheet is collapsed (targeting), no sheet takes Esc: it cancels targeting,
 *   which the caller handles (§6.6.5).
 * - Restoring a minimized sheet re-stamps its `openOrder`, so it rises to the top of its group
 *   (otherwise the earlier of two Lot 71 reward pickers would restore under the other).
 *
 * Every update that changes nothing returns `state` itself, so the store can skip notifying.
 */

import { Z_INDEX } from '../layers';

export type SheetMode = 'blocking' | 'read-only';

export interface SheetStackEntry {
  readonly id: string;
  readonly mode: SheetMode;
  readonly minimized: boolean;
  readonly dismissLocked: boolean;
  readonly openOrder: number;
}

export interface SheetStackState {
  readonly entries: readonly SheetStackEntry[];
  readonly nextOrder: number;
}

export const EMPTY_SHEET_STACK: SheetStackState = { entries: [], nextOrder: 0 };

/** Read-only sheets "stack one level" (§6.7): at most two paint at once. */
export const MAX_READ_ONLY_DEPTH = 2;

export function openSheet(
  state: SheetStackState,
  input: { id: string; mode: SheetMode; dismissLocked?: boolean },
): SheetStackState {
  if (state.entries.some((entry) => entry.id === input.id)) return state;
  const entry: SheetStackEntry = {
    id: input.id,
    mode: input.mode,
    minimized: false,
    dismissLocked: input.dismissLocked ?? false,
    openOrder: state.nextOrder,
  };
  return { entries: [...state.entries, entry], nextOrder: state.nextOrder + 1 };
}

export function closeSheet(state: SheetStackState, id: string): SheetStackState {
  if (!state.entries.some((entry) => entry.id === id)) return state;
  return { entries: state.entries.filter((entry) => entry.id !== id), nextOrder: state.nextOrder };
}

export function setSheetMinimized(state: SheetStackState, id: string, minimized: boolean): SheetStackState {
  const current = state.entries.find((entry) => entry.id === id);
  if (current === undefined || current.minimized === minimized) return state;
  // A restored sheet rises to the top of its group; a minimized one keeps its place.
  const restamp = !minimized;
  return {
    entries: state.entries.map((entry) =>
      entry.id === id
        ? { ...entry, minimized, ...(restamp ? { openOrder: state.nextOrder } : {}) }
        : entry,
    ),
    nextOrder: restamp ? state.nextOrder + 1 : state.nextOrder,
  };
}

export function setSheetDismissLocked(state: SheetStackState, id: string, locked: boolean): SheetStackState {
  const current = state.entries.find((entry) => entry.id === id);
  if (current === undefined || current.dismissLocked === locked) return state;
  return {
    entries: state.entries.map((entry) => (entry.id === id ? { ...entry, dismissLocked: locked } : entry)),
    nextOrder: state.nextOrder,
  };
}

function byOpenOrder(state: SheetStackState): SheetStackEntry[] {
  return [...state.entries].sort((a, b) => a.openOrder - b.openOrder);
}

/** A blocking sheet's Minimize bar, the only thing painted above an expanded blocking sheet. */
function isMinimizeBar(entry: SheetStackEntry): boolean {
  return entry.mode === 'blocking' && entry.minimized;
}

/** Everything on the `sheet` layer, bottom to top: every painted entry but the Minimize bars. */
function sheetLayer(state: SheetStackState): readonly SheetStackEntry[] {
  const byOrder = byOpenOrder(state);
  const readOnly = byOrder
    .filter((entry) => entry.mode === 'read-only' && !entry.minimized)
    .slice(-MAX_READ_ONLY_DEPTH);
  const collapsed = byOrder.filter((entry) => entry.mode === 'read-only' && entry.minimized);
  const blocking = byOrder.filter((entry) => entry.mode === 'blocking' && !entry.minimized);
  return [...readOnly, ...collapsed, ...blocking];
}

/** The painted sheets, bottom to top. A read-only sheet beyond the depth is not painted. */
export function sheetPaintOrder(state: SheetStackState): readonly SheetStackEntry[] {
  return [...sheetLayer(state), ...byOpenOrder(state).filter(isMinimizeBar)];
}

function expandedPainted(state: SheetStackState): readonly SheetStackEntry[] {
  return sheetPaintOrder(state).filter((entry) => !entry.minimized);
}

/** The one sheet that holds focus: the top expanded painted sheet, or `null` (bars never). */
export function liveSheetId(state: SheetStackState): string | null {
  return expandedPainted(state).at(-1)?.id ?? null;
}

/** The one sheet Esc may close (Q49), or `null` when the top sheet ignores or absorbs it. */
export function escTargetId(state: SheetStackState): string | null {
  const newestReadOnly = byOpenOrder(state)
    .filter((entry) => entry.mode === 'read-only')
    .at(-1);
  if (newestReadOnly?.minimized === true) return null;
  const top = expandedPainted(state).at(-1);
  if (top === undefined || top.mode === 'blocking' || top.dismissLocked) return null;
  return top.id;
}

/**
 * Within its layer, an entry of the `sheet` layer gets `sheet + its index there` and a
 * Minimize bar `sheetBar + its index among those bars`, clamped below the next layer. Unknown
 * or unpainted ids get the base `sheet` layer.
 */
export function sheetZIndex(state: SheetStackState, id: string): number {
  const layerIndex = sheetLayer(state).findIndex((entry) => entry.id === id);
  if (layerIndex !== -1) return Math.min(Z_INDEX.sheet + layerIndex, Z_INDEX.sheetBar - 1);
  const barIndex = byOpenOrder(state)
    .filter(isMinimizeBar)
    .findIndex((entry) => entry.id === id);
  if (barIndex !== -1) return Math.min(Z_INDEX.sheetBar + barIndex, Z_INDEX.banner - 1);
  return Z_INDEX.sheet;
}

/**
 * Inert: a painted expanded sheet with another expanded sheet painted above it (WAI-ARIA modal
 * dialog: only the top one is live), or a collapsed read-only bar with an expanded blocking
 * sheet above it (§6.7). Minimize bars and unknown ids never are.
 */
export function isSheetInert(state: SheetStackState, id: string): boolean {
  const painted = sheetPaintOrder(state);
  const index = painted.findIndex((entry) => entry.id === id);
  const entry = painted[index];
  if (entry === undefined || isMinimizeBar(entry)) return false;
  const above = painted.slice(index + 1).filter((candidate) => !candidate.minimized);
  return entry.minimized ? above.some((candidate) => candidate.mode === 'blocking') : above.length > 0;
}
