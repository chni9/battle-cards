/**
 * Where focus may go in the V7 sheet stack (technical spec v7 §6.7; L72-09 fix rounds 1-2).
 * DOM lookups keyed by the `data-sheet-id` that every sheet overlay and bar carries, read
 * against a stack state, so a closing sheet can decide before its DOM catches up. Shared by
 * `sheet.tsx` and `toast.tsx`.
 */

import { isSheetInert, liveSheetId, type SheetStackState } from './sheet-stack';

/** The sheet (overlay or bar) an element belongs to, by its `data-sheet-id`. */
function ownerOf(element: Element): { readonly id: string; readonly bar: boolean } | null {
  const owner = element.closest('[data-sheet-id]');
  const id = owner?.getAttribute('data-sheet-id') ?? null;
  if (owner === null || id === null) return null;
  return { id, bar: owner.getAttribute('data-zone') === 'sheet-bar' };
}

/**
 * Whether focus may sit on `element` in `state`: inside the live sheet, on a bar that is not
 * covered, or on the page while no expanded sheet is painted (an open modal sheet covers it).
 * A closing, hidden or inert sheet is never reachable, even before its DOM catches up.
 */
export function reachableIn(state: SheetStackState, element: HTMLElement): boolean {
  if (!element.isConnected) return false;
  const owner = ownerOf(element);
  if (owner === null) return liveSheetId(state) === null;
  const entry = state.entries.find((candidate) => candidate.id === owner.id);
  if (entry === undefined) return false;
  if (owner.bar) return entry.minimized && !isSheetInert(state, owner.id);
  return liveSheetId(state) === owner.id;
}

/** The panel of the sheet that is live in `state`, unless that sheet is `exceptId`. */
export function livePanel(state: SheetStackState, exceptId?: string): HTMLElement | null {
  const live = liveSheetId(state);
  if (live === null || live === exceptId) return null;
  for (const overlay of document.querySelectorAll<HTMLElement>('[data-zone="sheet-overlay"]')) {
    if (overlay.getAttribute('data-sheet-id') === live) {
      return overlay.querySelector<HTMLElement>('[data-zone="sheet-panel"]');
    }
  }
  return null;
}
