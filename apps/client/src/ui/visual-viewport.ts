/**
 * Visible viewport box for overlays (L53-07).
 * `100dvh` / `fixed inset-0` can be the desktop window in Chrome DevTools
 * device mode while the emulated frame is 390px tall — dialogs then paint
 * above the phone frame. `visualViewport` is the rectangle the player sees.
 */

export interface VisualViewportBox {
  offsetTop: number;
  offsetLeft: number;
  width: number;
  height: number;
}

export function readVisualViewportBox(): VisualViewportBox {
  const vv = window.visualViewport;
  if (vv === null) {
    return {
      offsetTop: 0,
      offsetLeft: 0,
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }
  return {
    offsetTop: vv.offsetTop,
    offsetLeft: vv.offsetLeft,
    width: vv.width,
    height: vv.height,
  };
}
