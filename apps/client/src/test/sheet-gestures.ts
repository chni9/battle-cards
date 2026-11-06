/**
 * Sheet gestures for V7 overlay tests (technical spec v7 §6.7, §7.7; plan header: never rely on the
 * default happy-dom window size). Shipped code never imports this file. L76-05 adds `stubPhoneViewport` and
 * `swipeSheetDown`; L76-06 adds `swipeCarouselTo`.
 */
import { fireEvent } from '@testing-library/react';
import { vi } from 'vitest';

class PhoneVisualViewport extends EventTarget {
  readonly offsetTop = 0;
  readonly offsetLeft = 0;
  readonly width = 390;
  readonly height = 844;
}

/** A 390×844 phone `visualViewport`: a `Dialog` is a bottom sheet with a swipe handle. Undo with `vi.unstubAllGlobals()`. */
export function stubPhoneViewport(): void {
  vi.stubGlobal('visualViewport', new PhoneVisualViewport());
}

/** Drags the sheet's handle 120 px down (the Sheet closes from 80 px). Throws when the sheet has no handle. */
export function swipeSheetDown(dialog: HTMLElement): void {
  const handle = dialog.querySelector<HTMLElement>('[data-zone="sheet-handle"]');
  if (handle === null) throw new Error('no swipe handle: call stubPhoneViewport() first');
  fireEvent.pointerDown(handle, { pointerId: 1, clientY: 100 });
  fireEvent.pointerUp(handle, { pointerId: 1, clientY: 220 });
}

/** Scrolls the dialog's Carousel track to `index` as a swipe would: a 300 px track, then `scroll`. */
export function swipeCarouselTo(dialog: HTMLElement, index: number): void {
  const track = dialog.querySelector<HTMLElement>('[data-carousel-track]');
  if (track === null) throw new Error('no carousel track');
  Object.defineProperty(track, 'clientWidth', { configurable: true, value: 300 });
  // writable: a later chevron press may scroll the track itself.
  Object.defineProperty(track, 'scrollLeft', { configurable: true, writable: true, value: index * 300 });
  fireEvent.scroll(track);
}
