/**
 * The one layout-mode rule (technical spec v7 §6.4), checked in this order on the visible box:
 * landscape-compact when the visible height is under 500 px, desktop when it is wider than
 * tall, portrait otherwise. A 768×1024 tablet is portrait; 1024×600 and 1440×900 are desktop;
 * an 844×390 phone is landscape-compact. Sheet placement, Carousel `gridAtDesktop` and the
 * L73 seat layout all reuse it, so the modes cannot drift apart.
 */

export type ViewportMode = 'portrait' | 'landscape-compact' | 'desktop';

/** Visible heights strictly below this are landscape-compact (§6.4). */
export const LANDSCAPE_COMPACT_MAX_HEIGHT_PX = 500;

export function viewportModeFor(box: { readonly width: number; readonly height: number }): ViewportMode {
  if (box.height < LANDSCAPE_COMPACT_MAX_HEIGHT_PX) return 'landscape-compact';
  if (box.width > box.height) return 'desktop';
  return 'portrait';
}
