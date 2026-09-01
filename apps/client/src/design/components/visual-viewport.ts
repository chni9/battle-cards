/**
 * Visible viewport box (L53-07).
 * `100dvh` / `fixed inset-0` can be the desktop window in Chrome DevTools
 * device mode while the emulated frame is 390px — or stay at a stale size
 * after the frame is resized, leaving the table as a small box on the html
 * surface. `visualViewport` is the rectangle the player sees.
 */

export interface VisualViewportBox {
  offsetTop: number;
  offsetLeft: number;
  width: number;
  height: number;
}

export const VV_WIDTH_VAR = '--vv-width';
export const VV_HEIGHT_VAR = '--vv-height';
export const VV_TOP_VAR = '--vv-top';
export const VV_LEFT_VAR = '--vv-left';

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

/** Pin `#root` / table / overlays to the visible rectangle. */
export function applyVisualViewportCssVars(
  target: CSSStyleDeclaration = document.documentElement.style,
): void {
  const box = readVisualViewportBox();
  target.setProperty(VV_WIDTH_VAR, `${String(box.width)}px`);
  target.setProperty(VV_HEIGHT_VAR, `${String(box.height)}px`);
  target.setProperty(VV_TOP_VAR, `${String(box.offsetTop)}px`);
  target.setProperty(VV_LEFT_VAR, `${String(box.offsetLeft)}px`);
}

export function subscribeVisualViewport(onChange: () => void): () => void {
  onChange();
  const vv = window.visualViewport;
  vv?.addEventListener('resize', onChange);
  vv?.addEventListener('scroll', onChange);
  window.addEventListener('resize', onChange);
  window.addEventListener('orientationchange', onChange);
  return () => {
    vv?.removeEventListener('resize', onChange);
    vv?.removeEventListener('scroll', onChange);
    window.removeEventListener('resize', onChange);
    window.removeEventListener('orientationchange', onChange);
  };
}
