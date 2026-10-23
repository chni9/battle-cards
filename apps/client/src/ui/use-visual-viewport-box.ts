/**
 * The visible box and its layout mode as live React state (L53-07, technical spec v7 §6.4).
 * Overlays size to `visualViewport`, never to `100dvh`: in Chrome DevTools device mode and on
 * phones with the keyboard open, the window is larger than what the player sees.
 *
 * Both hooks read through `useSyncExternalStore`, subscribed to `resize` and `scroll` on
 * `visualViewport` (pinch zoom and the keyboard move it) and to `resize` on `window` (the
 * fallback when `visualViewport` is null).
 */

import { useSyncExternalStore } from 'react';
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

export function useVisualViewportBox(): VisualViewportBox {
  return useSyncExternalStore(subscribe, boxSnapshot);
}

export function useViewportMode(): ViewportMode {
  return useSyncExternalStore(subscribe, modeSnapshot);
}
