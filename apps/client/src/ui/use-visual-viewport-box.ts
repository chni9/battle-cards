/**
 * The visible box and its layout mode as live React state (L53-07, technical spec v7 §6.4).
 * Overlays size to `visualViewport`, never to `100dvh`: in Chrome DevTools device mode and on
 * phones with the keyboard open, the window is larger than what the player sees.
 *
 * Both hooks read through `useSyncExternalStore`, subscribed to `resize` and `scroll` on
 * `visualViewport` (pinch zoom and the keyboard move it) and to `resize` on `window` (the
 * fallback when `visualViewport` is null).
 *
 * Ruling 7 (L75-02, U1): the mode holds while a text field has focus, so the arena, the coach and
 * every other mode reader agree and a phone keyboard never flips the layout under a sheet. The box
 * stays live: a sheet or a toast must follow the keyboard. `isTextEntryElement` and
 * `useTextEntryFocused()` are the one definition of "a text field has focus".
 */

import { useState, useSyncExternalStore } from 'react';
import { viewportModeFor, type ViewportMode } from './viewport-mode';
import { readVisualViewportBox, type VisualViewportBox } from './visual-viewport';

function subscribe(onChange: () => void): () => void {
  const viewport = window.visualViewport;
  viewport?.addEventListener('resize', onChange);
  viewport?.addEventListener('scroll', onChange);
  window.addEventListener('resize', onChange);
  return () => {
    viewport?.removeEventListener('resize', onChange);
    viewport?.removeEventListener('scroll', onChange);
    window.removeEventListener('resize', onChange);
  };
}

let cachedBox: VisualViewportBox | null = null;

/** The same object while the four fields are unchanged, as `useSyncExternalStore` requires. */
function boxSnapshot(): VisualViewportBox {
  const next = readVisualViewportBox();
  if (
    cachedBox !== null &&
    cachedBox.width === next.width &&
    cachedBox.height === next.height &&
    cachedBox.offsetTop === next.offsetTop &&
    cachedBox.offsetLeft === next.offsetLeft
  ) {
    return cachedBox;
  }
  cachedBox = next;
  return next;
}

function modeSnapshot(): ViewportMode {
  return viewportModeFor(readVisualViewportBox());
}

/** Input types that raise no on-screen keyboard. */
const NON_TEXT_INPUT_TYPES: ReadonlySet<string> = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'hidden',
  'image',
  'radio',
  'range',
  'reset',
  'submit',
]);

/** A `<textarea>`, a text-entry `<input>` (not button, checkbox, color, file, hidden, image, radio, range, reset or submit), or a contenteditable element. */
export function isTextEntryElement(element: Element | null): boolean {
  if (element instanceof HTMLTextAreaElement) return true;
  if (element instanceof HTMLInputElement) return !NON_TEXT_INPUT_TYPES.has(element.type);
  return element instanceof HTMLElement && element.isContentEditable;
}

function subscribeFocus(onChange: () => void): () => void {
  // Chrome reports <body> as `document.activeElement` while a focus move is in flight: A's focusout
  // runs before B's focusin. A move to another text field keeps the keyboard up, so reading the
  // snapshot then would end the hold for one commit and the mode would flip under the field
  // (Lot 75 Check 1); B's focusin reads the snapshot instead.
  const onFocusOut = (event: FocusEvent): void => {
    const next = event.relatedTarget;
    if (next instanceof Element && isTextEntryElement(next)) {
      return;
    }
    onChange();
  };
  document.addEventListener('focusin', onChange);
  document.addEventListener('focusout', onFocusOut);
  return () => {
    document.removeEventListener('focusin', onChange);
    document.removeEventListener('focusout', onFocusOut);
  };
}

function textEntryFocusedSnapshot(): boolean {
  return isTextEntryElement(document.activeElement);
}

function textEntryFocusedServerSnapshot(): boolean {
  return false;
}

/**
 * True while `document.activeElement` is a text-entry element (`focusin` / `focusout`). A focused
 * field that unmounts fires no `focusout`; the next render, such as the viewport `resize` that
 * closes the keyboard, reads `document.activeElement` again, so the hold ends with the keyboard.
 * A `focusout` whose `relatedTarget` is another text field is skipped: the keyboard stays up and
 * the next `focusin` reads the new field.
 */
export function useTextEntryFocused(): boolean {
  return useSyncExternalStore(subscribeFocus, textEntryFocusedSnapshot, textEntryFocusedServerSnapshot);
}

export function useVisualViewportBox(): VisualViewportBox {
  return useSyncExternalStore(subscribe, boxSnapshot);
}

/**
 * The layout mode of the visible box. Ruling 7 (L75-02, U1): the mode holds while a text field has
 * focus, so the arena, the coach and every other mode reader agree and a phone keyboard never flips
 * the layout under a sheet. The box stays live: a sheet or a toast must follow the keyboard.
 */
export function useViewportMode(): ViewportMode {
  const live = useSyncExternalStore(subscribe, modeSnapshot);
  const editing = useTextEntryFocused();
  // Render-phase held state, as ui/primitives/sheet.tsx adjusts state while rendering; never an effect.
  const [held, setHeld] = useState<ViewportMode>(live);
  if (!editing && held !== live) setHeld(live);
  return editing ? held : live;
}
